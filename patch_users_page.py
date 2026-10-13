import re

with open('src/app/admin/users/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update UserType
content = re.sub(
    r'(employeeCode: string \| null;)',
    r'\1\n  fatherName: string | null;\n  joiningDate: string | Date | null;\n  joiningRole: string | null;\n  promotionDate: string | Date | null;',
    content
)

# 2. Update editForm state
content = re.sub(
    r'(const \[editForm, setEditForm\] = useState<\{)',
    r'\1\n    fatherName: string;\n    joiningRole: string;\n    joiningDate: string;',
    content
)
content = re.sub(
    r'(managerIds: \[\] as string\[\],\n  \}\);)',
    r'fatherName: "",\n    joiningRole: "",\n    joiningDate: "",\n    \1',
    content
)

# 3. Add Promote State and Mutation
promote_code = """
  const [promoteUser, setPromoteUser] = useState<UserType | null>(null);
  const [promoteForm, setPromoteForm] = useState({ role: "", date: new Date().toISOString().split('T')[0] });

  const promoteMutation = api.users.promoteEmployee.useMutation({
    onSuccess: () => {
      toast.success("Employee promoted successfully");
      setPromoteUser(null);
      void utils.users.getAllUsers.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
"""
content = content.replace('  const [editUser, setEditUser] = useState<UserType | null>(null);', promote_code + '\n  const [editUser, setEditUser] = useState<UserType | null>(null);')

# 4. Handle Edit Submit
content = re.sub(
    r'(managerIds: editForm\.managerIds,)',
    r'\1\n      fatherName: editForm.fatherName,\n      joiningRole: editForm.joiningRole,\n      joiningDate: editForm.joiningDate ? new Date(editForm.joiningDate) : undefined,',
    content
)

# 5. Populate editForm when opening modal
set_edit_form = """setEditForm({
                  firstName: contextMenu.user.firstName ?? "",
                  lastName: contextMenu.user.lastName ?? "",
                  fatherName: contextMenu.user.fatherName ?? "",
                  email: contextMenu.user.email ?? "",
                  employeeCode: contextMenu.user.employeeCode ?? "",
                  role: contextMenu.user.role ?? "",
                  joiningRole: contextMenu.user.joiningRole ?? "",
                  joiningDate: contextMenu.user.joiningDate ? new Date(contextMenu.user.joiningDate).toISOString().split('T')[0] : "",
                  branchId: contextMenu.user.branchId
                    ? contextMenu.user.branchId.toString()
                    : "none",
                  managerIds: contextMenu.user.managers
                    ? contextMenu.user.managers.map((m: any) => m.manager.manager.id || m.manager.id)
                    : [],
                });"""
content = re.sub(r'setEditForm\(\{\s*firstName: contextMenu\.user\.firstName[^}]+\}\);', set_edit_form, content)

# 6. Add Promote Option to Context Menu
promote_btn = """
            <button
              onClick={() => {
                setPromoteUser(contextMenu.user);
                setPromoteForm({ role: contextMenu.user.role ?? "", date: new Date().toISOString().split('T')[0] });
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Users className="h-4 w-4 text-slate-400" />
              <span>Promote Employee</span>
            </button>
"""
content = content.replace('<span>Edit Details</span>\n            </button>', '<span>Edit Details</span>\n            </button>\n' + promote_btn)

# 7. Add Promote Modal
promote_modal = """
      {/* Promote Modal */}
      {promoteUser && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm duration-200">
          <div className="animate-in zoom-in-95 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl duration-200">
            <h3 className="text-lg font-bold">Promote {promoteUser.firstName}</h3>
            <p className="text-sm text-slate-500 mb-4">Select new role and promotion date. This will automatically update their Employee Code if a series is defined.</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              promoteMutation.mutate({
                userId: promoteUser.id,
                newRole: promoteForm.role,
                promotionDate: new Date(promoteForm.date)
              });
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>New Role</Label>
                <Select value={promoteForm.role} onValueChange={(v) => setPromoteForm({...promoteForm, role: v})}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {roles?.map(r => <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Promotion Date</Label>
                <Input type="date" value={promoteForm.date} onChange={(e) => setPromoteForm({...promoteForm, date: e.target.value})} required className="rounded-xl" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={() => setPromoteUser(null)}>Cancel</Button>
                <Button type="submit" disabled={promoteMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">Promote</Button>
              </div>
            </form>
          </div>
        </div>
      )}
"""
content = content.replace('{editUser && (', promote_modal + '\n      {editUser && (')

# 8. Edit form fields addition (in editUser modal)
edit_fields_patch = """
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Father's Name</Label>
                  <Input value={editForm.fatherName} onChange={(e) => setEditForm({...editForm, fatherName: e.target.value})} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Joining Date</Label>
                  <Input type="date" value={editForm.joiningDate} onChange={(e) => setEditForm({...editForm, joiningDate: e.target.value})} className="rounded-xl" />
                </div>
              </div>
"""
content = content.replace('<div className="grid grid-cols-1 gap-4 md:grid-cols-2">\n                <div className="space-y-2">\n                  <Label className="text-xs font-semibold text-slate-700">\n                    Email Address', edit_fields_patch + '\n              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">\n                <div className="space-y-2">\n                  <Label className="text-xs font-semibold text-slate-700">\n                    Email Address')


# 9. Update AddUserForm
content = re.sub(
    r'(const \[formData, setFormData\] = useState\(\{)',
    r'\1\n    fatherName: "",\n    joiningRole: "",\n    joiningDate: new Date().toISOString().split("T")[0],',
    content
)

add_fields_patch = """
            <div className="space-y-2">
              <Label>Father's Name</Label>
              <Input
                value={formData.fatherName}
                onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Joining Date</Label>
              <Input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Joining Role</Label>
              <Select
                value={formData.joiningRole}
                onValueChange={(v) => setFormData({ ...formData, joiningRole: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select joining role" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {roles?.map((r) => (
                    <SelectItem key={r.name} value={r.name} className="rounded-lg">
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
"""
content = content.replace('          </div>\n\n          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">\n            <div className="space-y-2">\n              <Label>Email Address', add_fields_patch + '\n          </div>\n\n          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">\n            <div className="space-y-2">\n              <Label>Email Address')

# Remove employeeCode from AddUserForm entirely since it's auto-generated
content = re.sub(
    r'<div className="space-y-2">\s*<Label>Employee Code[\s\S]*?</Label>\s*<Input[\s\S]*?value=\{formData\.employeeCode\}[\s\S]*?/>\s*</div>',
    '',
    content
)

# Convert joiningDate string to Date object in AddUserForm submit
content = re.sub(
    r'branchId: formData\.branchId,',
    r'branchId: formData.branchId,\n      joiningDate: formData.joiningDate ? new Date(formData.joiningDate) : undefined,',
    content
)


with open('src/app/admin/users/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
