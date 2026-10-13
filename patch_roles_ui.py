with open('src/app/admin/roles/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State
content = content.replace('const [formData, setFormData] = useState({ name: "", description: "" });', 'const [formData, setFormData] = useState({ name: "", description: "", codeSeries: "" });\\n  const [editingRole, setEditingRole] = useState<{name: string, description: string, codeSeries: string} | null>(null);')

# 2. Update mutation
update_mutation = """  const updateMutation = api.roles.update.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully");
      setEditingRole(null);
      void utils.roles.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });"""
content = content.replace('  const deleteMutation', update_mutation + '\\n\\n  const deleteMutation')

# 3. Create mutation payload
content = content.replace('setFormData({ name: "", description: "" });', 'setFormData({ name: "", description: "", codeSeries: "" });')

# 4. Form inputs (Create)
create_inputs = """                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Role Name</Label>
                    <Input
                      placeholder="e.g. Supervisor"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Code Series Prefix</Label>
                    <Input
                      placeholder="e.g. SUP-"
                      value={formData.codeSeries}
                      onChange={(e) => setFormData({ ...formData, codeSeries: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Optional description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>"""
old_create_inputs = """                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Role Name</Label>
                    <Input
                      placeholder="e.g. Supervisor"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Optional description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                    />
                  </div>
                </div>"""
content = content.replace(old_create_inputs, create_inputs)

# 5. Table Headers
content = content.replace('<TableHead>Description</TableHead>\n                        <TableHead>System Role</TableHead>\n                        <TableHead className="text-right">Actions</TableHead>', '<TableHead>Code Series</TableHead>\n                        <TableHead>Description</TableHead>\n                        <TableHead>System Role</TableHead>\n                        <TableHead className="text-right">Actions</TableHead>')

# 6. Table Cells
table_cells = """                        <TableCell>
                          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                            {role.codeSeries || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {role.description || "-"}
                        </TableCell>"""
content = content.replace('                        <TableCell className="text-slate-500">\n                          {role.description || "-"}\n                        </TableCell>', table_cells)

# 7. Edit Button & Modal
edit_modal = """          {/* Edit Role Modal */}
          {editingRole && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                <h3 className="text-lg font-bold">Edit Role: {editingRole.name}</h3>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateMutation.mutate(editingRole);
                  }}
                  className="space-y-4 mt-4"
                >
                  <div className="space-y-2">
                    <Label>Code Series Prefix</Label>
                    <Input
                      placeholder="e.g. MGR-"
                      value={editingRole.codeSeries}
                      onChange={(e) => setEditingRole({ ...editingRole, codeSeries: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={editingRole.description}
                      onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setEditingRole(null)}>Cancel</Button>
                    <Button type="submit" disabled={updateMutation.isPending}>Save</Button>
                  </div>
                </form>
              </div>
            </div>
          )}"""
content = content.replace('        </div>\n      </FeatureGate>', edit_modal + '\n        </div>\n      </FeatureGate>')

# 8. Edit action button
actions = """                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingRole({ name: role.name, description: role.description || "", codeSeries: role.codeSeries || "" })}
                            >
                              Edit
                            </Button>
                            {!role.isSystem && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => deleteMutation.mutate({ name: role.name })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>"""
old_actions = """                          {!role.isSystem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() =>
                                deleteMutation.mutate({ name: role.name })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}"""
content = content.replace(old_actions, actions)

with open('src/app/admin/roles/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
