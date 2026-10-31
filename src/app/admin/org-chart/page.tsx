"use client";

import { FeatureGate } from "@/app/_components/auth/FeatureGate";

import { DashboardLayout } from "@/app/_components/layout/DashboardLayout";
import { OrgFlowchart } from "@/app/_components/workforce/OrgFlowchart";
import { Network, LayoutGrid, GitBranch } from "lucide-react";
import { useState } from "react";
import { OrgTree } from "@/app/_components/workforce/OrgTree";

export default function OrgChartPage() {
  const [activeTab, setActiveTab] = useState("flowchart");

  return (
    <DashboardLayout>
      <FeatureGate featureKey="org-chart">
        <div className="flex flex-col space-y-8">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-gray-900">
              <Network className="h-8 w-8 text-indigo-600" />
              <span>Organization Hierarchy</span>
            </h1>
            <p className="mt-2 text-lg text-gray-500">
              Visualize reporting lines and team structures.
            </p>
          </div>

          <div className="flex w-fit rounded-2xl bg-gray-100/50 p-1.5">
            <button
              onClick={() => setActiveTab("hierarchy")}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${
                activeTab === "hierarchy"
                  ? "bg-white text-indigo-600 shadow-md"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Tree View
            </button>
            <button
              onClick={() => setActiveTab("flowchart")}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${
                activeTab === "flowchart"
                  ? "bg-white text-indigo-600 shadow-md"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <GitBranch className="h-4 w-4" />
              Map View
            </button>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 min-h-[600px] rounded-3xl border border-gray-100 bg-white p-6 shadow-sm duration-500">
            {activeTab === "hierarchy" ? <OrgTree /> : <OrgFlowchart />}
          </div>
        </div>
      </FeatureGate>
    </DashboardLayout>
  );
}
