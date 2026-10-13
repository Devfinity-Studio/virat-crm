import re

with open('src/server/api/routers/users.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add getNextEmployeeCodeBySeries
new_query = """
  previewNextEmployeeCode: protectedProcedure
    .input(z.object({ series: z.string() }))
    .query(async ({ ctx, input }) => {
      const series = input.series.trim();
      if (!series) return '';
      
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
content = content.replace('  createUser: protectedProcedure', new_query + '\n  createUser: protectedProcedure')

with open('src/server/api/routers/users.ts', 'w', encoding='utf-8') as f:
    f.write(content)
