"use client";

import { api } from "@/trpc/react";
import {
  User,
  Phone,
  MapPin,
  Calendar,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  IndianRupee,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CustomerListProps {
  isManager?: boolean;
}

export function CustomerList({ isManager = false }: CustomerListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: customers,
    isLoading,
    refetch,
  } = api.crm.getBranchCustomers.useQuery(
    { search: searchQuery },
    { placeholderData: (previousData) => previousData },
  );

  const { mutate: approveCustomer } = api.crm.approveCustomer.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by Name or Mobile..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Customer List */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex animate-pulse items-center justify-between p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
                <div className="h-8 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
            ))
          ) : customers?.length === 0 ? (
            <div className="px-6 py-12 text-center font-medium text-slate-500 italic">
              No customers found matching your search.
            </div>
          ) : (
            customers?.map((customer) => (
              <div
                key={customer.id}
                className="group relative flex flex-col justify-between gap-4 px-4 py-2.5 transition-colors odd:bg-white even:bg-slate-100 hover:bg-slate-200/50 sm:flex-row sm:items-center dark:odd:bg-slate-900 dark:even:bg-slate-800 dark:hover:bg-slate-800/80"
              >
                <div className="flex items-center gap-4">
                  <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-600 shadow-sm sm:flex dark:bg-blue-900/20 dark:text-blue-400">
                    {customer.name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        {customer.name}
                      </span>
                      <Link
                        href={`/crm/${customer.id}`}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        title="View Customer Details"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                      </Link>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                        <Phone className="h-3 w-3" /> {customer.mobile}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">
                        •
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" /> {customer.village}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-6 sm:w-1/2 sm:justify-end">
                  <div className="flex flex-col sm:items-end">
                    <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                      Total Pending
                    </span>
                    <span
                      className={cn(
                        "text-lg font-bold tabular-nums",
                        customer.totalPending > 0
                          ? "text-rose-500"
                          : "text-emerald-500",
                      )}
                    >
                      ₹{customer.totalPending.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm",
                        customer.status === "Approved"
                          ? "bg-emerald-500 text-white"
                          : "bg-amber-400 text-amber-950",
                      )}
                    >
                      {customer.status === "Approved" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                      {customer.status}
                    </span>

                    <div className="flex items-center gap-2">
                      {isManager && customer.status === "Draft" && (
                        <Button
                          size="sm"
                          className="h-7 border border-emerald-200 bg-emerald-50 px-3 text-[10px] font-bold tracking-wider text-emerald-700 uppercase hover:bg-emerald-100"
                          onClick={() => approveCustomer({ id: customer.id })}
                        >
                          Approve
                        </Button>
                      )}
                      {isManager && (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7 px-3 text-[10px] font-bold tracking-wider text-blue-600 uppercase hover:bg-blue-50"
                        >
                          <Link href={`/crm/${customer.id}/edit`}>Edit</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
