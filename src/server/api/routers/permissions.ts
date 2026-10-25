import { z } from "zod";
import {
  createTRPCRouter,
  adminProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { rolePermissions } from "@/server/db/schema/rolePermissions";
import { eq, and } from "drizzle-orm";
import { syncDefaultRolePermissions } from "@/server/lib/permissions";

export const permissionsRouter = createTRPCRouter({
  getAll: adminProcedure.query(async ({ ctx }) => {
    await syncDefaultRolePermissions(ctx.db);
    return ctx.db.select().from(rolePermissions);
  }),

  toggle: adminProcedure
    .input(
      z.object({
        role: z.string().min(2).max(64),
        featureKey: z.string(),
        isEnabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.role === "Developer" && ctx.dbUser?.role !== "Developer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Developer permissions cannot be modified by standard administrators.",
        });
      }

      // Check if entry exists
      const existing = await ctx.db
        .select()
        .from(rolePermissions)
        .where(
          and(
            eq(rolePermissions.role, input.role),
            eq(rolePermissions.featureKey, input.featureKey),
          ),
        );

      if (existing.length > 0) {
        return ctx.db
          .update(rolePermissions)
          .set({ isEnabled: input.isEnabled })
          .where(
            and(
              eq(rolePermissions.role, input.role),
              eq(rolePermissions.featureKey, input.featureKey),
            ),
          );
      } else {
        return ctx.db.insert(rolePermissions).values({
          role: input.role,
          featureKey: input.featureKey,
          isEnabled: input.isEnabled,
        });
      }
    }),

  getForRole: publicProcedure
    .input(z.object({ role: z.string().min(2).max(64) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.role, input.role));
    }),
});
