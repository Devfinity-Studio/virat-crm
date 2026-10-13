import re

with open('src/server/api/routers/users.ts', 'r') as f:
    content = f.read()

# 1. Add profilePhoto and documents to signup input schema
input_schema_addition = """        password: z.string().min(6),
        profilePhoto: z.string().optional(),
        documents: z.array(z.object({
          name: z.string(),
          url: z.string(),
          key: z.string(),
          mimeType: z.string().optional(),
          size: z.number().optional()
        })).optional(),
        role: z.string().min(2).max(64),"""
content = re.sub(r'password:\s*z\.string\(\)\.min\(6\),\s*role:\s*z\.string\(\)\.min\(2\)\.max\(64\),', input_schema_addition, content)


# 2. Add document insert logic to createUser
insert_docs = """        .returning();

      if (newUser && documents && documents.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { userDocuments } = require("@/server/db/schema/userDocuments");
        await ctx.db.insert(userDocuments).values(
          documents.map(doc => ({
            userId: newUser.id,
            name: doc.name,
            url: doc.url,
            key: doc.key,
            mimeType: doc.mimeType,
            size: doc.size
          }))
        );
      }

      if (newUser && managerIds && managerIds.length > 0) {"""
content = content.replace('.returning();\n\n      if (newUser && managerIds && managerIds.length > 0) {', insert_docs)

# 3. Add profilePhoto to userData destructuring
destructure_addition = "const { managerIds, employeeCode, documents, ...userData } = input;"
content = content.replace("const { managerIds, employeeCode, ...userData } = input;", destructure_addition)

# 4. Add new methods
new_methods = """
  getUserById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.id),
        with: {
          branch: true,
          managers: {
            with: { manager: true },
          },
        },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { userDocuments } = require("@/server/db/schema/userDocuments");
      const docs = await ctx.db.select().from(userDocuments).where(eq(userDocuments.userId, user.id));

      return { ...user, documents: docs, activeSessions: [] };
    }),

  updateUserPassword: protectedProcedure
    .input(z.object({ userId: z.string(), newPassword: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.dbUser.role !== "Admin" && ctx.dbUser.role !== "Developer") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can change user passwords" });
      }
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);
      await ctx.db.update(users).set({ password: hashedPassword }).where(eq(users.id, input.userId));
      return { success: true };
    }),
"""
content = content.replace("getPublicBranches: publicProcedure", new_methods + "\n  getPublicBranches: publicProcedure")

with open('src/server/api/routers/users.ts', 'w') as f:
    f.write(content)
