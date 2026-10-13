import re

with open('src/server/api/routers/users.ts', 'r') as f:
    content = f.read()

# 1. Update getUserById
old_getuser = """          managers: {
            with: { manager: true },
          },"""
new_getuser = """          managers: {
            with: { manager: true },
          },
          teamMembers: {
            with: { user: true },
          },"""
content = content.replace(old_getuser, new_getuser)

# 2. Add profilePhoto to updateUser
old_update_schema = """        branchId: z.number().nullable().optional(),
        managerIds: z.array(z.string()).optional(),"""
new_update_schema = """        branchId: z.number().nullable().optional(),
        managerIds: z.array(z.string()).optional(),
        profilePhoto: z.string().optional(),"""
content = content.replace(old_update_schema, new_update_schema)

old_update_set = """          dob: dob ? dob.toISOString().split('T')[0] : undefined,
          joiningDate: joiningDate ? joiningDate.toISOString().split('T')[0] : undefined,
          promotionDate: promotionDate ? promotionDate.toISOString().split('T')[0] : undefined,"""
new_update_set = """          dob: dob ? dob.toISOString().split('T')[0] : undefined,
          joiningDate: joiningDate ? joiningDate.toISOString().split('T')[0] : undefined,
          promotionDate: promotionDate ? promotionDate.toISOString().split('T')[0] : undefined,
          profilePhoto: userData.profilePhoto,"""
content = content.replace(old_update_set, new_update_set)

# 3. Add Document endpoints and updateUserProfilePhoto
doc_endpoints = """
  updateUserProfilePhoto: protectedProcedure
    .input(z.object({ userId: z.string(), profilePhoto: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users).set({ profilePhoto: input.profilePhoto }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  addUserDocument: protectedProcedure
    .input(z.object({
      userId: z.string(),
      name: z.string(),
      url: z.string(),
      key: z.string(),
      mimeType: z.string().optional(),
      size: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { userDocuments } = require("@/server/db/schema/userDocuments");
      await ctx.db.insert(userDocuments).values(input);
      return { success: true };
    }),

  renameUserDocument: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userDocuments } = require("@/server/db/schema/userDocuments");
      await ctx.db.update(userDocuments).set({ name: input.name }).where(eq(userDocuments.id, input.id));
      return { success: true };
    }),

  deleteUserDocument: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { userDocuments } = require("@/server/db/schema/userDocuments");
      await ctx.db.delete(userDocuments).where(eq(userDocuments.id, input.id));
      return { success: true };
    }),
"""

content = content.replace("getPublicBranches: publicProcedure", doc_endpoints + "\n  getPublicBranches: publicProcedure")

with open('src/server/api/routers/users.ts', 'w') as f:
    f.write(content)
