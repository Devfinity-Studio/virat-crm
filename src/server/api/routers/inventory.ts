import { z } from "zod";
import {
  createTRPCRouter,
  featureProtectedProcedure,
  protectedProcedure,
  enforceBranchIsolation,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  inventory,
  inventoryTransactions,
  stockTransfers,
  products,
} from "@/server/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { checkAndNotifyLowStock } from "@/server/lib/alerts";

export const inventoryRouter = createTRPCRouter({
  getBranches: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.branches.findMany();
  }),

  getBranchStock: featureProtectedProcedure("inventory")
    .meta({
      openapi: {
        method: "GET",
        path: "/inventory/stock",
        summary: "Get branch stock levels",
        tags: ["Inventory"],
      },
    })
    .input(z.object({ branchId: z.number().optional() }))
    .output(
      z.array(
        z.object({
          productId: z.number(),
          branchId: z.number(),
          quantity: z.number(),
          product: z.object({
            id: z.number(),
            name: z.string(),
            sku: z.string(),
            price: z.string(),
          }),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      const branchId = enforceBranchIsolation(ctx, input.branchId ?? undefined);

      const rows = await ctx.db.query.inventory.findMany({
        where: branchId ? eq(inventory.branchId, branchId) : undefined,
        with: {
          product: true,
        },
      });

      return rows.map((row) => ({
        productId: row.productId,
        branchId: row.branchId,
        quantity: row.quantity,
        product: {
          id: row.product.id,
          name: row.product.name,
          sku: row.product.sku,
          price: row.product.price.toString(),
        },
      }));
    }),

  getProducts: protectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/inventory/products",
        summary: "Get list of all products",
        tags: ["Inventory"],
      },
    })
    .input(z.void())
    .output(
      z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          sku: z.string(),
          price: z.string(),
          brand: z.string().nullable().optional(),
          category: z.string().nullable().optional(),
          hsnCode: z.string().nullable().optional(),
          minThreshold: z.number().nullable().optional(),
          pointsPerQty: z.string().nullable().optional(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const items = await ctx.db.query.products.findMany({
        orderBy: (products, { desc }) => [desc(products.id)],
      });
      return items.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        price: item.price.toString(),
        brand: item.brand,
        category: item.category,
        hsnCode: item.hsnCode,
        minThreshold: item.minThreshold,
        pointsPerQty: item.pointsPerQty?.toString(),
      }));
    }),

  adjustStock: featureProtectedProcedure("inventory")
    .input(
      z.object({
        productId: z.number(),
        branchId: z.number(),
        quantity: z.number(),
        reason: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      enforceBranchIsolation(ctx, input.branchId);

      return await ctx.db.transaction(async (tx) => {
        // Atomic Upsert: Update quantity or Insert if not exists
        const result = await tx
          .insert(inventory)
          .values({
            productId: input.productId,
            branchId: input.branchId,
            quantity: input.quantity,
          })
          .onConflictDoUpdate({
            target: [inventory.productId, inventory.branchId],
            set: { quantity: sql`${inventory.quantity} + ${input.quantity}` },
          })
          .returning();

        await tx.insert(inventoryTransactions).values({
          productId: input.productId,
          branchId: input.branchId,
          userId: ctx.dbUser.id,
          type: "Adjustment",
          quantity: input.quantity,
          reason: input.reason,
        });

        await checkAndNotifyLowStock(tx, input.branchId, input.productId);

        return { success: true, newQuantity: result[0]?.quantity };
      });
    }),

  requestTransfer: featureProtectedProcedure("inventory")
    .input(
      z.object({
        fromBranchId: z.number(),
        toBranchId: z.number(),
        items: z.array(
          z.object({ productId: z.number(), quantity: z.number() }),
        ),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      enforceBranchIsolation(ctx, input.fromBranchId);

      const [transfer] = await ctx.db
        .insert(stockTransfers)
        .values({
          fromBranchId: input.fromBranchId,
          toBranchId: input.toBranchId,
          status: "Pending",
          requestedById: ctx.dbUser.id,
          items: input.items,
          notes: input.notes,
        })
        .returning();

      return transfer;
    }),

  updateTransferStatus: featureProtectedProcedure("inventory")
    .input(
      z.object({
        transferId: z.number(),
        status: z.enum(["Shipped", "Received", "Cancelled"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        const transfer = await tx.query.stockTransfers.findFirst({
          where: eq(stockTransfers.id, input.transferId),
        });

        if (!transfer) throw new TRPCError({ code: "NOT_FOUND" });

        // Authorization: User must belong to either origin (to ship/cancel) or destination (to receive)
        const isOriginUser = ctx.dbUser.branchId === transfer.fromBranchId;
        const isDestUser = ctx.dbUser.branchId === transfer.toBranchId;
        const isAdmin =
          ctx.dbUser.role === "Admin" || ctx.dbUser.role === "Developer";

        if (!isAdmin && !isOriginUser && !isDestUser) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized to update this transfer",
          });
        }

        // Logic for Received
        if (input.status === "Received" && transfer.status === "Shipped") {
          if (!isAdmin && !isDestUser)
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only destination branch can mark as Received",
            });

          const items = transfer.items as {
            productId: number;
            quantity: number;
          }[];

          for (const item of items) {
            // Atomic decrements and increments
            // Decrement from Origin
            const decr = await tx
              .update(inventory)
              .set({ quantity: sql`${inventory.quantity} - ${item.quantity}` })
              .where(
                and(
                  eq(inventory.productId, item.productId),
                  eq(inventory.branchId, transfer.fromBranchId),
                ),
              )
              .returning();

            if (!decr[0] || decr[0].quantity < 0) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Stock level fell below zero for product ${item.productId} at origin`,
              });
            }

            // Increment at Destination (Upsert)
            await tx
              .insert(inventory)
              .values({
                productId: item.productId,
                branchId: transfer.toBranchId,
                quantity: item.quantity,
              })
              .onConflictDoUpdate({
                target: [inventory.productId, inventory.branchId],
                set: {
                  quantity: sql`${inventory.quantity} + ${item.quantity}`,
                },
              });

            // Log transactions
            await tx.insert(inventoryTransactions).values([
              {
                productId: item.productId,
                branchId: transfer.fromBranchId,
                userId: ctx.dbUser.id,
                type: "Transfer_Out",
                quantity: -item.quantity,
                referenceId: transfer.id.toString(),
                reason: `Transfer to branch ${transfer.toBranchId}`,
              },
              {
                productId: item.productId,
                branchId: transfer.toBranchId,
                userId: ctx.dbUser.id,
                type: "Transfer_In",
                quantity: item.quantity,
                referenceId: transfer.id.toString(),
                reason: `Transfer from branch ${transfer.fromBranchId}`,
              },
            ]);

            // Trigger Low Stock Alerts
            await checkAndNotifyLowStock(
              tx,
              transfer.fromBranchId,
              item.productId,
            );
            await checkAndNotifyLowStock(
              tx,
              transfer.toBranchId,
              item.productId,
            );
          }
        }

        const updateData: {
          status: "Shipped" | "Received" | "Cancelled";
          approvedById?: string;
          receivedById?: string;
        } = { status: input.status };
        if (input.status === "Shipped") {
          if (!isAdmin && !isOriginUser)
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only origin branch can ship",
            });
          updateData.approvedById = ctx.dbUser.id;
        }
        if (input.status === "Received")
          updateData.receivedById = ctx.dbUser.id;

        return await tx
          .update(stockTransfers)
          .set(updateData)
          .where(eq(stockTransfers.id, input.transferId))
          .returning();
      });
    }),

  getTransfers: featureProtectedProcedure("inventory").query(
    async ({ ctx }) => {
      const { dbUser } = ctx;
      const isAdmin = dbUser.role === "Admin" || dbUser.role === "Developer";

      return ctx.db.query.stockTransfers.findMany({
        where: isAdmin
          ? undefined
          : sql`${stockTransfers.fromBranchId} = ${dbUser.branchId} OR ${stockTransfers.toBranchId} = ${dbUser.branchId}`,
        with: {
          fromBranch: true,
          toBranch: true,
          requestedBy: true,
        },
        orderBy: [desc(stockTransfers.createdAt)],
      });
    },
  ),

  getLowStockItems: featureProtectedProcedure("inventory").query(
    async ({ ctx }) => {
      const { dbUser } = ctx;
      const isAdmin = dbUser.role === "Admin" || dbUser.role === "Developer";

      return ctx.db.query.inventory
        .findMany({
          where: isAdmin
            ? undefined
            : eq(inventory.branchId, dbUser.branchId ?? 0),
          with: {
            product: true,
            branch: true,
          },
        })
        .then((items) =>
          items.filter(
            (item) => item.quantity <= (item.product?.minThreshold ?? 10),
          ),
        );
    },
  ),

  addProduct: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Product name is required"),
        sku: z.string().optional(),
        price: z.number().min(0, "Price must be positive"),
        category: z.string().optional(),
        brand: z.string().optional(),
        hsnCode: z.string().optional(),
        minThreshold: z.number().min(0).optional(),
        pointsPerQty: z.number().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const generatedSku =
        input.sku?.trim() ||
        `PRD-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      const [newProduct] = await ctx.db
        .insert(products)
        .values({
          name: input.name.trim(),
          sku: generatedSku,
          price: input.price.toString(),
          category: input.category?.trim() || null,
          brand: input.brand?.trim() || null,
          hsnCode: input.hsnCode?.trim() || null,
          minThreshold: input.minThreshold ?? 10,
          pointsPerQty: input.pointsPerQty
            ? input.pointsPerQty.toString()
            : "0",
        })
        .returning();

      if (!newProduct) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create product",
        });
      }

      return newProduct;
    }),

  updateProduct: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        sku: z.string().optional(),
        price: z.number().min(0).optional(),
        category: z.string().optional(),
        brand: z.string().optional(),
        hsnCode: z.string().optional(),
        minThreshold: z.number().min(0).optional(),
        pointsPerQty: z.number().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { dbUser } = ctx;
      const isAuthorized =
        dbUser.role === "Admin" ||
        dbUser.role === "Developer" ||
        dbUser.role === "Manager";
      if (!isAuthorized) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Managers and Admins can update products",
        });
      }

      const { id, ...data } = input;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateValues: Record<string, any> = {};
      if (data.name !== undefined) updateValues.name = data.name.trim();
      if (data.sku !== undefined) updateValues.sku = data.sku.trim();
      if (data.price !== undefined) updateValues.price = data.price.toString();
      if (data.category !== undefined) updateValues.category = data.category.trim();
      if (data.brand !== undefined) updateValues.brand = data.brand.trim();
      if (data.hsnCode !== undefined) updateValues.hsnCode = data.hsnCode.trim();
      if (data.minThreshold !== undefined) updateValues.minThreshold = data.minThreshold;
      if (data.pointsPerQty !== undefined) updateValues.pointsPerQty = data.pointsPerQty.toString();

      const [updated] = await ctx.db
        .update(products)
        .set(updateValues)
        .where(eq(products.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      return updated;
    }),
});
