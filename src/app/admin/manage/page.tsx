"use client";

import { DashboardLayout } from "@/app/_components/layout/DashboardLayout";
import { FeatureGate } from "@/app/_components/auth/FeatureGate";
import { api } from "@/trpc/react";
import { Shield, Plus, Trash2, Loader2, ShieldAlert, Edit } from "lucide-react";
import { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function RolesAdminPage() {
  const [formData, setFormData] = useState({ name: "", description: "", codeSeries: "" });
  const [editingRole, setEditingRole] = useState<{name: string, description: string, codeSeries: string} | null>(null);

  const utils = api.useUtils();
  const { data: roles, isLoading } = api.roles.getAll.useQuery();

  const createMutation = api.roles.create.useMutation({
    onSuccess: () => {
      toast.success("Role created successfully");
      setFormData({ name: "", description: "", codeSeries: "" });
      void utils.roles.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = api.roles.update.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully");
      setEditingRole(null);
      void utils.roles.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = api.roles.delete.useMutation({
    onSuccess: () => {
      toast.success("Role deleted successfully");
      void utils.roles.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: createPreview } = api.users.previewNextEmployeeCode.useQuery(
    { series: formData.codeSeries },
    { enabled: !!formData.codeSeries }
  );

  const { data: editPreview } = api.users.previewNextEmployeeCode.useQuery(
    { series: editingRole?.codeSeries ?? "" },
    { enabled: !!editingRole?.codeSeries }
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <DashboardLayout>
      <FeatureGate featureKey="admin">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:flex-row md:items-center">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                <Shield className="h-6 w-6 text-indigo-600" />
                Manage Organization
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Configure system roles, permissions, and settings.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="h-fit md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Create New Role</CardTitle>
                <CardDescription>
                  Add a custom role to the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Role Name</Label>
                    <Input
                      placeholder="e.g. Auditor, HR, Sales Executive"
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
                      placeholder="Brief description of the role"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Starting E-Code</Label>
                    <Input
                      placeholder="e.g. MGR-0001"
                      value={formData.codeSeries}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          codeSeries: e.target.value,
                        })
                      }
                    />
                    {formData.codeSeries && (
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        Next Code: {createPreview || "Generating..."}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {createMutation.isPending ? "Creating..." : "Create Role"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Existing Roles</CardTitle>
                <CardDescription>
                  All roles available in the system
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="text-primary h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>E-Code Series</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles?.map((role) => (
                        <TableRow key={role.name}>
                          <TableCell className="font-medium">
                            {role.name}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {role.description ?? "-"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {role.codeSeries || "-"}
                          </TableCell>
                          <TableCell>
                            {role.isSystem ? (
                              <Badge
                                variant="secondary"
                                className="flex w-max items-center gap-1"
                              >
                                <ShieldAlert className="h-3 w-3" /> System
                              </Badge>
                            ) : (
                              <Badge variant="outline">Custom</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right flex items-center justify-end gap-2">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:bg-red-50 hover:text-red-600"
                              disabled={
                                role.isSystem || deleteMutation.isPending
                              }
                              onClick={() => {
                                if (
                                  confirm(
                                    `Are you sure you want to delete the ${role.name} role?`,
                                  )
                                ) {
                                  deleteMutation.mutate({ name: role.name });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
          {/* Edit Role Modal */}
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
                    <Label>Starting E-Code</Label>
                    <Input
                      placeholder="e.g. MGR-0001"
                      value={editingRole.codeSeries}
                      onChange={(e) => setEditingRole({ ...editingRole, codeSeries: e.target.value })}
                    />
                    {editingRole.codeSeries && (
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        Next Code: {editPreview || "Generating..."}
                      </p>
                    )}
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
          )}
        </div>
      </FeatureGate>
    </DashboardLayout>
  );
}
