import re

with open('src/app/admin/manage/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add preview queries for formData (Create) and editingRole (Update)
query_hook = """
  const handleCreate = (e: React.FormEvent) => {
"""
query_hook_replace = """
  const { data: createPreview } = api.users.previewNextEmployeeCode.useQuery(
    { series: formData.codeSeries },
    { enabled: !!formData.codeSeries }
  );

  const { data: editPreview } = api.users.previewNextEmployeeCode.useQuery(
    { series: editingRole?.codeSeries ?? "" },
    { enabled: !!editingRole?.codeSeries }
  );

  const handleCreate = (e: React.FormEvent) => {
"""
content = content.replace(query_hook, query_hook_replace)


# Add preview text under Create Form Input
create_input = """                <div className="space-y-2">
                  <Label>Code Series Prefix</Label>
                  <Input
                    placeholder="e.g. MGR-"
                    value={formData.codeSeries}
                    onChange={(e) => setFormData({ ...formData, codeSeries: e.target.value })}
                  />
                </div>"""
create_input_replace = """                <div className="space-y-2">
                  <Label>Code Series Prefix</Label>
                  <Input
                    placeholder="e.g. MGR-"
                    value={formData.codeSeries}
                    onChange={(e) => setFormData({ ...formData, codeSeries: e.target.value })}
                  />
                  {formData.codeSeries && (
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      Next Code: {createPreview || "Generating..."}
                    </p>
                  )}
                </div>"""
content = content.replace(create_input, create_input_replace)

# Add preview text under Edit Form Input
edit_input = """                  <div className="space-y-2">
                    <Label>Code Series Prefix</Label>
                    <Input
                      placeholder="e.g. MGR-"
                      value={editingRole.codeSeries}
                      onChange={(e) => setEditingRole({ ...editingRole, codeSeries: e.target.value })}
                    />
                  </div>"""
edit_input_replace = """                  <div className="space-y-2">
                    <Label>Code Series Prefix</Label>
                    <Input
                      placeholder="e.g. MGR-"
                      value={editingRole.codeSeries}
                      onChange={(e) => setEditingRole({ ...editingRole, codeSeries: e.target.value })}
                    />
                    {editingRole.codeSeries && (
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        Next Code: {editPreview || "Generating..."}
                      </p>
                    )}
                  </div>"""
content = content.replace(edit_input, edit_input_replace)

with open('src/app/admin/manage/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
