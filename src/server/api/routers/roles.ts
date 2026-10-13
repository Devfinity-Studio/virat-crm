import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { roles } from "@/server/db/schema/roles";
import { users } from "@/server/db/schema/users";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const rolesRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.roles.findMany({
      orderBy: (roles, { asc }) => [asc(roles.name)],
    });
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(64),
        description: z.string().max(256).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if role already exists
      const existingRole = await ctx.db.query.roles.findFirst({
        where: eq(roles.name, input.name),
      });

      if (existingRole) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A role with this name already exists.",
        });
      }

      return await ctx.db
        .insert(roles)
        .values({
          name: input.name,
          description: input.description,
          isSystem: false,
        })
        .returning();
    }),


  update: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().max(256).optional(),
        codeSeries: z.string().max(32).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.db.query.roles.findFirst({
        where: eq(roles.name, input.name),
      });

      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found." });
      }

      return await ctx.db
        .update(roles)
        .set({
          description: input.description,
          codeSeries: input.codeSeries,
        })
        .where(eq(roles.name, input.name))
        .returning();
    }),

  delete: adminProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const role = await ctx.db.query.roles.findFirst({
        where: eq(roles.name, input.name),
      });

      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found." });
      }

      if (role.isSystem) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "System roles cannot be deleted.",
        });
      }

      // Check if any users are assigned to this role
      const assignedUsers = await ctx.db
        .select()
        .from(users)
        .where(eq(users.role, input.name))
        .limit(1);

      if (assignedUsers.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete the '${input.name}' role because it is currently assigned to one or more employees. Please reassign those employees first.`,
        });
      }

      await ctx.db.delete(roles).where(eq(roles.name, input.name));
      return { success: true };
    }),
});
