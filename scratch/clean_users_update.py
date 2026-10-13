import re

with open('src/server/api/routers/users.ts', 'r') as f:
    content = f.read()

# 1. Update createUser Input
input_add = """        password: z.string().min(6),
        profilePhoto: z.string().optional(),
        documents: z.array(z.object({
          name: z.string(),
          url: z.string(),
          key: z.string(),
          mimeType: z.string().optional(),
          size: z.number().optional()
        })).optional(),
        promotionDate: z.date().optional(),"""
content = re.sub(r'password:\s*z\.string\(\)\.min\(6\),', input_add, content)

# 2. Update createUser Destructure
old_destruct = "const { managerIds, employeeCode, ...userData } = input;"
new_destruct = "const { managerIds, employeeCode, documents, dob, joiningDate, promotionDate, ...userData } = input;"
content = content.replace(old_destruct, new_destruct)

# 3. Update createUser Insert
old_insert = """        .values({
          ...userData,
          password: hashedPassword,
        })"""
new_insert = """        .values({
          ...userData,
          dob: dob ? dob.toISOString().split('T')[0] : undefined,
          joiningDate: joiningDate ? joiningDate.toISOString().split('T')[0] : undefined,
          promotionDate: promotionDate ? promotionDate.toISOString().split('T')[0] : undefined,
          employeeCode: finalEmployeeCode,
          password: hashedPassword,
        })"""
content = content.replace(old_insert, new_insert)

# 4. Add UserDocuments insertion
doc_insert = """        .returning();

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
      }"""
content = content.replace(".returning();", doc_insert, 1)

# 5. Add getUserById and updateUserPassword
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
