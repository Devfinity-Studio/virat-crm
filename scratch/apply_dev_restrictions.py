import re

with open('src/server/api/routers/users.ts', 'r') as f:
    content = f.read()

# 1. replace imports
content = re.sub(r'import \{ eq, or, sql, desc, like \} from "drizzle-orm";', 'import { eq, or, sql, desc, like, ne } from "drizzle-orm";', content)

# 2. getUserById
content = re.sub(
    r'(\s*if \(!user\) \{\s*throw new TRPCError\(\{ code: "NOT_FOUND" \}\);\s*\})',
    r'\1\n      if (user.role === "Developer") {\n        throw new TRPCError({ code: "FORBIDDEN", message: "Developer profiles cannot be managed here" });\n      }',
    content
)

# 3. getUsersForDropdown
content = re.sub(
    r'(getUsersForDropdown: protectedProcedure\.query\(async \(\{ ctx \}?\) => \{\s*return ctx\.db\.query\.users\.findMany\(\{)',
    r'\1\n      where: ne(users.role, "Developer"),',
    content
)

# 4. getAllUsers
content = re.sub(
    r'(getAllUsers: protectedProcedure\.query\(async \(\{ ctx \}?\) => \{[\s\S]*?return ctx\.db\.query\.users\.findMany\(\{)',
    r'\1\n      where: ne(users.role, "Developer"),',
    content
)

# 5. updateUser
content = re.sub(
    r'(updateUser: protectedProcedure[\s\S]*?async \(\{ ctx, input \}\) => \{)',
    r'\1\n      const targetUserForUpdate = await ctx.db.query.users.findFirst({ where: eq(users.id, input.userId) });\n      if (targetUserForUpdate?.role === "Developer") throw new TRPCError({ code: "FORBIDDEN", message: "Cannot modify Developer profiles" });',
    content
)

with open('src/server/api/routers/users.ts', 'w') as f:
    f.write(content)
print('Patched successfully')
