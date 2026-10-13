"use client";

import { useState } from "react";
import { DashboardLayout } from "../_components/layout/DashboardLayout";
import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Mail, Shield, Briefcase, MapPin } from "lucide-react";
import { PushSettings } from "../_components/PushSettings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { data: user, isLoading } = api.users.getMe.useQuery();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">
            User not found. Please log in again.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Your Profile</h1>
        </div>

        <Card className="overflow-hidden">
          <div className="from-primary/20 to-primary/5 h-32 bg-gradient-to-r" />
          <CardContent className="relative pt-0 pb-6">
            <div className="-mt-12 mb-6 flex flex-col items-center gap-4 sm:flex-row sm:items-end">
              <Avatar className="border-background h-24 w-24 border-4 shadow-lg">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {user.firstName?.[0]}
                  {user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold">
                  {user.firstName} {user.lastName}
                </h2>
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Badge variant="secondary" className="px-3 py-0.5">
                    {user.role}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    ID: {user.id?.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                    <Mail className="text-muted-foreground h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-[10px] font-semibold uppercase">
                      Email
                    </span>
                    <span className="font-medium">{user.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                    <Shield className="text-muted-foreground h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-[10px] font-semibold uppercase">
                      Role
                    </span>
                    <span className="font-medium">{user.role} Account</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                    <Briefcase className="text-muted-foreground h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-[10px] font-semibold uppercase">
                      Manager
                    </span>
                    <span className="font-medium">
                      {user.managers && user.managers.length > 0
                        ? user.managers
                            .map(
                              (m) =>
                                `${m.manager.firstName} ${m.manager.lastName}`,
                            )
                            .join(", ")
                        : "Direct Report / Admin"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                    <MapPin className="text-muted-foreground h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-[10px] font-semibold uppercase">
                      Branch
                    </span>
                    <span className="font-medium">Headquarters</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification Settings</CardTitle>
            <CardDescription>
              Configure how you receive real-time alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PushSettings />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Security Settings</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordChangeForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-600">
              Account Management
            </CardTitle>
            <CardDescription>Manage your current access and data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/30 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">Sign Out</p>
                <p className="text-xs text-slate-500">
                  End your current session on this device
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
              >
                Logout
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-red-900">Delete Account</p>
                <p className="text-xs text-red-700">
                  Permanently remove your account and data
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  window.location.href = "/data-deletion";
                }}
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const mutation = api.users.updatePassword.useMutation({
    onSuccess: () => {
      setStatus({ type: "success", message: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err) => {
      setStatus({ type: "error", message: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", message: "New passwords do not match" });
      return;
    }
    mutation.mutate({ currentPassword, newPassword });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      {status && (
        <p
          className={cn(
            "text-sm",
            status.type === "success" ? "text-green-600" : "text-red-600",
          )}
        >
          {status.message}
        </p>
      )}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "Updating..." : "Update Password"}
      </Button>
    </form>
  );
}
