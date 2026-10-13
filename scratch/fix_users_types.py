import re

with open('src/server/api/routers/users.ts', 'r') as f:
    content = f.read()

# Fix destructuring in createUser
old_destructure = "const { managerIds, employeeCode, documents, ...userData } = input;"
new_destructure = "const { managerIds, employeeCode, documents, dob, joiningDate, promotionDate, ...userData } = input;"
content = content.replace(old_destructure, new_destructure)

# Fix insert in createUser
old_insert_values = """        .values({
          ...userData,
          dob: userData.dob ? userData.dob.toISOString().split('T')[0] : undefined,
          employeeCode: finalEmployeeCode,
          password: hashedPassword,
        })"""
new_insert_values = """        .values({
          ...userData,
          dob: dob ? dob.toISOString().split('T')[0] : undefined,
          joiningDate: joiningDate ? joiningDate.toISOString().split('T')[0] : undefined,
          promotionDate: promotionDate ? promotionDate.toISOString().split('T')[0] : undefined,
          employeeCode: finalEmployeeCode,
          password: hashedPassword,
        })"""
content = content.replace(old_insert_values, new_insert_values)

# Fix destructuring in updateUser
# Wait, let's find the destructuring in updateUser
old_update_destruct = "const { userId, managerIds, ...userData } = input;"
new_update_destruct = "const { userId, managerIds, dob, joiningDate, promotionDate, ...userData } = input;"
content = content.replace(old_update_destruct, new_update_destruct)

old_update_values = """        .set({
          ...userData,
          dob: userData.dob ? userData.dob.toISOString().split('T')[0] : undefined,
        })"""
new_update_values = """        .set({
          ...userData,
          dob: dob ? dob.toISOString().split('T')[0] : undefined,
          joiningDate: joiningDate ? joiningDate.toISOString().split('T')[0] : undefined,
          promotionDate: promotionDate ? promotionDate.toISOString().split('T')[0] : undefined,
        })"""
content = content.replace(old_update_values, new_update_values)

with open('src/server/api/routers/users.ts', 'w') as f:
    f.write(content)
