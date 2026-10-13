"use client";

import { FeatureGate } from "@/app/_components/auth/FeatureGate";
import { toast } from "sonner";

import { DashboardLayout } from "../_components/layout/DashboardLayout";
import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Check, X, Loader2, FileText, Search, Trash2, Printer, Download } from "lucide-react";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";

const FileGallery = dynamic(
  () => import("@/app/_components/ui/FileGallery").then((m) => m.FileGallery),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-full animate-pulse rounded-lg bg-gray-50" />
    ),
  },
);

import { PageWrapper } from "../_components/layout/PageWrapper";

export default function AdvancesDashboard() {
  const [filter, setFilter] = useState<
    "All" | "Pending" | "Approved" | "Rejected"
  >("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const [selectedSale, setSelectedSale] = useState<
    (typeof filteredSales)[number] | null
  >(null);

  const { data: user } = api.users.getMe.useQuery();
  const canApprove = user?.role === "Admin" || user?.role === "Manager";

  const {
    data: salesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = api.sales.getSales.useInfiniteQuery(
    { limit: 20, search: debouncedSearch || undefined, registerType: "Advance" },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  );

  const { mutate: updateStatus, isPending: isUpdating } =
    api.sales.updateSaleStatus.useMutation({
      onSuccess: () => refetch(),
      onError: (error) => {
        alert(`Status update failed: ${error.message}`);
      },
    });

  const { mutate: deleteSale, isPending: isDeleting } =
    api.sales.deleteSale.useMutation({
      onSuccess: () => {
        setSelectedSale(null);
        refetch();
        toast.success("Entry deleted successfully");
      },
      onError: (error) => {
        toast.error(`Delete failed: ${error.message}`);
      },
    });

  const allSales = salesData?.pages.flatMap((page) => page.items) ?? [];
  const filteredSales = allSales.filter(
    (sale) => filter === "All" || sale.status === filter,
  );

  const handleExportExcel = async () => {
    if (!allSales || allSales.length === 0) {
      toast.error("No data to export");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Advance Register");

    // Title Row
    worksheet.addRow(["[U07TFQ"]);
    const titleRow = worksheet.getRow(1);
    titleRow.font = { bold: true, color: { argb: "FF800000" } }; // Dark red/maroon color like the image

    // Header Row
    const headers = [
      "Sl.No",
      "Document Month",
      "Order No",
      "SR NAME",
      "GL Name",
      "Customer Address",
      "Mobile No",
      "Proudct name",
      "Sold Qty",
      "Price",
      "SaleProduct",
      "Advanced Amount",
      "Pending Amount",
    ];
    worksheet.addRow(headers);
    const headerRow = worksheet.getRow(2);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF008080" }, // Teal color
      };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    let slNo = 1;
    for (const sale of allSales) {
      const month = new Date(sale.createdAt).toLocaleString("en-US", { month: "long", year: "numeric" });
      const srName = `${sale.user?.firstName || ""} ${sale.user?.lastName || ""}`.trim();
      
      if (!sale.items || sale.items.length === 0) {
        worksheet.addRow([
          slNo++,
          month,
          sale.orderNumber,
          srName,
          sale.customerName || "",
          sale.deliveryAddress || sale.addressLine1 || "",
          "", // Mobile No
          "", // Product name
          "", // Sold Qty
          "", // Price
          "", // SaleProduct
          sale.advancePaymentAmount || "0", // Advanced Amount
          (sale.invoiceAmount || 0) - (sale.advancePaymentAmount || 0), // Pending Amount
        ]);
      } else {
        for (const item of sale.items) {
          worksheet.addRow([
            slNo++,
            month,
            sale.orderNumber,
            srName,
            sale.customerName || "",
            sale.deliveryAddress || sale.addressLine1 || "",
            "", // Mobile No
            // @ts-ignore
            item.product?.name || `Product #${item.productId}`,
            item.quantity,
            item.rate,
            item.isFree ? "Free" : "Sale",
            sale.advancePaymentAmount || "0", // Advanced Amount
            (sale.invoiceAmount || 0) - (sale.advancePaymentAmount || 0), // Pending Amount
          ]);
        }
      }
    }

    // Auto-fit columns
    worksheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        if (cell.value) {
          const valLen = cell.value.toString().length;
          if (valLen > maxLen) maxLen = valLen;
        }
      });
      col.width = maxLen + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, "Advance_Register.xlsx");
  };

  return (
    <DashboardLayout>
      <FeatureGate featureKey="sales">
        <PageWrapper isLoading={isLoading}>
          <div className="flex flex-col space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Advance Register</h1>
                <p className="text-muted-foreground">
                  Track and manage all advance entries.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="lg" className="rounded-2xl px-4 text-emerald-700 hover:text-emerald-800 border-emerald-200 bg-emerald-50 hover:bg-emerald-100" onClick={handleExportExcel}>
                  <Download className="mr-2 h-5 w-5" />
                  Excel
                </Button>
                <Link href="/advances/new">
                  <Button size="lg" className="rounded-2xl px-6">
                    <Plus className="mr-2 h-5 w-5" />
                    New Entry
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="no-scrollbar flex space-x-3 overflow-x-auto pb-2 md:pb-0">
                {["All", "Pending", "Approved", "Rejected"].map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    className={cn(
                      "rounded-2xl px-6 transition-all",
                      filter === f
                        ? "shadow-md"
                        : "border-slate-200 text-slate-600",
                    )}
                    onClick={() =>
                      setFilter(f as "All" | "Pending" | "Approved" | "Rejected")
                    }
                  >
                    {f}
                  </Button>
                ))}
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by Invoice, Customer, Item..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-2xl pl-10 border-slate-200 bg-white shadow-sm focus-visible:ring-primary"
                />
              </div>
            </div>

            {filteredSales.length === 0 && !isLoading ? (
              <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
                <div className="bg-primary/10 rounded-full p-4">
                  <FileText className="text-primary h-8 w-8" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No advances found</h3>
                <p className="text-muted-foreground mt-2 text-sm max-w-sm">
                  There are no advance entries to display. Try adjusting your search or filters.
                </p>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {/* List Layout for Dense Data */}
                {(isLoading ? Array.from({ length: 6 }) : filteredSales).map(
                  (saleItem, idx) => {
                    const sale = saleItem as
                      | (typeof filteredSales)[number]
                      | undefined;
                    return (
                      <div
                        key={sale?.id ?? idx}
                        className="group flex cursor-pointer flex-col justify-between gap-3 border-b border-slate-100 py-2.5 px-4 transition-all hover:shadow-md active:scale-[0.99] sm:flex-row sm:items-center md:py-3 md:px-5 odd:bg-white even:bg-slate-100 dark:border-slate-800 dark:odd:bg-slate-900 dark:even:bg-slate-800"
                        onClick={() => sale && setSelectedSale(sale)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 text-primary hidden h-12 w-12 items-center justify-center rounded-full font-bold shadow-inner sm:flex">
                            {sale?.customerName?.charAt(0) ?? "C"}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                              {sale?.orderNumber ?? "ORD-000000"}
                            </span>
                            <span className="text-sm font-medium text-slate-500">
                              {sale?.customerName ?? "Customer Name"}
                            </span>
                            <span className="text-xs text-slate-400">
                              {sale?.createdAt
                                ? new Date(sale.createdAt).toLocaleDateString()
                                : "Date Placeholder"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-6 sm:w-1/3 sm:justify-end">
                          <div className="flex flex-col sm:items-end">
                            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                              Advance / Total
                            </span>
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              ₹{sale?.advancePaymentAmount ?? "0"} / ₹{sale?.invoiceAmount ?? "0"}
                            </span>
                            <span className="text-xs text-rose-500 font-semibold mt-0.5">
                              Pending: ₹{(sale?.invoiceAmount || 0) - (sale?.advancePaymentAmount || 0)}
                            </span>
                          </div>
                          <Badge
                            className={cn(
                              "rounded-lg border-none px-3 py-1 text-xs font-bold tracking-widest uppercase shadow-sm",
                              sale?.status === "Approved"
                                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                : sale?.status === "Rejected"
                                  ? "bg-rose-500 text-white hover:bg-rose-600"
                                  : "bg-amber-400 text-amber-950 hover:bg-amber-500",
                            )}
                          >
                            {sale?.status ?? "Pending"}
                          </Badge>
                        </div>
                      </div>
                    );
                  },
                )}

                {hasNextPage && (
                  <Button
                    variant="outline"
                    className="mt-4 h-12 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-500" />
                    ) : null}
                    Load More Sales
                  </Button>
                )}
              </div>
            )}

            {/* Expanded Sale Details Sheet */}
            <Sheet
              open={!!selectedSale}
              onOpenChange={(open) => !open && setSelectedSale(null)}
            >
              <SheetContent className="w-full overflow-y-auto sm:max-w-2xl sm:p-10">
                <SheetHeader className="mb-6">
                  <SheetTitle className="text-2xl font-bold flex items-center gap-3">
                    Sale Details
                    {selectedSale && (
                      <Badge
                        className={cn(
                          "rounded-lg border-none px-3 py-1 text-xs font-bold tracking-widest uppercase shadow-sm",
                          selectedSale.status === "Approved"
                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                            : selectedSale.status === "Rejected"
                              ? "bg-rose-500 text-white hover:bg-rose-600"
                              : "bg-amber-400 text-amber-950 hover:bg-amber-500",
                        )}
                      >
                        {selectedSale.status}
                      </Badge>
                    )}
                  </SheetTitle>
                  <SheetDescription>
                    {selectedSale?.orderNumber}
                  </SheetDescription>
                </SheetHeader>

                {selectedSale && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="block font-semibold text-slate-500">
                          Customer
                        </span>
                        <span className="text-slate-900">
                          {selectedSale.customerName}
                        </span>
                      </div>
                      <div>
                        <span className="block font-semibold text-slate-500">
                          Creator
                        </span>
                        <span className="text-slate-900">
                          {selectedSale.user?.firstName}{" "}
                          {selectedSale.user?.lastName}
                        </span>
                      </div>
                      <div>
                        <span className="block font-semibold text-slate-500">
                          Invoice Amount
                        </span>
                        <span className="text-slate-900">
                          ₹{selectedSale.invoiceAmount}
                        </span>
                      </div>
                      <div>
                        <span className="block font-semibold text-slate-500">
                          Balance
                        </span>
                        <span className="font-bold text-red-500">
                          ₹{selectedSale.balanceAmount}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="block font-semibold text-slate-500">
                          Delivery Address
                        </span>
                        <span className="text-slate-900">
                          {selectedSale.deliveryAddress ||
                            `${selectedSale.addressLine1}, ${selectedSale.city}, ${selectedSale.state} - ${selectedSale.pincode}`}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 border-b pb-2 font-bold text-slate-900">
                        Items
                      </h4>
                      <div className="space-y-2">
                        {selectedSale.items?.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-lg border bg-slate-50 p-3"
                          >
                            <span className="font-medium text-slate-800">
                              {/* @ts-ignore */}
                              {item.product?.name ?? `Product #${item.productId}`}
                            </span>
                            <span className="text-slate-600">
                              Qty: {item.quantity}{" "}
                              {item.isFree && (
                                <Badge variant="secondary" className="ml-2">
                                  Free
                                </Badge>
                              )}
                            </span>
                          </div>
                        ))}
                        {!selectedSale.items?.length && (
                          <p className="text-sm text-slate-500 italic">
                            No items found.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                        <Link
                          href={`/sales/print/${selectedSale.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 h-9"
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Print Invoice
                        </Link>
                    </div>

                    {user?.role === "Admin" && (
                      <div className="flex flex-col gap-3 pt-4">
                        <Link
                          href={`/sales/${selectedSale.id}/edit`}
                          className="w-full"
                        >
                          <Button
                            variant="secondary"
                            className="w-full"
                            onClick={() => setSelectedSale(null)}
                          >
                            Edit Sale Details
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          className="w-full"
                          disabled={isDeleting}
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this sale? This action cannot be undone.")) {
                              deleteSale({ id: selectedSale.id });
                            }
                          }}
                        >
                          {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          Delete Sale
                        </Button>
                      </div>
                    )}

                    {selectedSale.status === "Pending" && canApprove && (
                      <div className="flex gap-3 border-t pt-4">
                        <Button
                          className="flex-1"
                          onClick={() => {
                            updateStatus({
                              saleId: selectedSale.id,
                              status: "Approved",
                            });
                            setSelectedSale(null);
                          }}
                          disabled={isUpdating}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            updateStatus({
                              saleId: selectedSale.id,
                              status: "Rejected",
                            });
                            setSelectedSale(null);
                          }}
                          disabled={isUpdating}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </PageWrapper>
      </FeatureGate>
    </DashboardLayout>
  );
}
