"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Key, User, FileText, X } from "lucide-react";
import { GenericUploader, UploadedFile } from "@/app/_components/ui/GenericUploader";
import { Badge } from "@/components/ui/badge";

export function AddUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [successData, setSuccessData] = useState<{name: string, employeeCode: string} | null>(null);
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
    bloodGroup: "",
    branchId: undefined as number | undefined,
    managerIds: [] as string[],
    profilePhoto: "",
    documents: {} as Record<string, UploadedFile>,
  });
  
  const { data: nextCode } = api.users.getNextEmployeeCode.useQuery({ role: formData.role }, { enabled: !!formData.role });

  const { data: branches } = api.inventory.getBranches.useQuery();
  const { data: managers } = api.hierarchy.getManagers.useQuery();
  const { data: roles } = api.roles.getAll.useQuery();

  const mutation = api.users.createUser.useMutation({
    onSuccess: (data) => {
      setSuccessData({ name: `${data.firstName} ${data.lastName}`, employeeCode: data.employeeCode });
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const requiredDocs = ["10th marksheet", "12th marksheet", "character certificate", "stamp papers", "requirement form"];
    const uploadedDocs = Object.keys(formData.documents);
    if (!requiredDocs.every(d => uploadedDocs.includes(d))) {
      toast.error("Please upload all 5 required documents");
      return;
    }
    if (!formData.bloodGroup) {
      toast.error("Please select a blood group");
      return;
    }
    if (formData.branchId === undefined) {
      toast.error("Please select a branch");
      return;
    }
    mutation.mutate({
      ...formData,
      branchId: formData.branchId,
      joiningDate: formData.joiningDate ? new Date(formData.joiningDate) : undefined,
      dob: formData.dob ? new Date(formData.dob) : undefined,
      bloodGroup: formData.bloodGroup,
      profilePhoto: formData.profilePhoto || undefined,
      documents: Object.keys(formData.documents).map(k => ({ ...formData.documents[k], name: k })),
    });
  };

  const handleDocumentUpload = (type: string, file: UploadedFile) => {
    setFormData(prev => ({
      ...prev,
      documents: { ...prev.documents, [type]: file }
    }));
  };

  const removeDocument = (type: string) => {
    setFormData(prev => {
      const newDocs = { ...prev.documents };
      delete newDocs[type];
      return { ...prev, documents: newDocs };
    });
  };

  return (
    <>
    <Card className="border-slate-200/60 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
        <CardTitle className="text-lg text-slate-800">Employee Details</CardTitle>
        <CardDescription>
          Enter information to create a new system user
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Left side: Profile Photo */}
            <div className="md:col-span-3 space-y-4">
              <Label>Profile Photo</Label>
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-slate-100 bg-slate-50 flex items-center justify-center relative">
                  {formData.profilePhoto ? (
                    <img src={formData.profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-slate-300" />
                  )}
                  {formData.profilePhoto && (
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, profilePhoto: ""})}
                      className="absolute top-1 right-1 bg-white rounded-full shadow-sm p-1 hover:bg-slate-100"
                    >
                      <X className="h-4 w-4 text-slate-600" />
                    </button>
                  )}
                </div>
                {!formData.profilePhoto && (
                  <GenericUploader 
                    label="Upload Photo" 
                    accept="image/*"
                    onUploadComplete={(f) => setFormData({...formData, profilePhoto: f.url})} 
                  />
                )}
              </div>
            </div>

            {/* Right side: Form Details */}
            <div className="md:col-span-9 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="bg-slate-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="bg-slate-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Father's Name</Label>
                  <Input
                    value={formData.fatherName}
                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    className="bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Initial Password</Label>
                  <div className="relative">
                    <Key className="text-slate-400 absolute top-3 left-3 h-4 w-4" />
                    <Input
                      type="password"
                      className="pl-9 bg-slate-50/50"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date of Joining</Label>
                  <Input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    required
                    className="bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Blood Group</Label>
                  <Select
                    value={formData.bloodGroup}
                    onValueChange={(v: string) => setFormData({ ...formData, bloodGroup: v })}
                  >
                    <SelectTrigger className="bg-slate-50/50">
                      <SelectValue placeholder="Select Blood Group" />
                    </SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => (
                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v: string) => setFormData({ ...formData, role: v })}
                  >
                    <SelectTrigger className="bg-slate-50/50">
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
                    onValueChange={(v) => setFormData({ ...formData, branchId: parseInt(v) })}
                  >
                    <SelectTrigger className="bg-slate-50/50">
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
                      <label key={m.id} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.managerIds.includes(m.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, managerIds: [...formData.managerIds, m.id] });
                            } else {
                              setFormData({ ...formData, managerIds: formData.managerIds.filter((id) => id !== m.id) });
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
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Documents Section */}
          <div className="space-y-4">
            <Label className="text-base">Required Employee Documents (PDFs)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {["10th marksheet", "12th marksheet", "character certificate", "stamp papers", "requirement form"].map((docType) => {
                const doc = formData.documents[docType];
                return (
                  <div key={docType} className="flex flex-col gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm">
                    <div className="flex items-center justify-between">
                      <Label className="capitalize text-slate-700 font-semibold">{docType}</Label>
                      {doc && (
                        <Button variant="ghost" size="icon" type="button" onClick={() => removeDocument(docType)} className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {doc ? (
                       <div className="flex items-center gap-3 overflow-hidden mt-2 p-2 bg-white rounded-lg border border-slate-100">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-green-50 text-green-600">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-medium text-slate-900 truncate" title={doc.url}>Uploaded successfully</p>
                          </div>
                       </div>
                    ) : (
                      <div className="mt-2">
                        <GenericUploader 
                          label={`Upload ${docType}`} 
                          accept="application/pdf"
                          onUploadComplete={(f) => handleDocumentUpload(docType, f)} 
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              className="bg-slate-900 text-white hover:bg-slate-800"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Creating..." : "Create Employee Account"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    {successData && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-8 text-center shadow-2xl transition-all scale-in-90 animate-in zoom-in-95 duration-300">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
            <svg className="h-12 w-12 text-green-500 animate-[bounce_1s_ease-in-out]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 className="mb-2 text-2xl font-bold text-slate-900">Success!</h3>
          <p className="mb-6 text-slate-500">New employee has been created.</p>
          <div className="mb-8 space-y-3 rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Name</p>
              <p className="text-lg font-bold text-slate-900">{successData.name}</p>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Employee Code</p>
              <p className="text-2xl font-black text-indigo-600 tracking-wider">{successData.employeeCode}</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setSuccessData(null);
            }}
            className="w-full h-12 text-lg font-bold bg-indigo-600 hover:bg-indigo-700"
          >
            Continue
          </Button>
        </div>
      </div>
    )}
    </>
  );
}