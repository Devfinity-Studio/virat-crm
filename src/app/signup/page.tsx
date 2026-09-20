"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  UserPlus,
  User,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";
import Link from "next/link";

import { useEffect } from "react";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    employeeCode: "",
    password: "",
    branchId: "",
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { data: branches } = api.users.getPublicBranches.useQuery();

  useEffect(() => {
    if (branches && branches.length > 0 && !formData.branchId) {
      const firstBranch = branches[0];
      if (firstBranch) {
        setFormData((prev) => ({
          ...prev,
          branchId: firstBranch.id.toString(),
        }));
      }
    }
  }, [branches, formData.branchId]);

  const signup = api.users.signup.useMutation({
    onSuccess: () => {
      router.push("/login?signup=success");
    },
    onError: (err) => {
      setError(err.message || "Signup failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.branchId) {
      setError("Please select a branch.");
      return;
    }
    if (!termsAccepted) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }
    if (!ageConfirmed) {
      setError("You must confirm you are 18 years of age or older.");
      return;
    }
    signup.mutate({
      ...formData,
      branchId: parseInt(formData.branchId, 10),
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
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
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-200">
                <UserPlus className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                Join Virat ERP
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Create your employee account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    className="h-11 rounded-xl border-slate-200 focus:ring-emerald-500"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    className="h-11 rounded-xl border-slate-200 focus:ring-emerald-500"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@viraterp.com"
                    className="h-11 rounded-xl border-slate-200 pl-10 focus:ring-emerald-500"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeCode">Employee Code</Label>
                <div className="relative">
                  <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="employeeCode"
                    placeholder="EMP-123456"
                    className="h-11 rounded-xl border-slate-200 pl-10 focus:ring-emerald-500"
                    value={formData.employeeCode}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min 6 characters"
                    className="h-11 rounded-xl border-slate-200 pl-10 focus:ring-emerald-500"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branchId">Select Workplace Branch</Label>
                <div className="relative">
                  <select
                    id="branchId"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    value={formData.branchId}
                    onChange={handleChange}
                    required
                  >
                    {branches?.map((b) => (
                      <option key={b.id} value={b.id.toString()}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="terms"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    required
                  />
                  <Label htmlFor="terms" className="text-sm font-normal text-slate-600">
                    I agree to the{" "}
                    <Link href="/terms-of-service" className="text-emerald-600 hover:underline">Terms of Service</Link>
                    {" "}and{" "}
                    <Link href="/privacy-policy" className="text-emerald-600 hover:underline">Privacy Policy</Link>.
                  </Label>
                </div>
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="age"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    required
                  />
                  <Label htmlFor="age" className="text-sm font-normal text-slate-600">
                    I confirm that I am 18 years of age or older.
                  </Label>
                </div>
              </div>

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
                className="mt-2 h-12 w-full rounded-xl bg-emerald-600 font-semibold text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700 active:scale-[0.98]"
                disabled={signup.isPending}
              >
                {signup.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Create Account <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>

          <div className="border-t border-slate-100 bg-slate-50 p-4 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-emerald-600 hover:underline"
              >
                Log in
              </Link>
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
