import re

with open('src/server/api/routers/users.ts', 'r', encoding='utf-8') as f:
    content = f.read()

def generate_logic(is_preview=False):
    # If is_preview is true, the input is `input.series`.
    # If false, we look up `roleData?.codeSeries`.
    
    series_fetch = "const series = input.series.trim();" if is_preview else """const roleData = await ctx.db.query.roles.findFirst({
        where: eq(roles.name, input.role)
      });
      const series = roleData?.codeSeries?.trim();"""
      
    fallback = "if (!series) return '';" if is_preview else "if (!series) return 'EMP-0001 (Auto Generated)';"
    
    return f"""
      {series_fetch}
      {fallback}
      
      // Extract trailing digits and prefix
      const match = series.match(/^(.*?)(\\d+)$/);
      if (!match) {{
        // If there are no trailing digits, just append 0001 as fallback
        return `${{series}}0001`;
      }}
      
      const prefix = match[1];
      const startNumStr = match[2];
      const startNum = parseInt(startNumStr, 10);
      
      const latestUsers = await ctx.db.query.users.findMany({{
        where: like(users.employeeCode, `${{prefix}}%`),
        orderBy: [desc(users.employeeCode)],
        limit: 100
      }});
      
      if (latestUsers.length === 0) {{
        return series; // No users yet, return the exact starting code
      }}
      
      let maxNum = startNum - 1; // Base case: if we found users, we need to at least start at startNum
      for (const u of latestUsers) {{
        const numPart = u.employeeCode.replace(prefix, '');
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {{
          maxNum = parsed;
        }}
      }}
      
      return `${{prefix}}${{(maxNum + 1).toString().padStart(startNumStr.length, '0')}}`;
    """

# Replace getNextEmployeeCode
old_get_next = """  getNextEmployeeCode: protectedProcedure
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
    }),"""

new_get_next = """  getNextEmployeeCode: protectedProcedure
    .input(z.object({ role: z.string() }))
    .query(async ({ ctx, input }) => {""" + generate_logic(False) + "}),"
content = content.replace(old_get_next, new_get_next)

# Replace previewNextEmployeeCode
old_preview = """  previewNextEmployeeCode: protectedProcedure
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
    }),"""

new_preview = """  previewNextEmployeeCode: protectedProcedure
    .input(z.object({ series: z.string() }))
    .query(async ({ ctx, input }) => {""" + generate_logic(True) + "}),"
content = content.replace(old_preview, new_preview)

with open('src/server/api/routers/users.ts', 'w', encoding='utf-8') as f:
    f.write(content)
