import re

with open('src/app/admin/manage/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Edit icon
content = content.replace('Shield, Plus, Trash2, Loader2, ShieldAlert', 'Shield, Plus, Trash2, Loader2, ShieldAlert, Edit')

# 2. Add Code Series TableHead
old_thead = """                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>"""
new_thead = """                        <TableHead>Type</TableHead>
                        <TableHead>Code Series</TableHead>
                        <TableHead className="text-right">Actions</TableHead>"""
content = content.replace(old_thead, new_thead)

# 3. Add Code Series TableCell
old_type_cell = """                          <TableCell>
                            {role.isSystem ? ("""
new_code_cell = """                          <TableCell>
                            {role.isSystem ? ("""
content = content.replace(old_type_cell, """                          <TableCell className="font-mono text-sm">
                            {role.codeSeries || "-"}
                          </TableCell>\n""" + new_code_cell)

# 4. Add Edit Button
old_actions = """                          <TableCell className="text-right">
                            <Button"""
new_actions = """                          <TableCell className="text-right flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-indigo-600 hover:bg-indigo-50"
                              onClick={() => setEditingRole({
                                name: role.name,
                                description: role.description || "",
                                codeSeries: role.codeSeries || ""
                              })}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button"""
content = content.replace(old_actions, new_actions)

with open('src/app/admin/manage/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
