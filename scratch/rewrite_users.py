import re

with open('src/server/api/routers/users.ts', 'r') as f:
    content = f.read()

# Fix the createUser insert values block
content = re.sub(
    r'\.values\(\{.*?\.\.\.userData,.*?password: hashedPassword,\s*\}\)',
    '''.values({
          ...userData,
          dob: dob ? dob.toISOString().split('T')[0] : undefined,
          joiningDate: joiningDate ? joiningDate.toISOString().split('T')[0] : undefined,
          promotionDate: promotionDate ? promotionDate.toISOString().split('T')[0] : undefined,
          employeeCode: finalEmployeeCode,
          password: hashedPassword,
        })''',
    content,
    flags=re.DOTALL | re.MULTILINE
)

# And make sure promotionDate is in the signup input schema!
if "promotionDate: z.date().optional()," not in content:
    content = content.replace("joiningRole: z.string().optional(),", "joiningRole: z.string().optional(),\n        promotionDate: z.date().optional(),")

# Fix the updateUser insert values block
content = re.sub(
    r'\.set\(\{.*?\.\.\.userData,.*?(dob:.*?\}\))',
    '''.set({
          ...userData,
          dob: dob ? dob.toISOString().split('T')[0] : undefined,
          joiningDate: joiningDate ? joiningDate.toISOString().split('T')[0] : undefined,
          promotionDate: promotionDate ? promotionDate.toISOString().split('T')[0] : undefined,
        })''',
    content,
    flags=re.DOTALL | re.MULTILINE
)

with open('src/server/api/routers/users.ts', 'w') as f:
    f.write(content)
