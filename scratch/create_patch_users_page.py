import os

content = """\"\"\"use client\"\"\";

import { DashboardLayout } from "@/app/_components/layout/DashboardLayout";
import { FeatureGate } from "@/app/_components/auth/FeatureGate";
import { api } from "@/trpc/react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, User, Key, MapPin, Briefcase, FileText, Download, Shield, Edit, X, Trash2, Check, Pencil, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState, use, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { GenericUploader, UploadedFile } from "@/app/_components/ui/GenericUploader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

export default function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  
  const utils = api.useUtils();
  const { data: user, isLoading } = api.users.getUserById.useQuery({ id });
  const { data: currentUser } = api.users.getMe.useQuery();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Developer";
  
  const { data: branches } = api.inventory.getBranches.useQuery();
  const { data: managers } = api.hierarchy.getManagers.useQuery();
  const { data: roles } = api.roles.getAll.useQuery();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [editData, setEditData] = useState<any>({});
  
  useEffect(() => {
    if (user && !isEditMode) {
      setEditData({
        firstName: user.firstName,
        lastName: user.lastName,
        fatherName: user.fatherName || "",
        email: user.email,
        employeeCode: user.employeeCode,
        role: user.role,
        branchId: user.branchId?.toString() || "",
        joiningDate: user.joiningDate ? new Date(user.joiningDate).toISOString().split('T')[0] : "",
        dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : "",
        managerIds: user.managers?.map((m: any) => m.manager.id) || [],
      });
    }
  }, [user, isEditMode]);

  const updatePasswordMutation = api.users.updateUserPassword.useMutation({
    onSuccess: () => {
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      toast.error(`Failed to update password: ${err.message}`);
    }
  });

  const updateUserMutation = api.users.updateUser.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setIsEditMode(false);
      utils.users.getUserById.invalidate({ id });
    },
    onError: (err) => {
      toast.error(`Failed to update profile: ${err.message}`);
    }
  });

  const updatePhotoMutation = api.users.updateUserProfilePhoto.useMutation({
    onSuccess: () => {
      toast.success("Profile photo updated");
      utils.users.getUserById.invalidate({ id });
    },
    onError: (err) => {
      toast.error(`Failed to update photo: ${err.message}`);
    }
  });

  const addDocMutation = api.users.addUserDocument.useMutation({
    onSuccess: () => {
      toast.success("Document added");
      utils.users.getUserById.invalidate({ id });
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteDocMutation = api.users.deleteUserDocument.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      utils.users.getUserById.invalidate({ id });
    },
    onError: (err) => toast.error(err.message)
  });

  const renameDocMutation = api.users.renameUserDocument.useMutation({
    onSuccess: () => {
      toast.success("Document renamed");
      setEditingDocId(null);
      utils.users.getUserById.invalidate({ id });
    },
    onError: (err) => toast.error(err.message)
  });

  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [editingDocName, setEditingDocName] = useState("");

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] flex-col items-center justify-center space-y-4 text-slate-500">
          <User className="h-12 w-12 opacity-50" />
          <p>Employee not found</p>
          <Button variant="outline" onClick={() => router.push("/admin/users")}>Back to Employees</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    updatePasswordMutation.mutate({ userId: user.id, newPassword });
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserMutation.mutate({
      userId: user.id,
      ...editData,
      branchId: editData.branchId ? parseInt(editData.branchId) : null,
      joiningDate: editData.joiningDate ? new Date(editData.joiningDate) : undefined,
      dob: editData.dob ? new Date(editData.dob) : undefined,
    });
  };

  return (
    <DashboardLayout>
      <FeatureGate featureKey="admin">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/admin/users")} className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Employee Profile
                <Badge variant={user.isActive ? "default" : "destructive"} className={user.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </h1>
            </div>
            {isAdmin && !isEditMode && (
              <Button onClick={() => setIsEditMode(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
            {isAdmin && isEditMode && (
              <Button variant="outline" onClick={() => setIsEditMode(false)} className="gap-2">
                <X className="h-4 w-4" />
                Cancel Edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Basic Info & Actions */}
            <div className="space-y-6">
              <Card className="border-slate-200/60 shadow-sm overflow-hidden">
                <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600" />
                <CardContent className="pt-0 relative px-6 pb-6">
                  <div className="absolute -top-12 left-6 border-4 border-white rounded-full bg-white shadow-md group">
                    {user.profilePhoto ? (
                      <img src={user.profilePhoto} alt="Profile" className="h-24 w-24 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
                        <User className="h-10 w-10 text-slate-400" />
                      </div>
                    )}
                    {isAdmin && (
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <GenericUploader 
                          label="" 
                          accept="image/*"
                          className="opacity-0 absolute inset-0 cursor-pointer"
                          onUploadComplete={(f) => updatePhotoMutation.mutate({ userId: user.id, profilePhoto: f.url })} 
                        />
                        <Edit className="h-6 w-6 text-white pointer-events-none" />
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-14 space-y-1">
                    <h2 className="text-xl font-bold text-slate-900">{user.firstName} {user.lastName}</h2>
                    <p className="text-sm text-slate-500">{user.email}</p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <Badge variant="outline" className="font-mono bg-slate-50">{user.employeeCode}</Badge>
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">{user.role}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Change Password Card */}
              {isAdmin && (
                <Card className="border-slate-200/60 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                      <Key className="h-4 w-4 text-amber-500" />
                      Change Password
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordUpdate} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">New Password</Label>
                        <Input
                          type="password"
                          placeholder="Min. 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="rounded-xl bg-slate-50/50"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Confirm Password</Label>
                        <Input
                          type="password"
                          placeholder="Must match"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="rounded-xl bg-slate-50/50"
                          required
                        />
                      </div>
                      <Button type="submit" disabled={updatePasswordMutation.isPending || newPassword !== confirmPassword || newPassword.length < 6} className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                        {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Details & Documents */}
            <div className="md:col-span-2 space-y-6">
              <Card className="border-slate-200/60 shadow-sm transition-all">
                <CardHeader className="pb-3 border-b border-slate-100 mb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                    <Briefcase className="h-4 w-4 text-indigo-500" />
                    Employment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditMode ? (
                    <form id="edit-profile-form" onSubmit={handleProfileUpdate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input value={editData.firstName} onChange={e => setEditData({...editData, firstName: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input value={editData.lastName} onChange={e => setEditData({...editData, lastName: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Employee Code</Label>
                        <Input value={editData.employeeCode} onChange={e => setEditData({...editData, employeeCode: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Father's Name</Label>
                        <Input value={editData.fatherName} onChange={e => setEditData({...editData, fatherName: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={editData.role} onValueChange={(v) => setEditData({ ...editData, role: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {roles?.map(r => <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Branch</Label>
                        <Select value={editData.branchId} onValueChange={(v) => setEditData({ ...editData, branchId: v })}>
                          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {branches?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Joining Date</Label>
                        <Input type="date" value={editData.joiningDate} onChange={e => setEditData({...editData, joiningDate: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Date of Birth</Label>
                        <Input type="date" value={editData.dob} onChange={e => setEditData({...editData, dob: e.target.value})} />
                      </div>
                      <div className="space-y-2 col-span-1 sm:col-span-2 mt-4 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsEditMode(false)}>Cancel</Button>
                        <Button type="submit" disabled={updateUserMutation.isPending}>Save Changes</Button>
                      </div>
                    </form>
                  ) : (
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                      <div>
                        <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Branch Location</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900 flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {user.branch?.name ?? "N/A"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Managers</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900 flex flex-wrap gap-2">
                          {user.managers && user.managers.length > 0
                            ? user.managers.map((m: any) => (
                                <Link key={m.manager.id} href={`/admin/users/${m.manager.id}`} className="hover:underline text-indigo-600">
                                  {m.manager.firstName} {m.manager.lastName}
                                </Link>
                              ))
                            : "None"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Joining Date</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">
                          {user.joiningDate ? format(new Date(user.joiningDate), 'MMMM d, yyyy') : "N/A"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Father's Name</dt>
                        <dd className="mt-1 text-sm font-medium text-slate-900">
                          {user.fatherName ?? "N/A"}
                        </dd>
                      </div>
                    </dl>
                  )}
                </CardContent>
              </Card>
              
              {/* Team Members */}
              {user.teamMembers && user.teamMembers.length > 0 && (
                <Card className="border-slate-200/60 shadow-sm">
                  <CardHeader className="pb-3 border-b border-slate-100 mb-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                      <Users className="h-4 w-4 text-indigo-500" />
                      Team Members ({user.teamMembers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {user.teamMembers.map((tm: any) => (
                         <Link key={tm.user.id} href={`/admin/users/${tm.user.id}`}>
                           <div className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50 hover:bg-white transition-colors cursor-pointer">
                             {tm.user.profilePhoto ? (
                               <img src={tm.user.profilePhoto} className="h-8 w-8 rounded-full object-cover" alt="" />
                             ) : (
                               <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"><User className="h-4 w-4" /></div>
                             )}
                             <div>
                               <p className="text-sm font-medium text-slate-900">{tm.user.firstName} {tm.user.lastName}</p>
                               <p className="text-xs text-slate-500">{tm.user.role}</p>
                             </div>
                           </div>
                         </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Documents */}
              <Card className="border-slate-200/60 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 mb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                    <FileText className="h-4 w-4 text-indigo-500" />
                    Documents
                  </CardTitle>
                  {isAdmin && (
                    <div className="relative">
                      <GenericUploader 
                        label="Upload Document" 
                        accept="application/pdf,image/*"
                        className="py-1 px-3 h-auto text-xs"
                        onUploadComplete={(f) => {
                          addDocMutation.mutate({
                            userId: user.id,
                            name: f.name,
                            url: f.url,
                            key: f.key,
                            mimeType: f.mimeType,
                            size: f.size
                          });
                        }} 
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {!user.documents || user.documents.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-500 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No documents uploaded for this employee.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {user.documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-colors">
                          <div className="flex items-center gap-3 overflow-hidden flex-1">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                              <FileText className="h-5 w-5" />
                            </div>
                            
                            {editingDocId === doc.id ? (
                              <div className="flex items-center gap-1 w-full mr-2">
                                <Input 
                                  value={editingDocName} 
                                  onChange={e => setEditingDocName(e.target.value)}
                                  className="h-8 text-sm"
                                />
                                <Button 
                                  variant="ghost" size="icon" className="h-8 w-8 text-green-600"
                                  onClick={() => renameDocMutation.mutate({ id: doc.id, name: editingDocName })}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" size="icon" className="h-8 w-8 text-slate-400"
                                  onClick={() => setEditingDocId(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="truncate pr-2">
                                <p className="text-sm font-medium text-slate-900 truncate" title={doc.name}>{doc.name}</p>
                                <p className="text-xs text-slate-500">Document</p>
                              </div>
                            )}
                          </div>
                          
                          {editingDocId !== doc.id && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                              {isAdmin && (
                                <>
                                  <Button 
                                    variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                                    onClick={() => { setEditingDocId(doc.id); setEditingDocName(doc.name); }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      if(confirm("Are you sure you want to delete this document?")) {
                                        deleteDocMutation.mutate({ id: doc.id });
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Active Sessions */}
              <Card className="border-slate-200/60 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 mb-4">
                  <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                    <Shield className="h-4 w-4 text-indigo-500" />
                    Active Sessions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Devices where this user is currently logged in.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="py-6 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-slate-600 font-medium">Session tracking is simulated</p>
                    <p className="text-xs mt-1">This user currently has no active sessions tracked.</p>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </FeatureGate>
    </DashboardLayout>
  );
}
"""
with open('scratch/patch_users_page.py', 'w') as f:
    f.write(f"with open('src/app/admin/users/[id]/page.tsx', 'w') as f:\\n    f.write({repr(content)})")
