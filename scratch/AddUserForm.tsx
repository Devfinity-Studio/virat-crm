function AddUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
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


  const { data: branches } = api.inventory.getBranches.useQuery();
  const { data: managers } = api.hierarchy.getManagers.useQuery();
  const { data: roles } = api.roles.getAll.useQuery();

  const mutation = api.users.createUser.useMutation({
    onSuccess: () => {
      toast.success("Employee created successfully");
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.branchId === undefined) {
      toast.error("Please select a branch");
      return;
    }
    mutation.mutate({
      ...formData,
      branchId: formData.branchId,
      joiningDate: formData.joiningDate ? new Date(formData.joiningDate) : undefined,
      dob: formData.dob ? new Date(formData.dob) : undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Details</CardTitle>
        <CardDescription>
          Enter information to create a new system user
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>
            
          </div>

          <div className="space-y-2">
            <Label>Initial Password</Label>
            <div className="relative">
              <Key className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                type="password"
                className="pl-9"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(v: string) =>
                  setFormData({ ...formData, role: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((r) => (
                    <SelectItem key={r.name} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Branch</Label>
              <Select
                value={formData.branchId?.toString()}
                onValueChange={(v) =>
                  setFormData({ ...formData, branchId: parseInt(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches?.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reporting Managers</Label>
              <div className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                {managers?.map((m) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={formData.managerIds.includes(m.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            managerIds: [...formData.managerIds, m.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            managerIds: formData.managerIds.filter(
                              (id) => id !== m.id,
                            ),
                          });
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <span className="text-sm text-slate-700">
                      {m.firstName} {m.lastName}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Creating..." : "Create Employee Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}