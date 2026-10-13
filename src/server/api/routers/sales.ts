import { z } from "zod";
import { env } from "@/env";
import {
  createTRPCRouter,
  featureProtectedProcedure,
  enforceBranchIsolation,
} from "@/server/api/trpc";
import {
  sales,
  saleItems,
  inventory,
  inventoryTransactions,
  saleAssignments,
  userManagers,
  products,
} from "@/server/db/schema";
import { eq, sql, and, desc, exists, or, ilike } from "drizzle-orm";
import { sendNotificationToUser } from "@/server/lib/push";
import { checkAndNotifyLowStock } from "@/server/lib/alerts";
import { TRPCError } from "@trpc/server";

export const salesRouter = createTRPCRouter({
  getNextInvoiceId: featureProtectedProcedure("sales").query(
    async ({ ctx }) => {
      const lastSale = await ctx.db.query.sales.findFirst({
        where: sql`${sales.transactionNumber} IS NOT NULL`,
        orderBy: [desc(sales.id)],
      });

      if (!lastSale || !lastSale.transactionNumber) {
        return "INV-1000";
      }

      const match = lastSale.transactionNumber.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1]!, 10);
        const prefix = lastSale.transactionNumber.slice(0, match.index);
        return `${prefix}${num + 1}`;
      }

      return `${lastSale.transactionNumber}-1`;
    },
  ),

  checkOrderNumber: featureProtectedProcedure("sales")
    .input(z.object({ orderNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      const existing = await ctx.db.query.sales.findFirst({
        where: eq(sales.orderNumber, input.orderNumber),
        columns: { id: true },
      });
      return { exists: !!existing };
    }),

  getSaleByOrderNumber: featureProtectedProcedure("sales")
    .input(z.object({ orderNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      const sale = await ctx.db.query.sales.findFirst({
        where: eq(sales.orderNumber, input.orderNumber),
        with: {
          items: true,
          assignments: true,
          customer: true,
        },
      });
      return sale;
    }),

  createSale: featureProtectedProcedure("sales")
    .meta({
      openapi: {
        method: "POST",
        path: "/sales/create",
        summary: "Create a new sale",
        tags: ["Sales"],
      },
    })
    .input(
      z.object({
        orderNumber: z.string().min(1, "Order Number is required"),
        transactionNumber: z.string().optional(),
        cmrId: z.string().optional(),
        tmNo: z.string().optional(),
        saleType: z.string().optional(),
        oldAdvanceOrderNumber: z.string().optional(),
        registerType: z.enum(["Sale", "Advance"]).default("Sale"),
        branchId: z.number().optional(),
        pincode: z
          .string()
          .regex(/^[1-9][0-9]{5}$/, "Invalid Pincode")
          .optional(),
        addressLine1: z.string().optional(),
        landmark: z.string().optional(),
        area: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        customerName: z.string().optional(),
        customerAddress: z.string().optional(),
        customerId: z.string().optional(),
        userIds: z.array(z.string()).optional(),
        managerIds: z.array(z.string()).optional(),
        invoiceAmount: z.string().optional(),
        advancePaymentAmount: z.string().optional(),
        receivedAmount: z.string().optional(),
        tradeDiscount: z.string().optional(),
        basicInvoiceValue: z.string().optional(),
        cgst: z.string().optional(),
        sgst: z.string().optional(),
        igst: z.string().optional(),
        items: z.array(
          z.object({
            productId: z.number(),
            quantity: z.number().min(1),
            isFree: z.boolean().default(false),
            ptsPerQty: z.string().optional(),
            totalPts: z.string().optional(),
            offerNumber: z.string().optional(),
          }),
        ),
      }),
    )
    .output(
      z.object({
        id: z.number(),
        orderNumber: z.string(),
        transactionNumber: z.string().nullable(),
        branchId: z.number(),
        userId: z.string(),
        mainQty: z.number(),
        freeQty: z.number(),
        totalQty: z.number(),
        invoiceAmount: z.string(),
        advancePaymentAmount: z.string().nullable().optional(),
        receivedAmount: z.string().nullable().optional(),
        balanceAmount: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.oldAdvanceOrderNumber) {
        const oldAdvance = await ctx.db.query.sales.findFirst({
          where: (sales, { eq, and }) =>
            and(
              eq(sales.orderNumber, input.oldAdvanceOrderNumber!),
              eq(sales.registerType, "Advance")
            ),
        });
        if (!oldAdvance) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid old advance order number.",
          });
        }
      }

      const targetBranchId = enforceBranchIsolation(
        ctx,
        input.branchId ?? undefined,
      );
      if (targetBranchId === undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Branch selection is required for this action.",
        });
      }

      return await ctx.db.transaction(async (tx) => {
        // 1. Stock Check & Decrement
        for (const item of input.items) {
          // Update or Insert inventory with negative
          await tx
            .insert(inventory)
            .values({
              productId: item.productId,
              branchId: targetBranchId,
              quantity: -item.quantity,
            })
            .onConflictDoUpdate({
              target: [inventory.productId, inventory.branchId],
              set: { quantity: sql`${inventory.quantity} - ${item.quantity}` },
            });

          // Trigger Low Stock Alerts
          await checkAndNotifyLowStock(tx, targetBranchId, item.productId);
        }

        // 2. Fetch Pincode Details
        let deliveryAddress = "";
        if (input.pincode) {
          try {
            const res = await fetch(
              `${env.NEXT_PUBLIC_PINCODE_API_URL}/${input.pincode}`,
              { signal: AbortSignal.timeout(3000) },
            );
            const data = (await res.json()) as {
              Status: string;
              PostOffice: { Name: string; District: string; State: string }[];
            }[];
            if (Array.isArray(data) && data[0]?.Status === "Success") {
              const postOffice = data[0].PostOffice?.[0];
              if (postOffice) {
                deliveryAddress = `${postOffice.Name}, ${postOffice.District}, ${postOffice.State}`;
              }
            }
          } catch (e) {
            console.error("Failed to fetch pincode details", e);
          }
        }

        let mainQty = 0;
        let freeQty = 0;
        for (const item of input.items) {
          if (item.isFree) freeQty += item.quantity;
          else mainQty += item.quantity;
        }
        const totalQty = mainQty + freeQty;

        const invoiceAmt = parseFloat(input.invoiceAmount ?? "0");
        const advanceAmt = parseFloat(input.advancePaymentAmount ?? "0");
        const receivedAmt = parseFloat(input.receivedAmount ?? "0");
        const balanceAmt = invoiceAmt - advanceAmt - receivedAmt;

        const orderNumber = input.orderNumber;
        const transactionNumber = input.transactionNumber || null;

        const finalUserIds =
          input.userIds?.length
            ? input.userIds
            : [ctx.dbUser.id];
        const userManagersList = await tx.query.userManagers.findMany({
          where: eq(userManagers.userId, ctx.dbUser.id),
        });
        const finalManagerIds =
          input.managerIds?.length
            ? input.managerIds
            : userManagersList.map((m) => m.managerId);
        const finalStatus =
          ctx.dbUser.role === "Admin" ? "Approved" : "Pending";

        const primaryUserId = finalUserIds[0] ?? ctx.dbUser.id;
        const primaryManagerId = finalManagerIds[0] ?? null;

        // 3. Insert Sale
        let newSale;
        try {
          const [insertedSale] = await tx
            .insert(sales)
            .values({
              branchId: targetBranchId,
              userId: primaryUserId,
              managerId: primaryManagerId,
              status: finalStatus as any,
              orderNumber,
              transactionNumber,
              cmrId: input.cmrId,
              tmNo: input.tmNo,
              saleType: input.saleType,
              oldAdvanceOrderNumber: input.oldAdvanceOrderNumber,
              registerType: input.registerType,
              pincode: input.pincode,
              addressLine1: input.addressLine1,
              landmark: input.landmark,
              area: input.area,
              city: input.city,
              state: input.state,
              deliveryAddress: deliveryAddress || undefined,
              customerName: input.customerName,
              customerAddress: input.customerAddress,
              customerId: input.customerId,
              mainQty,
              freeQty,
              totalQty,
              invoiceAmount: invoiceAmt.toString(),
              advancePaymentAmount: advanceAmt.toString(),
              receivedAmount: receivedAmt.toString(),
              balanceAmount: balanceAmt.toString(),
              tradeDiscount: input.tradeDiscount || "0",
              basicInvoiceValue: input.basicInvoiceValue || "0",
              cgst: input.cgst || "0",
              sgst: input.sgst || "0",
              igst: input.igst || "0",
            })
            .returning();
          newSale = insertedSale;
        } catch (error: any) {
          if (
            error.code === "23505" ||
            error.message?.includes("23505") ||
            error.message?.includes("unique constraint")
          ) {
            const isInvoice = error.message?.includes("transaction_number") || error.message?.includes("transactionNumber") || error.message?.includes("invoice");
            throw new TRPCError({
              code: "CONFLICT",
              message: isInvoice ? "Invoice ID already exists. Please use a unique Invoice ID." : "Order ID already exists. Please use a unique Order ID.",
            });
          }
          throw error;
        }

        if (!newSale)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create sale",
          });

        // Insert into saleAssignments
        const assignments = [];
        for (const uid of finalUserIds) {
          assignments.push({
            saleId: newSale.id,
            userId: uid,
            role: "Employee",
          });
        }
        for (const mid of finalManagerIds) {
          assignments.push({
            saleId: newSale.id,
            userId: mid,
            role: "Manager",
          });
        }
        if (assignments.length > 0) {
          const uniqueAssignments = Array.from(
            new Map(
              assignments.map((a) => [`${a.userId}-${a.role}`, a]),
            ).values(),
          );
          await tx.insert(saleAssignments).values(uniqueAssignments);
        }

        // 4. Insert Sale Items & Transactions
        if (input.items.length > 0) {
          const productIds = input.items.map(i => i.productId);
          const productsList = await tx.query.products.findMany({
            where: (products, { inArray }) => inArray(products.id, productIds),
          });
          const productMap = new Map(productsList.map(p => [p.id, p]));

          await tx.insert(saleItems).values(
            input.items.map((item) => {
              const product = productMap.get(item.productId);
              const rate = parseFloat(product?.price?.toString() || "0");
              const totalAmount = item.isFree ? 0 : rate * item.quantity;
              
              return {
                saleId: newSale.id,
                productId: item.productId,
                quantity: item.quantity,
                rate: rate.toString(),
                totalAmount: totalAmount.toString(),
                ptsPerQty: item.ptsPerQty,
                totalPts: item.totalPts,
                offerNumber: item.offerNumber,
                isFree: item.isFree,
              };
            }),
          );

          await tx.insert(inventoryTransactions).values(
            input.items.map((item) => ({
              productId: item.productId,
              branchId: targetBranchId,
              userId: ctx.dbUser.id,
              type: "Sale",
              quantity: -item.quantity,
              referenceId: newSale.id.toString(),
              reason: `Sale ${newSale.orderNumber}`,
            })),
          );
        }

        return {
          id: newSale.id,
          orderNumber: newSale.orderNumber,
          transactionNumber: newSale.transactionNumber,
          branchId: newSale.branchId,
          userId: newSale.userId,
          mainQty: newSale.mainQty,
          freeQty: newSale.freeQty,
          totalQty: newSale.totalQty,
          invoiceAmount: newSale.invoiceAmount,
          advancePaymentAmount: newSale.advancePaymentAmount,
          receivedAmount: newSale.receivedAmount,
          balanceAmount: newSale.balanceAmount,
        };
      });
    }),

  updateSale: featureProtectedProcedure("sales")
    .meta({
      openapi: {
        method: "PUT",
        path: "/sales/{id}",
        summary: "Update an existing sale (Admin only)",
        tags: ["Sales"],
      },
    })
    .input(
      z.object({
        id: z.number(),
        cmrId: z.string().optional(),
        tmNo: z.string().optional(),
        saleType: z.string().optional(),
        oldAdvanceOrderNumber: z.string().optional(),
        registerType: z.enum(["Sale", "Advance"]).optional(),
        pincode: z
          .string()
          .regex(/^[1-9][0-9]{5}$/, "Invalid Pincode")
          .optional(),
        addressLine1: z.string().optional(),
        landmark: z.string().optional(),
        area: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        customerName: z.string().optional(),
        customerAddress: z.string().optional(),
        customerId: z.string().optional(),
        userIds: z.array(z.string()).optional(),
        managerIds: z.array(z.string()).optional(),
        invoiceAmount: z.string().optional(),
        advancePaymentAmount: z.string().optional(),
        receivedAmount: z.string().optional(),
        tradeDiscount: z.string().optional(),
        basicInvoiceValue: z.string().optional(),
        cgst: z.string().optional(),
        sgst: z.string().optional(),
        igst: z.string().optional(),
        items: z.array(
          z.object({
            productId: z.number(),
            quantity: z.number().min(1),
            isFree: z.boolean().default(false),
            ptsPerQty: z.string().optional(),
            totalPts: z.string().optional(),
            offerNumber: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.dbUser.role !== "Admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Admins can edit sales",
        });
      }

      if (input.oldAdvanceOrderNumber) {
        const oldAdvance = await ctx.db.query.sales.findFirst({
          where: (sales, { eq, and }) =>
            and(
              eq(sales.orderNumber, input.oldAdvanceOrderNumber!),
              eq(sales.registerType, "Advance")
            ),
        });
        if (!oldAdvance) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid old advance order number.",
          });
        }
      }

      return await ctx.db.transaction(async (tx) => {
        const existingSale = await tx.query.sales.findFirst({
          where: eq(sales.id, input.id),
          with: { items: true },
        });

        if (!existingSale)
          throw new TRPCError({ code: "NOT_FOUND", message: "Sale not found" });

        // If the sale was not rejected, we must revert the old items' inventory
        if (existingSale.status !== "Rejected") {
          for (const oldItem of existingSale.items) {
            await tx
              .insert(inventory)
              .values({
                productId: oldItem.productId,
                branchId: existingSale.branchId,
                quantity: oldItem.quantity,
              })
              .onConflictDoUpdate({
                target: [inventory.productId, inventory.branchId],
                set: {
                  quantity: sql`${inventory.quantity} + ${oldItem.quantity}`,
                },
              });

            await tx.insert(inventoryTransactions).values({
              productId: oldItem.productId,
              branchId: existingSale.branchId,
              userId: ctx.dbUser.id,
              type: "Adjustment",
              quantity: oldItem.quantity,
              reason: `Edit Sale ${existingSale.orderNumber} - Revert Old Item`,
              referenceId: existingSale.id.toString(),
            });
          }
        }

        // Delete old items
        await tx.delete(saleItems).where(eq(saleItems.saleId, existingSale.id));

        // Decrement new items inventory
        if (existingSale.status !== "Rejected") {
          for (const item of input.items) {
            await tx
              .insert(inventory)
              .values({
                productId: item.productId,
                branchId: existingSale.branchId,
                quantity: -item.quantity,
              })
              .onConflictDoUpdate({
                target: [inventory.productId, inventory.branchId],
                set: {
                  quantity: sql`${inventory.quantity} - ${item.quantity}`,
                },
              });

            await tx.insert(inventoryTransactions).values({
              productId: item.productId,
              branchId: existingSale.branchId,
              userId: ctx.dbUser.id,
              type: "Sale",
              quantity: -item.quantity,
              reason: `Edit Sale ${existingSale.orderNumber} - Apply New Item`,
              referenceId: existingSale.id.toString(),
            });
          }
        }

        // Calculate new quantities and amounts
        let mainQty = 0;
        let freeQty = 0;
        for (const item of input.items) {
          if (item.isFree) freeQty += item.quantity;
          else mainQty += item.quantity;
        }
        const totalQty = mainQty + freeQty;

        const invoiceAmt = parseFloat(input.invoiceAmount ?? "0");
        const advanceAmt = parseFloat(input.advancePaymentAmount ?? "0");
        const receivedAmt = parseFloat(input.receivedAmount ?? "0");
        const balanceAmt = invoiceAmt - advanceAmt - receivedAmt;

        // Fetch pincode delivery address if pincode changed
        let deliveryAddress = existingSale.deliveryAddress;
        if (input.pincode && input.pincode !== existingSale.pincode) {
          try {
            const res = await fetch(
              `${env.NEXT_PUBLIC_PINCODE_API_URL}/${input.pincode}`,
              { signal: AbortSignal.timeout(3000) },
            );
            const data = (await res.json()) as {
              Status: string;
              PostOffice: { Name: string; District: string; State: string }[];
            }[];
            if (Array.isArray(data) && data[0]?.Status === "Success") {
              const postOffice = data[0].PostOffice?.[0];
              if (postOffice)
                deliveryAddress = `${postOffice.Name}, ${postOffice.District}, ${postOffice.State}`;
            }
          } catch {}
        }

        const [updatedSale] = await tx
          .update(sales)
          .set({
            pincode: input.pincode,
            cmrId: input.cmrId,
            tmNo: input.tmNo,
            saleType: input.saleType,
            oldAdvanceOrderNumber: input.oldAdvanceOrderNumber,
            registerType: input.registerType ?? existingSale.registerType,
            addressLine1: input.addressLine1,
            landmark: input.landmark,
            area: input.area,
            city: input.city,
            state: input.state,
            deliveryAddress: deliveryAddress ?? undefined,
            customerName: input.customerName,
            customerAddress: input.customerAddress,
            customerId: input.customerId,
            mainQty,
            freeQty,
            totalQty,
            invoiceAmount: invoiceAmt.toString(),
            advancePaymentAmount: advanceAmt.toString(),
            receivedAmount: receivedAmt.toString(),
            balanceAmount: balanceAmt.toString(),
            tradeDiscount: input.tradeDiscount || "0",
            basicInvoiceValue: input.basicInvoiceValue || "0",
            cgst: input.cgst || "0",
            sgst: input.sgst || "0",
            igst: input.igst || "0",
          })
          .where(eq(sales.id, input.id))
          .returning();

        if (!updatedSale) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update sale",
          });
        }

        // Update user assignments
        await tx.delete(saleAssignments).where(eq(saleAssignments.saleId, updatedSale.id));
        
        const assignments = [];
        if (input.userIds) {
          assignments.push(...input.userIds.map(uid => ({ saleId: updatedSale.id, userId: uid, role: "Employee" as const })));
        }
        if (input.managerIds) {
          assignments.push(...input.managerIds.map(uid => ({ saleId: updatedSale.id, userId: uid, role: "Manager" as const })));
        }
        
        if (assignments.length > 0) {
          const uniqueAssignments = Array.from(
            new Map(assignments.map(a => [`${a.saleId}-${a.userId}-${a.role}`, a])).values()
          );
          await tx.insert(saleAssignments).values(uniqueAssignments);
        }

        // Insert new items
        if (input.items.length > 0) {
          const productIds = input.items.map(i => i.productId);
          const productsList = await tx.query.products.findMany({
            where: (products, { inArray }) => inArray(products.id, productIds),
          });
          const productMap = new Map(productsList.map(p => [p.id, p]));

          await tx.insert(saleItems).values(
            input.items.map((item) => {
              const product = productMap.get(item.productId);
              const rate = parseFloat(product?.price?.toString() || "0");
              const totalAmount = item.isFree ? 0 : rate * item.quantity;
              
              return {
                saleId: updatedSale.id,
                productId: item.productId,
                quantity: item.quantity,
                rate: rate.toString(),
                totalAmount: totalAmount.toString(),
                ptsPerQty: item.ptsPerQty,
                totalPts: item.totalPts,
                offerNumber: item.offerNumber,
                isFree: item.isFree,
              };
            }),
          );
        }

        return updatedSale;
      });
    }),

  getSales: featureProtectedProcedure("sales")
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).nullish(),
          cursor: z.number().nullish(), // Use sale id as cursor for keyset pagination
          search: z.string().optional(),
          registerType: z.enum(["Sale", "Advance"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const currentUser = ctx.dbUser;
      const limit = input?.limit ?? 20;
      const cursor = input?.cursor;
      const search = input?.search;

      let items;

      const searchCondition = search
        ? or(
            ilike(sales.transactionNumber, `%${search}%`),
            ilike(sales.customerName, `%${search}%`),
            ilike(sales.orderNumber, `%${search}%`),
            exists(
              ctx.db
                .select()
                .from(saleItems)
                .innerJoin(products, eq(saleItems.productId, products.id))
                .where(
                  and(
                    eq(saleItems.saleId, sales.id),
                    ilike(products.name, `%${search}%`),
                  ),
                ),
            ),
          )
        : undefined;

      if (currentUser.role === "Admin" || currentUser.role === "Developer") {
        items = await ctx.db.query.sales.findMany({
          where: and(
            input?.registerType ? eq(sales.registerType, input.registerType) : undefined,
            cursor ? sql`${sales.id} < ${cursor}` : undefined,
            searchCondition
          ),
          limit: limit + 1,
          with: {
            user: true,
            manager: true,
            branch: true,
            items: { with: { product: true } },
            assignments: { with: { user: true } },
            files: {
              where: (files, { eq }) => eq(files.entityType, "sale"),
            },
          },
          orderBy: (sales, { desc }) => [desc(sales.id)],
        });
      } else {
        const assignedBranchId = enforceBranchIsolation(ctx);

        const conditions =
          currentUser.role === "Employee"
            ? and(
                eq(sales.branchId, assignedBranchId!),
                input?.registerType ? eq(sales.registerType, input.registerType) : undefined,
                exists(
                  ctx.db
                    .select()
                    .from(saleAssignments)
                    .where(
                      and(
                        eq(saleAssignments.saleId, sales.id),
                        eq(saleAssignments.userId, currentUser.id),
                      ),
                    ),
                ),
                cursor ? sql`${sales.id} < ${cursor}` : undefined,
                searchCondition
              )
            : and(
                eq(sales.branchId, assignedBranchId!),
                input?.registerType ? eq(sales.registerType, input.registerType) : undefined,
                cursor ? sql`${sales.id} < ${cursor}` : undefined,
                searchCondition
              );

        items = await ctx.db.query.sales.findMany({
          where: conditions,
          limit: limit + 1,
          with: {
            user: true,
            manager: true,
            branch: true,
            items: { with: { product: true } },
            assignments: { with: { user: true } },
            files: {
              where: (files, { eq }) => eq(files.entityType, "sale"),
            },
          },
          orderBy: (sales, { desc }) => [desc(sales.id)],
        });
      }

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  getSale: featureProtectedProcedure("sales")
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const sale = await ctx.db.query.sales.findFirst({
        where: eq(sales.id, input.id),
        with: {
          items: { with: { product: true } },
          user: true,
          assignments: { with: { user: true } },
          customer: true,
        },
      });

      if (!sale) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.dbUser.role !== "Admin" && ctx.dbUser.role !== "Developer") {
        const assignedBranchId = enforceBranchIsolation(ctx);
        if (sale.branchId !== assignedBranchId)
          throw new TRPCError({ code: "FORBIDDEN" });
        if (ctx.dbUser.role === "Employee" && sale.userId !== ctx.dbUser.id)
          throw new TRPCError({ code: "FORBIDDEN" });
      }

      return sale;
    }),

  updateSaleStatus: featureProtectedProcedure("sales")
    .input(
      z.object({
        saleId: z.number(),
        status: z.enum(["Pending", "Approved", "Rejected"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = ctx.dbUser;

      return await ctx.db.transaction(async (tx) => {
        const targetSale = await tx.query.sales.findFirst({
          where: eq(sales.id, input.saleId),
          with: { items: true },
        });

        if (!targetSale)
          throw new TRPCError({ code: "NOT_FOUND", message: "Sale not found" });

        // Enforce branch isolation for target sale
        enforceBranchIsolation(ctx, targetSale.branchId);

        // RBAC Check for Managers/Admins
        if (currentUser.role !== "Admin") {
          if (currentUser.role !== "Manager") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Unauthorized to update status",
            });
          }

          // Check if sale belongs to manager's team (Simplified recursive check)
          const isOwnTeam = targetSale.managerId === currentUser.id;
          if (!isOwnTeam) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Unauthorized: Sale does not belong to your team",
            });
          }
        }

        // Logic for "Rejected": Replenish inventory
        if (input.status === "Rejected" && targetSale.status !== "Rejected") {
          for (const item of targetSale.items) {
            await tx
              .insert(inventory)
              .values({
                productId: item.productId,
                branchId: targetSale.branchId,
                quantity: item.quantity,
              })
              .onConflictDoUpdate({
                target: [inventory.productId, inventory.branchId],
                set: {
                  quantity: sql`${inventory.quantity} + ${item.quantity}`,
                },
              });

            await tx.insert(inventoryTransactions).values({
              productId: item.productId,
              branchId: targetSale.branchId,
              userId: ctx.dbUser.id,
              type: "Adjustment",
              quantity: item.quantity,
              reason: `Sale ${targetSale.orderNumber} Rejected - Stock Reclaimed`,
              referenceId: targetSale.id.toString(),
            });
          }
        }

        // Logic for moving AWAY from Rejected back to Pending/Approved: Deduct inventory again
        if (
          targetSale.status === "Rejected" &&
          (input.status === "Pending" || input.status === "Approved")
        ) {
          for (const item of targetSale.items) {
            // Atomic decrement via Upsert
            await tx
              .insert(inventory)
              .values({
                productId: item.productId,
                branchId: targetSale.branchId,
                quantity: -item.quantity,
              })
              .onConflictDoUpdate({
                target: [inventory.productId, inventory.branchId],
                set: {
                  quantity: sql`${inventory.quantity} - ${item.quantity}`,
                },
              });

            await tx.insert(inventoryTransactions).values({
              productId: item.productId,
              branchId: targetSale.branchId,
              userId: ctx.dbUser.id,
              type: "Sale",
              quantity: -item.quantity,
              reason: `Sale ${targetSale.orderNumber} Re-activated - Stock Deducted`,
              referenceId: targetSale.id.toString(),
            });
          }
        }

        const [updated] = await tx
          .update(sales)
          .set({ status: input.status })
          .where(eq(sales.id, input.saleId))
          .returning();

        if (updated) {
          void sendNotificationToUser(updated.userId, {
            title: `Sale ${input.status}`,
            body: `Your order ${updated.orderNumber} has been ${input.status.toLowerCase()}.`,
            url: "/sales",
          });
        }

        return updated;
      });
    }),

  deleteSale: featureProtectedProcedure("sales")
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.dbUser.role !== "Admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Admins can delete sales.",
        });
      }

      return await ctx.db.transaction(async (tx) => {
        const targetSale = await tx.query.sales.findFirst({
          where: eq(sales.id, input.id),
          with: { items: true },
        });

        if (!targetSale) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Sale not found" });
        }

        if (targetSale.status !== "Rejected") {
          for (const item of targetSale.items) {
            await tx
              .insert(inventory)
              .values({
                productId: item.productId,
                branchId: targetSale.branchId,
                quantity: item.quantity,
              })
              .onConflictDoUpdate({
                target: [inventory.productId, inventory.branchId],
                set: {
                  quantity: sql`${inventory.quantity} + ${item.quantity}`,
                },
              });

            await tx.insert(inventoryTransactions).values({
              productId: item.productId,
              branchId: targetSale.branchId,
              userId: ctx.dbUser.id,
              type: "Adjustment",
              quantity: item.quantity,
              reason: `Sale ${targetSale.orderNumber} Deleted - Stock Reclaimed`,
              referenceId: targetSale.id.toString(),
            });
          }
        }

        await tx.delete(sales).where(eq(sales.id, input.id));
        return { success: true };
      });
    }),
});
