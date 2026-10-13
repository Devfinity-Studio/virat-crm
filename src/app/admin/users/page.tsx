"use client";

import { DashboardLayout } from "@/app/_components/layout/DashboardLayout";
import { FeatureGate } from "@/app/_components/auth/FeatureGate";
import { AddUserForm } from "./AddUserForm";
import { api } from "@/trpc/react";
import {
  Users,
  UserPlus,
  List,
  Loader2,
  Key,
  XCircle,
  CheckCircle2,
  MapPin,
  BarChart3,
  Lock,
  Edit,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function UsersAdminPage() {
  const [activeTab, setActiveTab] = useState("list");

  return (
    <DashboardLayout>
      <FeatureGate featureKey="admin">
        <div className="flex flex-col space-y-6">
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:flex-row md:items-center">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                <Users className="h-6 w-6 text-indigo-600" />
                User Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Create new employees, assign roles, and manage credentials.
              </p>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="mb-4 flex items-center justify-between">
              <TabsList className="border border-slate-200 bg-slate-100/50 p-1">
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  Employee List
                </TabsTrigger>
                <TabsTrigger value="add" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add New Employee
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="mt-0">
              <UserList />
            </TabsContent>

            <TabsContent value="add" className="mx-auto mt-0 max-w-2xl">
              <AddUserForm onSuccess={() => setActiveTab("list")} />
            </TabsContent>
          </Tabs>
        </div>
      </FeatureGate>
    </DashboardLayout>
  );
}

interface UserType {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  employeeCode: string | null;
  fatherName: string | null;
  joiningDate: string | Date | null;
  joiningRole: string | null;
  promotionDate: string | Date | null;
  dob: string | Date | null;
  role: string | null;
  branchId: number | null;
  isActive: boolean;
  branch?: { id: number; name: string } | null;
  managers?:
    | {
        manager: {
          id: string;
          firstName: string | null;
          lastName: string | null;
        };
      }[]
    | null;
}

function UserList() {
  const router = useRouter();
  const utils = api.useUtils();

  const { data: users, isLoading } = api.users.getAllUsers.useQuery();
  const { data: branches } = api.inventory.getBranches.useQuery();
  const { data: roles } = api.roles.getAll.useQuery();

  const [statusFilter, setStatusFilter] = useState<
    "Active" | "Inactive" | "All"
  >("Active");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [branchFilter, setBranchFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    user: UserType;
  } | null>(null);
  const [resetUser, setResetUser] = useState<UserType | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const toggleActiveMutation = api.users.toggleActiveStatus.useMutation({
    onSuccess: () => {
      toast.success("User active status updated");
      void utils.users.getAllUsers.invalidate();
    },
    onError: (err) => {
      toast.error(`Error updating status: ${err.message}`);
    },
  });

  const resetPasswordMutation = api.users.resetUserPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset successfully");
      setResetUser(null);
      setNewPassword("");
    },
    onError: (err) => {
      toast.error(`Error resetting password: ${err.message}`);
    },
  });


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

  const [editUser, setEditUser] = useState<UserType | null>(null);
  const [editForm, setEditForm] = useState<{
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
    firstName: "",
    lastName: "",
    email: "",
    employeeCode: "",
    role: "",
    branchId: "none",
    managerIds: [],
  });

  const updateUserMutation = api.users.updateUser.useMutation({
    onSuccess: () => {
      toast.success("Employee details updated successfully");
      setEditUser(null);
      void utils.users.getAllUsers.invalidate();
    },
    onError: (err) => {
      toast.error(`Error updating details: ${err.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleContextMenu = (e: React.MouseEvent, user: UserType) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      user,
    });
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    resetPasswordMutation.mutate({
      userId: resetUser.id,
      newPassword,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    if (
      !editForm.firstName.trim() ||
      !editForm.lastName.trim() ||
      !editForm.email.trim() ||
      !editForm.employeeCode.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    updateUserMutation.mutate({
      userId: editUser.id,
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      email: editForm.email,
      employeeCode: editForm.employeeCode,
      role: editForm.role,
      branchId:
        editForm.branchId === "none" ? null : parseInt(editForm.branchId, 10),
      managerIds: editForm.managerIds,
      fatherName: editForm.fatherName,
      joiningRole: editForm.joiningRole,
      joiningDate: editForm.joiningDate ? new Date(editForm.joiningDate) : undefined,
      dob: editForm.dob ? new Date(editForm.dob) : undefined,
    });
  };

  const filteredUsers = users?.filter((user) => {
    // 1. Status Filter
    if (statusFilter === "Active" && !user.isActive) return false;
    if (statusFilter === "Inactive" && user.isActive) return false;

    // 2. Role Filter
    if (roleFilter !== "All" && user.role !== roleFilter) return false;

    // 3. Branch Filter
    if (branchFilter !== "All" && user.branchId?.toString() !== branchFilter)
      return false;

    // 4. Search Query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const fullName =
        `${user.firstName ?? ""} ${user.lastName ?? ""}`.toLowerCase();
      const code = (user.employeeCode ?? "").toLowerCase();
      const email = (user.email ?? "").toLowerCase();
      return (
        fullName.includes(query) ||
        code.includes(query) ||
        email.includes(query)
      );
    }

    return true;
  });

  return (
    <>
      <Card className="overflow-hidden border border-slate-200/80 shadow-md">
        {/* Responsive Glassmorphic Category Filter Bar */}
        <div className="border-slate-150 grid grid-cols-1 items-end gap-4 border-b bg-slate-50/50 p-5 sm:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold tracking-widest text-slate-500 uppercase">
              Search Employee
            </Label>
            <Input
              placeholder="Search by name, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border-slate-200 bg-white focus-visible:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold tracking-widest text-slate-500 uppercase">
              Active Status
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(v: "Active" | "Inactive" | "All") =>
                setStatusFilter(v)
              }
            >
              <SelectTrigger className="rounded-xl border-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="Active" className="rounded-lg">
                  Active Only
                </SelectItem>
                <SelectItem value="Inactive" className="rounded-lg">
                  Inactive Only
                </SelectItem>
                <SelectItem value="All" className="rounded-lg">
                  All Employees
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold tracking-widest text-slate-500 uppercase">
              Role Type
            </Label>
            <Select
              value={roleFilter}
              onValueChange={(v: string) => setRoleFilter(v)}
            >
              <SelectTrigger className="rounded-xl border-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="All" className="rounded-lg">
                  All Roles
                </SelectItem>
                {roles?.map((r) => (
                  <SelectItem
                    key={r.name}
                    value={r.name}
                    className="rounded-lg"
                  >
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold tracking-widest text-slate-500 uppercase">
              Branch Location
            </Label>
            <Select
              value={branchFilter}
              onValueChange={(v: string) => setBranchFilter(v)}
            >
              <SelectTrigger className="rounded-xl border-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="All" className="rounded-lg">
                  All Branches
                </SelectItem>
                {branches?.map((b) => (
                  <SelectItem
                    key={b.id}
                    value={b.id.toString()}
                    className="rounded-lg"
                  >
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-slate-100 bg-slate-50/70">
                <TableRow>
                  <TableHead className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Code
                  </TableHead>
                  <TableHead className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Role
                  </TableHead>
                  <TableHead className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Branch
                  </TableHead>
                  <TableHead className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Manager
                  </TableHead>
                  <TableHead className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center font-medium text-slate-400 italic"
                    >
                      No employees match your selected categories.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers?.map((user) => (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer border-b border-slate-100/60 transition-colors select-none hover:bg-slate-50/50"
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                      onContextMenu={(e) => handleContextMenu(e, user)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {user.firstName} {user.lastName}
                          </span>
                          <span className="text-xs font-normal text-slate-400">
                            {user.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="rounded-lg border border-slate-200/50 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                          {user.employeeCode}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "Admin"
                              ? "default"
                              : user.role === "Manager"
                                ? "secondary"
                                : "outline"
                          }
                          className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-600">
                        {user.branch?.name ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-500">
                        {user.managers && user.managers.length > 0
                          ? user.managers
                              .map(
                                (m) =>
                                  `${m.manager.firstName} ${m.manager.lastName}`,
                              )
                              .join(", ")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-green-700 uppercase">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-red-700 uppercase">
                            Inactive
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Absolute context menu overlay */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="animate-in fade-in slide-in-from-top-2 fixed z-50 min-w-[210px] rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-2xl backdrop-blur-md duration-100"
            style={{
              left: Math.min(
                contextMenu.x,
                typeof window !== "undefined"
                  ? window.innerWidth - 230
                  : contextMenu.x,
              ),
              top: Math.min(
                contextMenu.y,
                typeof window !== "undefined"
                  ? window.innerHeight - 200
                  : contextMenu.y,
              ),
            }}
          >
            <div className="mb-1 border-b border-slate-100 px-3 py-1.5">
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Employee Options
              </p>
              <p className="truncate text-xs font-bold text-slate-700">
                {contextMenu.user.firstName} {contextMenu.user.lastName}
              </p>
            </div>

            <button
              onClick={() => {
                toggleActiveMutation.mutate({
                  userId: contextMenu.user.id,
                  isActive: !contextMenu.user.isActive,
                });
                setContextMenu(null);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors",
                contextMenu.user.isActive
                  ? "text-red-600 hover:bg-red-50"
                  : "text-green-600 hover:bg-green-50",
              )}
            >
              {contextMenu.user.isActive ? (
                <>
                  <XCircle className="h-4 w-4" />
                  <span>Set as Inactive</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Set as Active</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                router.push(`/admin/live-map?userId=${contextMenu.user.id}`);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>Locate on Map</span>
            </button>

            <button
              onClick={() => {
                router.push(`/admin/reports?userId=${contextMenu.user.id}`);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <BarChart3 className="h-4 w-4 text-slate-400" />
              <span>View Reports</span>
            </button>

            <button
              onClick={() => {
                setEditUser(contextMenu.user);
                setEditForm({
                  firstName: contextMenu.user.firstName ?? "",
                  lastName: contextMenu.user.lastName ?? "",
                  fatherName: contextMenu.user.fatherName ?? "",
                  email: contextMenu.user.email ?? "",
                  employeeCode: contextMenu.user.employeeCode ?? "",
                  role: contextMenu.user.role ?? "",
                  joiningRole: contextMenu.user.joiningRole ?? "",
                  joiningDate: contextMenu.user.joiningDate ? new Date(contextMenu.user.joiningDate).toISOString().split('T')[0] : "",
                  dob: contextMenu.user.dob ? new Date(contextMenu.user.dob).toISOString().split('T')[0] : "",
                  branchId: contextMenu.user.branchId
                    ? contextMenu.user.branchId.toString()
                    : "none",
                  managerIds: contextMenu.user.managers
                    ? contextMenu.user.managers.map((m: any) => m.manager.manager.id || m.manager.id)
                    : [],
                });
                setContextMenu(null);
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-xl border-t border-slate-100 px-3 py-2 pt-1.5 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Edit className="h-4 w-4 text-slate-400" />
              <span>Edit Details</span>
            </button>

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


            <button
              onClick={() => {
                setResetUser(contextMenu.user);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Lock className="h-4 w-4 text-slate-400" />
              <span>Reset Password</span>
            </button>
          </div>
        </>
      )}

      {/* Password reset modal overlay */}
      {resetUser && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm duration-200">
          <div className="animate-in zoom-in-95 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl duration-200">
            <div className="mb-4 flex items-center gap-3 text-indigo-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                <Lock className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Reset Password</h3>
                <p className="text-xs text-slate-500">
                  For {resetUser.firstName} {resetUser.lastName}
                </p>
              </div>
            </div>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute top-3 left-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="rounded-xl border-slate-200 bg-slate-50/50 pl-9 focus-visible:ring-indigo-500"
                    autoFocus
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setResetUser(null);
                    setNewPassword("");
                  }}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="rounded-xl bg-indigo-600 px-4 font-semibold text-white shadow-md hover:bg-indigo-700"
                >
                  {resetPasswordMutation.isPending
                    ? "Saving..."
                    : "Update Password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      
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

      {editUser && (
        <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm duration-200">
          <div className="animate-in zoom-in-95 my-8 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl duration-200">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4 text-indigo-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
                <Edit className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Edit Employee Details
                </h3>
                <p className="text-xs text-slate-500">
                  Update workspace info, branch, role, or manager settings.
                </p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={editForm.firstName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, firstName: e.target.value })
                    }
                    placeholder="First Name"
                    className="rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, lastName: e.target.value })
                    }
                    placeholder="Last Name"
                    className="rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Father's Name</Label>
                  <Input value={editForm.fatherName} onChange={(e) => setEditForm({...editForm, fatherName: e.target.value})} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Joining Date</Label>
                  <Input type="date" value={editForm.joiningDate} onChange={(e) => setEditForm({...editForm, joiningDate: e.target.value})} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Date of Birth</Label>
                  <Input type="date" value={editForm.dob} onChange={(e) => setEditForm({...editForm, dob: e.target.value})} className="rounded-xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    placeholder="email@company.com"
                    className="rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Employee Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={editForm.employeeCode}
                    onChange={(e) =>
                      setEditForm({ ...editForm, employeeCode: e.target.value })
                    }
                    placeholder="EMP-12345"
                    className="rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Functional Role <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(v) => setEditForm({ ...editForm, role: v })}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {roles?.map((r) => (
                        <SelectItem
                          key={r.name}
                          value={r.name}
                          className="rounded-lg"
                        >
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Office Branch
                  </Label>
                  <Select
                    value={editForm.branchId}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, branchId: v })
                    }
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 bg-slate-50/50">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem
                        value="none"
                        className="rounded-lg text-slate-400 italic"
                      >
                        No Branch (N/A)
                      </SelectItem>
                      {branches?.map((b) => (
                        <SelectItem
                          key={b.id}
                          value={b.id.toString()}
                          className="rounded-lg"
                        >
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Reporting Managers
                  </Label>
                  <div className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    {users
                      ?.filter(
                        (u) => u.id !== editUser?.id && u.role !== "Employee",
                      ) // Exclude self & non-managers to keep hierarchy logical
                      ?.map((u) => (
                        <label
                          key={u.id}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={editForm.managerIds.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditForm({
                                  ...editForm,
                                  managerIds: [...editForm.managerIds, u.id],
                                });
                              } else {
                                setEditForm({
                                  ...editForm,
                                  managerIds: editForm.managerIds.filter(
                                    (id) => id !== u.id,
                                  ),
                                });
                              }
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                          />
                          <span className="text-sm text-slate-700">
                            {u.firstName} {u.lastName} ({u.role})
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditUser(null)}
                  className="rounded-xl font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="rounded-xl bg-indigo-600 px-6 font-semibold text-white shadow-md hover:bg-indigo-700"
                >
                  {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

