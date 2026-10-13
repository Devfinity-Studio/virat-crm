import re

with open('src/server/api/routers/users.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add roles to imports
content = content.replace('import { users } from "@/server/db/schema/users";', 'import { users } from "@/server/db/schema/users";\\nimport { roles } from "@/server/db/schema/roles";')
content = content.replace('import { eq, or, sql } from "drizzle-orm";', 'import { eq, or, sql, desc, like } from "drizzle-orm";')

# Update createUser input
content = content.replace('employeeCode: z.string(),', 'employeeCode: z.string().optional(),\\n        fatherName: z.string().optional(),\\n        joiningDate: z.date().optional(),\\n        joiningRole: z.string().optional(),')

# Helper function to generate employee code
generate_code_logic = """
      // Auto-generate employee code if not provided
      let finalEmployeeCode = input.employeeCode;
      if (!finalEmployeeCode) {
        const roleData = await ctx.db.query.roles.findFirst({
          where: eq(roles.name, input.role)
        });
        const series = roleData?.codeSeries;
        if (series) {
          const latestUsers = await ctx.db.query.users.findMany({
            where: like(users.employeeCode, `${series}%`),
            orderBy: [desc(users.employeeCode)],
            limit: 100
          });
          
          let maxNum = 0;
          for (const u of latestUsers) {
            const numPart = u.employeeCode.replace(series, '');
            const parsed = parseInt(numPart, 10);
            if (!isNaN(parsed) && parsed > maxNum) {
              maxNum = parsed;
            }
          }
          finalEmployeeCode = `${series}${(maxNum + 1).toString().padStart(4, '0')}`;
        } else {
          // Fallback random code if no series defined
          finalEmployeeCode = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
        }
      }
"""

content = content.replace('const { managerIds, ...userData } = input;', generate_code_logic + '\\n      const { managerIds, employeeCode, ...userData } = input;')

content = content.replace('...userData,\\n          password: hashedPassword,', '...userData,\\n          employeeCode: finalEmployeeCode,\\n          password: hashedPassword,')

# Update updateUser to support new fields
content = content.replace('employeeCode: z.string().min(3),', 'employeeCode: z.string().min(3).optional(),\\n        fatherName: z.string().optional(),\\n        joiningDate: z.date().optional(),\\n        joiningRole: z.string().optional(),\\n        promotionDate: z.date().optional(),')

# Add promoteEmployee mutation
promote_mutation = """
  promoteEmployee: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        newRole: z.string(),
        promotionDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.dbUser.role !== "Admin" && ctx.dbUser.role !== "Developer") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can promote employees" });
      }

      const targetUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const roleData = await ctx.db.query.roles.findFirst({
        where: eq(roles.name, input.newRole)
      });
      
      let finalEmployeeCode = targetUser.employeeCode;
      const series = roleData?.codeSeries;
      if (series) {
        const latestUsers = await ctx.db.query.users.findMany({
          where: like(users.employeeCode, `${series}%`),
          orderBy: [desc(users.employeeCode)],
          limit: 100
        });
        
        let maxNum = 0;
        for (const u of latestUsers) {
          const numPart = u.employeeCode.replace(series, '');
          const parsed = parseInt(numPart, 10);
          if (!isNaN(parsed) && parsed > maxNum) {
            maxNum = parsed;
          }
        }
        finalEmployeeCode = `${series}${(maxNum + 1).toString().padStart(4, '0')}`;
      }

      return await ctx.db.update(users)
        .set({
          role: input.newRole,
          employeeCode: finalEmployeeCode,
          promotionDate: input.promotionDate
        })
        .where(eq(users.id, input.userId));
    }),
"""

content = content.replace('  getOrgTree:', promote_mutation + '\\n  getOrgTree:')

with open('patch_users.py', 'w', encoding='utf-8') as f:
    f.write(f'''with open("src/server/api/routers/users.ts", "w", encoding="utf-8") as fw:
    fw.write("""{content}""")''')
