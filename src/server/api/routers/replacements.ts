import { z } from "zod";
import { createTRPCRouter, featureProtectedProcedure } from "@/server/api/trpc";
import { replacements, sales, replacementItems } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { sendNotificationToUser } from "@/server/lib/push";
import { TRPCError } from "@trpc/server";

export const replacementsRouter = createTRPCRouter({
  createReplacement: featureProtectedProcedure("sales")
    .input(
      z.object({
        originalSaleId: z.number(),
        reason: z.string(),
        replacementType: z.string(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number()
        }))
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const originalSale = await ctx.db.query.sales.findFirst({
        where: eq(sales.id, input.originalSaleId),
      });

      if (!originalSale)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Original sale not found",
        });

      if (
        ctx.dbUser.role !== "Admin" &&
        originalSale.userId !== ctx.dbUser.id
      ) {
        const descendantsQuery = sql`
          WITH RECURSIVE subordinates AS (
            SELECT id FROM "virat-crm_user" WHERE manager_id = ${ctx.dbUser.id}
            UNION
            SELECT e.id FROM "virat-crm_user" e
            INNER JOIN subordinates s ON s.id = e.manager_id
          )
          SELECT id FROM subordinates WHERE id = ${originalSale.userId} LIMIT 1;
        `;

        const rows = await ctx.db.execute(descendantsQuery);
        if (rows.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Unauthorized to create replacement for this sale",
          });
        }
      }

      const newReplacement = {
        originalSaleId: input.originalSaleId,
        branchId: originalSale.branchId,
        userId: ctx.dbUser.id,
        reason: input.reason,
        status: "Pending" as const,
        replacementType: input.replacementType,
      };

      const [replacement] = await ctx.db
        .insert(replacements)
        .values(newReplacement)
        .returning();

      if (input.items.length > 0) {
        await ctx.db.insert(replacementItems).values(
          input.items.map(item => ({
            replacementId: replacement.id,
            productId: item.productId,
            quantity: item.quantity,
          }))
        );
      }

      return replacement;
    }),

  getMyReplacements: featureProtectedProcedure("sales").query(
    async ({ ctx }) => {
      return ctx.db.query.replacements.findMany({
        where: eq(replacements.userId, ctx.dbUser.id),
        with: {
          sale: true,
          files: {
            where: (files, { eq }) => eq(files.entityType, "replacement"),
          },
        },
        orderBy: (replacements, { desc }) => [desc(replacements.createdAt)],
      });
    },
  ),

  getReplacements: featureProtectedProcedure("sales").query(async ({ ctx }) => {
    if (ctx.dbUser.role === "Admin") {
      return ctx.db.query.replacements.findMany({
        with: {
          sale: true,
          user: true,
          files: {
            where: (files, { eq }) => eq(files.entityType, "replacement"),
          },
        },
        orderBy: (replacements, { desc }) => [desc(replacements.createdAt)],
      });
    }

    // Filter by branch for non-admins
    return ctx.db.query.replacements.findMany({
      where: eq(replacements.branchId, ctx.dbUser.branchId!),
      with: {
        sale: true,
        user: true,
        files: {
          where: (files, { eq }) => eq(files.entityType, "replacement"),
        },
      },
      orderBy: (replacements, { desc }) => [desc(replacements.createdAt)],
    });
  }),

  updateReplacementStatus: featureProtectedProcedure("sales")
    .input(
      z.object({
        replacementId: z.number(),
        status: z.enum(["Pending", "Approved", "Rejected"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targetReplacement = await ctx.db.query.replacements.findFirst({
        where: eq(replacements.id, input.replacementId),
      });

      if (!targetReplacement)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Replacement not found",
        });

      if (ctx.dbUser.role !== "Admin") {
        if (ctx.dbUser.role !== "Manager") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Unauthorized to update status",
          });
        }

        // Managers can only update if it's in their branch
        if (targetReplacement.branchId !== ctx.dbUser.branchId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Unauthorized: Replacement does not belong to your branch",
          });
        }
      }

      const [updated] = await ctx.db
        .update(replacements)
        .set({ status: input.status })
        .where(eq(replacements.id, input.replacementId))
        .returning();

      if (updated) {
        void sendNotificationToUser(updated.userId, {
          title: `Replacement ${input.status}`,
          body: `Your replacement request for ID ${updated.id} has been ${input.status.toLowerCase()}.`,
          url: "/replacements",
        });
      }

      return updated;
    }),
});
