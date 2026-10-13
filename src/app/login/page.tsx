"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, User, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { Suspense } from "react";
import Link from "next/link";

function LoginContent() {
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
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
      const body: Record<string, any> = { employeeCode, password };
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
          if (
            activeBranches &&
            activeBranches.length > 0 &&
            activeBranches[0]
          ) {
            setSelectedBranchId(activeBranches[0].id.toString());
          }
        } else {
          router.push("/");
          router.refresh();
        }
      } else {
        setError(data.error ?? "Login failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 p-4">
      {/* Background Orbs */}
      <div className="animate-blob absolute top-0 -left-4 h-72 w-72 rounded-full bg-blue-100 opacity-70 mix-blend-multiply blur-xl filter" />
      <div className="animate-blob animation-delay-2000 absolute top-0 -right-4 h-72 w-72 rounded-full bg-emerald-100 opacity-70 mix-blend-multiply blur-xl filter" />
      <div className="animate-blob animation-delay-4000 absolute -bottom-8 left-20 h-72 w-72 rounded-full bg-slate-200 opacity-70 mix-blend-multiply blur-xl filter" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-md"
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-2xl backdrop-blur-xl">
          <div className="p-8">
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Virat ERP</h1>
              <p className="mt-2 text-sm text-slate-500">
                Sign in to your workplace
              </p>
            </div>

            {signupSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-700"
              >
                Account created successfully! Please log in.
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="employeeCode">Employee Code</Label>
                <div className="relative">
                  <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="employeeCode"
                    placeholder="EMP-123456"
                    className="h-12 rounded-xl border-slate-200 pl-10 focus:ring-blue-500"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-xs text-blue-600 hover:underline">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="h-12 rounded-xl border-slate-200 pl-10 focus:ring-blue-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {requireBranch && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2 overflow-hidden"
                >
                  <Label htmlFor="branch">
                    Operating Branch (Admin Privilege)
                  </Label>
                  <select
                    id="branch"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600"
                >
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </motion.div>
              )}

              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-blue-600 font-semibold text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Access Dashboard <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 p-4 text-center">
            <p className="text-sm text-slate-500">
              New here?{" "}
              <Link
                href="/signup"
                className="font-semibold text-blue-600 hover:underline"
              >
                Create an account
              </Link>
            </p>
            <p className="text-xs font-medium text-slate-400">
              Authorized Personnel Only
            </p>
          </div>
        </div>
        <div className="mt-4 text-center text-xs text-slate-500">
          <Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link> •{" "}
          <Link href="/terms-of-service" className="hover:underline">Terms</Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
