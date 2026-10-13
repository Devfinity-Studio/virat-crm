with open('src/server/api/routers/roles.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Update create input
content = content.replace('description: z.string().max(256).optional(),\\n      }),', 'description: z.string().max(256).optional(),\\n        codeSeries: z.string().max(32).optional(),\\n      }),')

# Update insert
content = content.replace('description: input.description,\\n          isSystem: false,\\n        })', 'description: input.description,\\n          codeSeries: input.codeSeries,\\n          isSystem: false,\\n        })')

# Add update mutation
update_mutation = """
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
"""
content = content.replace('  delete: adminProcedure', update_mutation + '\\n  delete: adminProcedure')

with open('src/server/api/routers/roles.ts', 'w', encoding='utf-8') as f:
    f.write(content)
