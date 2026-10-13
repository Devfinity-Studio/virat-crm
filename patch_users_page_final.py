import re

with open('src/app/admin/users/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix AddUserForm duplicated fields and add dob
add_form_state_find = """  const [formData, setFormData] = useState({
    fatherName: "",
    joiningRole: "",
    joiningDate: new Date().toISOString().split("T")[0],
    firstName: "",
    lastName: "",
    email: "",
    employeeCode: "",
    password: "",
    role: "Employee",
    branchId: undefined as number | undefined,
    fatherName: "",
    joiningRole: "",
    joiningDate: "",
    managerIds: [] as string[],
  });"""
add_form_state_replace = """  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    fatherName: "",
    email: "",
    password: "",
    role: "Employee",
    joiningRole: "Employee",
    joiningDate: new Date().toISOString().split("T")[0],
    dob: "",
    branchId: undefined as number | undefined,
    managerIds: [] as string[],
  });
  
  const { data: nextCode } = api.users.getNextEmployeeCode.useQuery({ role: formData.role }, { enabled: !!formData.role });
"""
content = content.replace(add_form_state_find, add_form_state_replace)

# Add ecode visual block and DOB field to AddUserForm
add_fields_find = """            <div className="space-y-2">
              <Label>Joining Role</Label>"""
add_fields_replace = """            <div className="space-y-2">
              <Label>Employee Code</Label>
              <Input
                value={nextCode || "Generating..."}
                disabled
                className="rounded-xl bg-slate-50 text-slate-500 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Joining Role</Label>"""
content = content.replace(add_fields_find, add_fields_replace)

# Submit mutation changes for AddUserForm
submit_find = """      branchId: formData.branchId,
      joiningDate: formData.joiningDate ? new Date(formData.joiningDate) : undefined,
    });"""
submit_replace = """      branchId: formData.branchId,
      joiningDate: formData.joiningDate ? new Date(formData.joiningDate) : undefined,
      dob: formData.dob ? new Date(formData.dob) : undefined,
    });"""
content = content.replace(submit_find, submit_replace)


# Update UserType
type_find = """  fatherName: string | null;
  joiningDate: string | Date | null;
  joiningRole: string | null;
  promotionDate: string | Date | null;"""
type_replace = """  fatherName: string | null;
  joiningDate: string | Date | null;
  joiningRole: string | null;
  promotionDate: string | Date | null;
  dob: string | Date | null;"""
content = content.replace(type_find, type_replace)


# Update editForm state
edit_form_state_find = """  const [editForm, setEditForm] = useState<{
    fatherName: string;
    joiningRole: string;
    joiningDate: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeCode: string;
    role: string;
    branchId: string;
    managerIds: string[];
  }>({
    fatherName: "",
    joiningRole: "",
    joiningDate: "",
    firstName: "",
    lastName: "",
    email: "",
    employeeCode: "",
    role: "",
    branchId: "none",
    managerIds: [],
  });"""
edit_form_state_replace = """  const [editForm, setEditForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    employeeCode: string;
    role: string;
    branchId: string;
    managerIds: string[];
    fatherName: string;
    joiningRole: string;
    joiningDate: string;
    dob: string;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    employeeCode: "",
    role: "",
    branchId: "none",
    managerIds: [],
    fatherName: "",
    joiningRole: "",
    joiningDate: "",
    dob: "",
  });"""
content = content.replace(edit_form_state_find, edit_form_state_replace)

# Set editForm
set_edit_form_find = """                  joiningDate: contextMenu.user.joiningDate ? new Date(contextMenu.user.joiningDate).toISOString().split('T')[0] : "",
                  branchId: contextMenu.user.branchId"""
set_edit_form_replace = """                  joiningDate: contextMenu.user.joiningDate ? new Date(contextMenu.user.joiningDate).toISOString().split('T')[0] : "",
                  dob: contextMenu.user.dob ? new Date(contextMenu.user.dob).toISOString().split('T')[0] : "",
                  branchId: contextMenu.user.branchId"""
content = content.replace(set_edit_form_find, set_edit_form_replace)

# Edit mutation submit
edit_submit_find = """      joiningRole: editForm.joiningRole,
      joiningDate: editForm.joiningDate ? new Date(editForm.joiningDate) : undefined,
    });"""
edit_submit_replace = """      joiningRole: editForm.joiningRole,
      joiningDate: editForm.joiningDate ? new Date(editForm.joiningDate) : undefined,
      dob: editForm.dob ? new Date(editForm.dob) : undefined,
    });"""
content = content.replace(edit_submit_find, edit_submit_replace)

# Edit form JSX
edit_jsx_find = """                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Joining Date</Label>
                  <Input type="date" value={editForm.joiningDate} onChange={(e) => setEditForm({...editForm, joiningDate: e.target.value})} className="rounded-xl" />
                </div>
              </div>"""
edit_jsx_replace = """                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Joining Date</Label>
                  <Input type="date" value={editForm.joiningDate} onChange={(e) => setEditForm({...editForm, joiningDate: e.target.value})} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Date of Birth</Label>
                  <Input type="date" value={editForm.dob} onChange={(e) => setEditForm({...editForm, dob: e.target.value})} className="rounded-xl" />
                </div>
              </div>"""
content = content.replace(edit_jsx_find, edit_jsx_replace)

with open('src/app/admin/users/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
