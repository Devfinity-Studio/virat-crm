"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, X, User, Check } from "lucide-react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

interface EmployeeSearchComboboxProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

export function EmployeeSearchCombobox({
  value,
  onChange,
  placeholder = "Search AO by name or employee code...",
  disabled = false,
}: EmployeeSearchComboboxProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: users = [], isLoading } = api.users.getUsersForDropdown.useQuery();

  const selectedUser = users.find((u) => u.id === value);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredUsers = users.filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
    const ecode = (u.employeeCode || "").toLowerCase();
    return fullName.includes(term) || ecode.includes(term);
  });

  return (
    <div ref={containerRef} className="relative w-full">
      {selectedUser ? (
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 text-sm">
          <div className="flex items-center gap-2.5 truncate">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-sm">
              {selectedUser.firstName?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="truncate text-left">
              <div className="font-semibold text-slate-900 truncate">
                {selectedUser.firstName} {selectedUser.lastName ?? ""}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                {selectedUser.employeeCode && (
                  <span className="font-mono font-medium text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded">
                    {selectedUser.employeeCode}
                  </span>
                )}
                <span className="text-[11px] text-slate-500">
                  {selectedUser.role}
                </span>
              </div>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setSearchTerm("");
              }}
              className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-red-600 transition-colors"
              title="Remove AO"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            disabled={disabled}
            value={searchTerm}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            placeholder={placeholder}
            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && !selectedUser && !disabled && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-200/50">
          {isLoading ? (
            <div className="p-3 text-center text-xs text-slate-500">
              Loading employees...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">
              No matching employees found
            </div>
          ) : (
            filteredUsers.map((u) => (
              <button
                type="button"
                key={u.id}
                onClick={() => {
                  onChange(u.id);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-blue-50/70",
                  value === u.id && "bg-blue-50 text-blue-700 font-semibold"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-700">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-slate-900">
                      {u.firstName} {u.lastName ?? ""}
                    </span>
                    {u.employeeCode && (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                        {u.employeeCode}
                      </span>
                    )}
                  </div>
                </div>
                {value === u.id && (
                  <Check className="h-4 w-4 text-blue-600 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

