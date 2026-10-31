"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, User, AlertCircle, Loader2, ArrowRight, Eye, EyeOff, Building2, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Suspense } from "react";
import Link from "next/link";

function LoginContent() {
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requireBranch, setRequireBranch] = useState(false);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const signupSuccess = searchParams.get("signup") === "success";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: Record<string, any> = { 
        employeeCode: employeeCode.trim(), 
        password 
      };
      if (requireBranch && selectedBranchId) {
        body.branchId = parseInt(selectedBranchId, 10);
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as {
        error?: string;
        requireBranch?: boolean;
        branches?: { id: number; name: string }[];
      };

      if (res.ok) {
        if (data.requireBranch) {
          const activeBranches = data.branches;
          setRequireBranch(true);
          setBranches(activeBranches ?? []);
          if (activeBranches && activeBranches.length > 0 && activeBranches[0]) {
            setSelectedBranchId(activeBranches[0].id.toString());
          }
        } else {
          router.push("/");
          router.refresh();
        }
      } else {
        setError(data.error ?? "Invalid Employee ID or password. Please try again.");
      }
    } catch {
      setError("Unable to connect to the server. Please check your internet connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col justify-center bg-slate-50 p-4 sm:p-6 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-md"
      >
        {/* Company Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-md shadow-blue-500/20">
            <ShieldCheck className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Virat CRM
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Field Workforce & Management Portal
          </p>
        </div>

        {/* Card Shell */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Welcome Back</h2>
              <p className="text-sm text-slate-500">Please sign in to start your work shift</p>
            </div>

            {signupSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-800"
              >
                Account created successfully! Please sign in below.
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800"
              >
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1">
                  <p>{error}</p>
                  <p className="mt-1 text-xs text-rose-600">Need help? Contact your dispatch manager.</p>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Employee ID */}
              <div className="space-y-2">
                <Label htmlFor="employeeCode" className="text-sm font-semibold text-slate-800">
                  Employee ID / Code
                </Label>
                <div className="relative">
                  <User className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="employeeCode"
                    placeholder="e.g. EMP-1001 or 10008"
                    className="min-h-[56px] h-14 rounded-xl border-slate-200 bg-slate-50/50 pl-12 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-blue-600"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    autoCapitalize="characters"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-800">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="min-h-[56px] h-14 rounded-xl border-slate-200 bg-slate-50/50 pr-24 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-blue-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 active:bg-slate-200 transition-colors"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="h-4 w-4 text-slate-500" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 text-slate-500" />
                        <span>Show</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Operating Branch Dropdown (When triggered for multi-branch admins) */}
              {requireBranch && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2 overflow-hidden rounded-xl border border-blue-100 bg-blue-50/40 p-4"
                >
                  <Label htmlFor="branch" className="text-sm font-semibold text-blue-950 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Select Active Branch
                  </Label>
                  <select
                    id="branch"
                    className="min-h-[52px] h-13 w-full rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id.toString()}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </motion.div>
              )}

              {/* Huge 56px Tall Submit CTA */}
              <Button
                type="submit"
                className="min-h-[56px] h-14 w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] font-bold text-base text-white shadow-lg shadow-blue-500/25 transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>Log In</span>
                    <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </Button>
            </form>
          </div>

          {/* Quick Support Footer */}
          <div className="flex flex-col items-center gap-2 border-t border-slate-100 bg-slate-50/80 p-4 text-center">
            <a
              href="tel:+918000000000"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
            >
              <PhoneCall className="h-3.5 w-3.5 text-blue-600" />
              Need Dispatch Assistance? Call Support
            </a>
            <p className="text-xs text-slate-400">
              Virat CRM Field Workforce Edition • TLS Encrypted
            </p>
          </div>
        </div>

        {/* Legal links */}
        <div className="mt-4 text-center text-xs text-slate-500">
          <Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link> •{" "}
          <Link href="/terms-of-service" className="hover:underline">Terms of Service</Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
