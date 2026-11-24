"use client";

import { Printer, ArrowLeft, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function PrintToolbar({ isFilled }: { isFilled: boolean }) {
  return (
    <div className="print:hidden mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm max-w-[210mm] w-full">
      <div className="flex items-center gap-3">
        <Link
          href="/reports"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Reports
        </Link>
        <span className="text-slate-300">|</span>
        <div className="flex items-center gap-1.5">
          <Link
            href="/reports/print"
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              !isFilled
                ? "bg-slate-900 text-white shadow"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Blank Sheet (for Handwriting)
          </Link>
          <Link
            href="/reports/print?mode=filled"
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              isFilled
                ? "bg-slate-900 text-white shadow"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Pre-filled with Data
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-md hover:bg-blue-700 active:scale-95 transition-all"
      >
        <Printer className="h-4 w-4" /> Print Sheet (Ctrl+P)
      </button>
    </div>
  );
}
