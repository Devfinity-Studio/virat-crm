"use client";

import { DashboardLayout } from "@/app/_components/layout/DashboardLayout";
import { FeatureGate } from "@/app/_components/auth/FeatureGate";
import { ReportForm } from "@/app/_components/reports/ReportForm";
import { ReportList } from "@/app/_components/reports/ReportList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import { FileText, Plus, List, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("list");
  const { data: user } = api.users.getMe.useQuery();

  const isManager =
    user?.permissions.isManager ?? user?.permissions.isAdmin ?? false;
  const isAdmin = user?.role === "Admin";

  return (
    <DashboardLayout>
      <FeatureGate featureKey="reports">
        <div className="flex flex-col space-y-6">
          {/* Header */}
          <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-sm md:flex-row md:items-center">
            <div className="relative z-10">
              <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-900">
                <div className="rounded-xl bg-blue-100 p-2">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                Daily Activity Reports
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                {isManager
                  ? "Monitor team productivity, review field updates, and track branch-level daily activities."
                  : "Submit your daily narrative updates, track customer interactions, and maintain your activity diary."}
              </p>
            </div>

            {/* Decorative background element */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-blue-50/30 blur-3xl" />
          </div>

          {/* Main Content */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="mb-6 flex items-center justify-between">
              <TabsList className="rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                <TabsTrigger
                  value="list"
                  className="gap-2 rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <List className="h-4 w-4" />
                  {isManager ? "Branch Activity" : "My History"}
                </TabsTrigger>
                <TabsTrigger
                  value="add"
                  className="gap-2 rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Submit Report
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="mt-0 outline-none">
              <ReportList isManager={isManager} isAdmin={isAdmin} />
            </TabsContent>

            <TabsContent
              value="add"
              className="mx-auto mt-0 max-w-3xl outline-none"
            >
              <ReportForm onSuccess={() => setActiveTab("list")} />
            </TabsContent>
          </Tabs>
        </div>
      </FeatureGate>
    </DashboardLayout>
  );
}
