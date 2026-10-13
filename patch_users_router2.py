import re

with open('src/server/api/routers/users.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add getNextEmployeeCode
get_next_code = """
  getNextEmployeeCode: protectedProcedure
    .input(z.object({ role: z.string() }))
    .query(async ({ ctx, input }) => {
      const roleData = await ctx.db.query.roles.findFirst({
        where: eq(roles.name, input.role)
      });
      const series = roleData?.codeSeries;
      if (!series) return 'EMP-XXXX (Auto Generated)';
      
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
      return `${series}${(maxNum + 1).toString().padStart(4, '0')}`;
    }),
"""
content = content.replace('  createUser: protectedProcedure', get_next_code + '\n  createUser: protectedProcedure')

# Add dob to createUser and updateUser input schema
content = content.replace('joiningDate: z.date().optional(),', 'joiningDate: z.date().optional(),\n        dob: z.date().optional(),')

with open('src/server/api/routers/users.ts', 'w', encoding='utf-8') as f:
    f.write(content)
