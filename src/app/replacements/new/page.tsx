"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FeatureGate } from "@/app/_components/auth/FeatureGate";
import { DashboardLayout } from "../../_components/layout/DashboardLayout";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  PackageCheck,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, Suspense } from "react";
import { FileUploader } from "@/app/_components/ui/FileUploader";
import { MultiSelectInput } from "@/app/_components/ui/MultiSelectInput";
import { EmployeeSearchCombobox } from "@/app/_components/ui/EmployeeSearchCombobox";
import { usePincodeLookup } from "@/hooks/usePincodeLookup";

interface SelectableItem {
  id: number;
  productId: number;
  productName: string;
  brand: string;
  unit: string;
  invoicedQty: number;
  replacementQty: number;
  isSelected: boolean;
  isFree: boolean;
  rate: string;
  amount: string;
  offerNumber?: string;
}

function ReplacementFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [branchId, setBranchId] = useState("");
  const [success, setSuccess] = useState(false);
  const [newReplacementId, setNewReplacementId] = useState<number | null>(null);

  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [transactionNumber, setTransactionNumber] = useState("");
  const [invDate, setInvDate] = useState("");

  const [cmrId, setCmrId] = useState("");
  const [tmNo, setTmNo] = useState("");
  const [docMonth, setDocMonth] = useState("");

  const [replacementType, setReplacementType] = useState("First Replacement");
  const [reason, setReason] = useState("");
  const [aoId, setAoId] = useState<string | null>(null);

  const [originalSaleId, setOriginalSaleId] = useState<number | null>(null);

  const [userIds, setUserIds] = useState<string[]>([]);
  const [managerIds, setManagerIds] = useState<string[]>([]);

  // Customer details
  const [customerId, setCustomerId] = useState("");
  const [villageSearch, setVillageSearch] = useState("");
  const [isSearchingVillage, setIsSearchingVillage] = useState(false);
  const [villageSearchResults, setVillageSearchResults] = useState<
    { Name: string; District: string; State: string; Pincode: string }[]
  >([]);

  const [customerName, setCustomerName] = useState("");
  const [so, setSo] = useState("");
  const [village, setVillage] = useState("");
  const [mandal, setMandal] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [pin, setPin] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [landMark, setLandMark] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [landLineNo, setLandLineNo] = useState("");
  const [dob, setDob] = useState("");
  const [marriageDate, setMarriageDate] = useState("");

  // Items selectable from invoice
  const [invoiceItems, setInvoiceItems] = useState<SelectableItem[]>([]);

  useEffect(() => {
    setDocMonth(
      new Date()
        .toLocaleString("en-US", { month: "short", year: "numeric" })
        .replace(" ", "-"),
    );
  }, []);

  // Pre-fill from query params if available
  useEffect(() => {
    const qOrderNumber = searchParams.get("orderNumber");
    if (qOrderNumber && !orderNumber) {
      setOrderNumber(qOrderNumber);
    }
  }, [searchParams, orderNumber]);

  const qSaleId = searchParams.get("saleId");
  const saleIdNum = qSaleId ? parseInt(qSaleId, 10) : undefined;

  const { data: fetchedSaleById } = api.sales.getSaleById.useQuery(
    { saleId: saleIdNum! },
    { enabled: !!saleIdNum && isNaN(saleIdNum) === false && saleIdNum > 0 },
  );

  useEffect(() => {
    if (fetchedSaleById && !orderNumber) {
      setOrderNumber(fetchedSaleById.orderNumber);
    }
  }, [fetchedSaleById, orderNumber]);

  const { data: branches = [] } = api.inventory.getBranches.useQuery();
  const { data: customers = [] } = api.crm.getBranchCustomers.useQuery();

  const {
    fetchedDistrict,
    fetchedState,
    villages: fetchedVillages,
    isLoading: isLoadingPincode,
  } = usePincodeLookup(pin);

  useEffect(() => {
    if (fetchedDistrict) setDistrict(fetchedDistrict);
    if (fetchedState) setState(fetchedState);
    if (fetchedVillages.length > 0) {
      setVillage(fetchedVillages[0] || "");
    }
  }, [fetchedDistrict, fetchedState, fetchedVillages]);

  const { data: orgUsers = [] } = api.users.getUsersForDropdown.useQuery();
  const allUsersOptions = orgUsers.map((u) => ({
    id: u.id,
    label: u.employeeCode
      ? `${u.employeeCode} - ${u.firstName} ${u.lastName || ""}`
      : `${u.firstName} ${u.lastName || ""}`,
  }));
  const managerOptions = orgUsers
    .filter((u) => u.role === "Manager")
    .map((u) => ({
      id: u.id,
      label: u.employeeCode
        ? `${u.employeeCode} - ${u.firstName} ${u.lastName || ""}`
        : `${u.firstName} ${u.lastName || ""}`,
    }));

  const { data: fetchedSaleByOrder, isLoading: isFetchingSale } =
    api.sales.getSaleByOrderNumber.useQuery(
      { orderNumber },
      { enabled: orderNumber.trim().length > 2 },
    );

  const activeSale = fetchedSaleByOrder || fetchedSaleById;

  useEffect(() => {
    if (activeSale) {
      setOriginalSaleId(activeSale.id);
      setBranchId(activeSale.branchId?.toString() || "");
      setTransactionNumber(activeSale.transactionNumber || "");
      if (activeSale.orderDate) {
        setOrderDate(
          new Date(activeSale.orderDate as any).toISOString().split("T")[0] ||
            "",
        );
      }
      if (activeSale.invoiceDate) {
        setInvDate(
          new Date(activeSale.invoiceDate as any).toISOString().split("T")[0] ||
            "",
        );
      }
      setCmrId(activeSale.cmrId || "");
      setTmNo(activeSale.tmNo || "");
      setCustomerName(activeSale.customerName || "");
      setSo(String((activeSale as any).customer?.fatherName || ""));
      setHouseNo(activeSale.customerAddress || "");
      setPin(activeSale.pincode || "");
      setMandal(activeSale.area || "");
      setDistrict(activeSale.city || "");
      setState(activeSale.state || "");
      setLandMark(activeSale.landmark || "");

      if (activeSale.assignments) {
        setUserIds(
          activeSale.assignments
            .filter((a: any) => a.role === "Ecode")
            .map((a: any) => a.userId),
        );
        setManagerIds(
          activeSale.assignments
            .filter((a: any) => a.role === "FieldSupport")
            .map((a: any) => a.userId),
        );
      }

      if (activeSale.items && activeSale.items.length > 0) {
        const mappedItems: SelectableItem[] = activeSale.items.map(
          (item: any, idx: number) => {
            const invoicedQty = Number(item.quantity) || 0;
            return {
              id: item.id || idx,
              productId: item.productId,
              productName: item.product?.name || `Product #${item.productId}`,
              brand: item.product?.brand || "-",
              unit: item.product?.unit || "units",
              invoicedQty,
              replacementQty: invoicedQty, // default to all invoiced qty
              isSelected: true, // selected by default
              isFree: !!item.isFree,
              rate: item.rate || "0",
              amount: (invoicedQty * (parseFloat(item.rate) || 0)).toFixed(2),
              offerNumber: item.offerNumber || "",
            };
          },
        );
        setInvoiceItems(mappedItems);
      } else {
        setInvoiceItems([]);
      }
    }
  }, [activeSale]);

  const handleVillageSearchAction = async () => {
    if (!villageSearch) return;
    setIsSearchingVillage(true);
    setVillageSearchResults([]);
    try {
      const res = await fetch(
        `https://api.postalpincode.in/postoffice/${encodeURIComponent(villageSearch)}`,
      );
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === "Success") {
        const postOffices = data[0].PostOffice;
        if (postOffices && postOffices.length > 0) {
          if (postOffices.length === 1) {
            const postOffice = postOffices[0];
            setVillage(postOffice.Name || "");
            setDistrict(postOffice.District || "");
            setState(postOffice.State || "");
            setPin(postOffice.Pincode || "");
          } else {
            setVillageSearchResults(postOffices);
          }
        }
      } else {
        toast.error("Village not found");
      }
    } catch {
      toast.error("Error searching village");
    } finally {
      setIsSearchingVillage(false);
    }
  };

  const createReplacement = api.replacements.createReplacement.useMutation({
    onSuccess: (data) => {
      if (data) {
        setSuccess(true);
        setNewReplacementId(data.id);
        toast.success("Replacement created successfully!");
        router.refresh();
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const toggleItemSelection = (id: number) => {
    setInvoiceItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isSelected: !item.isSelected } : item,
      ),
    );
  };

  const selectAllItems = () => {
    setInvoiceItems((prev) => prev.map((item) => ({ ...item, isSelected: true })));
  };

  const deselectAllItems = () => {
    setInvoiceItems((prev) => prev.map((item) => ({ ...item, isSelected: false })));
  };

  const updateItemQty = (id: number, rawQty: string) => {
    const val = parseInt(rawQty, 10);
    setInvoiceItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (isNaN(val) || val <= 0) {
          return { ...item, replacementQty: 1 };
        }
        if (val > item.invoicedQty) {
          toast.error(
            `Cannot replace more than the invoiced quantity (${item.invoicedQty}) for ${item.productName}`,
          );
          return { ...item, replacementQty: item.invoicedQty };
        }
        return { ...item, replacementQty: val };
      }),
    );
  };

  const selectedItems = useMemo(
    () => invoiceItems.filter((i) => i.isSelected && i.replacementQty > 0),
    [invoiceItems],
  );

  const totalSelectedUnits = useMemo(
    () => selectedItems.reduce((acc, i) => acc + i.replacementQty, 0),
    [selectedItems],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalSaleId) {
      toast.error("Please enter a valid Order Number to fetch the original invoice");
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("Please select at least one product to replace");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please provide a reason for the replacement");
      return;
    }

    createReplacement.mutate({
      originalSaleId,
      reason: reason.trim(),
      replacementType,
      aoId: aoId || undefined,
      items: selectedItems.map((item) => ({
        productId: item.productId,
        quantity: item.replacementQty,
      })),
    });
  };

  const clearForm = () => {
    setOrderNumber("");
    setOriginalSaleId(null);
    setBranchId("");
    setOrderDate("");
    setTransactionNumber("");
    setInvDate("");
    setCmrId("");
    setTmNo("");
    setUserIds([]);
    setManagerIds([]);
    setAoId(null);
    setCustomerId("");
    setCustomerName("");
    setSo("");
    setVillage("");
    setMandal("");
    setDistrict("");
    setState("");
    setPin("");
    setHouseNo("");
    setLandMark("");
    setMobileNo("");
    setLandLineNo("");
    setDob("");
    setMarriageDate("");
    setReason("");
    setInvoiceItems([]);
  };

  return (
    <DashboardLayout>
      <FeatureGate featureKey="sales">
        {success && newReplacementId ? (
          <div className="mx-auto flex max-w-4xl flex-col space-y-6">
            <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
              <CardContent className="pt-6 text-center">
                <div className="mb-4 inline-flex rounded-full p-3 bg-emerald-100 text-emerald-600">
                  <CheckCircle className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Replacement #{newReplacementId} Logged Successfully!
                </h2>
                <p className="text-slate-600 text-sm mt-1">
                  The replacement request has been submitted for approval. You can now upload supporting documents.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm border-slate-200">
              <CardHeader>
                <CardTitle className="text-slate-700 text-sm font-semibold uppercase tracking-wider">
                  Upload Invoice / Defect Photos
                </CardTitle>
                <CardDescription>
                  Attach photos of damaged goods or signed replacement forms (optional).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploader
                  entityType="replacement"
                  entityId={newReplacementId}
                  maxFiles={5}
                  onUploadComplete={() => undefined}
                />
                <div className="mt-6 flex justify-center gap-3">
                  <Link href="/replacements">
                    <Button variant="outline" className="min-h-[48px] px-6">
                      View Replacements
                    </Button>
                  </Link>
                  <Button
                    onClick={clearForm}
                    className="min-h-[48px] px-6 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Create Another Replacement
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6 pb-16">
            {/* Header with Title and Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  New Replacement
                </h1>
                <p className="text-slate-500 text-sm">
                  Replacement request linked to original sales invoice (B2C)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <Button
                  variant="outline"
                  type="button"
                  onClick={clearForm}
                  className="min-h-[44px] px-4"
                >
                  Clear
                </Button>
                <Link href="/replacements">
                  <Button
                    variant="outline"
                    type="button"
                    className="min-h-[44px] px-4"
                  >
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={createReplacement.isPending}
                  className="min-h-[44px] px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {createReplacement.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Replacement
                </Button>
              </div>
            </div>

            {/* Document Details Card */}
            <Card className="bg-white shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Document Details
                </CardTitle>
                <CardDescription>
                  Enter the original sales order number to fetch customer and invoice details.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Company */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">Company</Label>
                  <Input
                    value="Virat Bio Plaantec Private Limited"
                    readOnly
                    className="bg-slate-50 text-slate-700 font-medium"
                  />
                </div>

                {/* Branch */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">
                    Branch <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Order No with live lookup */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600 flex items-center justify-between">
                    <span>Order No <span className="text-red-500">*</span></span>
                    {isFetchingSale && (
                      <span className="text-blue-600 flex items-center gap-1 text-[11px]">
                        <Loader2 className="h-3 w-3 animate-spin" /> Fetching...
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="e.g. SO-2026-001"
                      required
                      className="pr-8"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                      <Search className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Order Date */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">Order Date</Label>
                  <Input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>

                {/* Tax Inv No */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">Tax Inv No</Label>
                  <Input
                    value={transactionNumber}
                    onChange={(e) => setTransactionNumber(e.target.value)}
                    placeholder="Invoice Number"
                  />
                </div>

                {/* Inv Date */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">Inv Date</Label>
                  <Input
                    type="date"
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                  />
                </div>

                {/* Doc Month */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">Doc Month</Label>
                  <Input
                    value={docMonth}
                    onChange={(e) => setDocMonth(e.target.value)}
                  />
                </div>

                {/* CMR ID */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">CMR ID</Label>
                  <Input
                    value={cmrId}
                    onChange={(e) => setCmrId(e.target.value)}
                  />
                </div>

                {/* TM No */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">TM No</Label>
                  <Input
                    value={tmNo}
                    onChange={(e) => setTmNo(e.target.value)}
                  />
                </div>

                {/* AO (Agricultural Officer) Selection */}
                <div className="space-y-1 md:col-span-2 lg:col-span-3">
                  <Label className="text-xs font-medium text-slate-700 flex items-center justify-between">
                    <span className="font-semibold text-blue-900">
                      AO (Agricultural Officer)
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Person who made this replacement (Search by Name or Ecode)
                    </span>
                  </Label>
                  <EmployeeSearchCombobox
                    value={aoId}
                    onChange={setAoId}
                    placeholder="Type Name or Ecode to select AO..."
                  />
                </div>

                {/* Ecode */}
                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-xs font-medium text-slate-600">Ecode</Label>
                  <MultiSelectInput
                    options={allUsersOptions}
                    selectedIds={userIds}
                    onChange={setUserIds}
                    placeholder="Select Ecode..."
                  />
                </div>

                {/* Field Support */}
                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-xs font-medium text-slate-600">Field Support By</Label>
                  <MultiSelectInput
                    options={managerOptions}
                    selectedIds={managerIds}
                    onChange={setManagerIds}
                    placeholder="Select Field Support..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Replacement Type & Reason */}
            <Card className="bg-white shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Replacement Type & Reason
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="replacementType"
                      value="First Replacement"
                      checked={replacementType === "First Replacement"}
                      onChange={(e) => setReplacementType(e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-sm text-slate-800">
                      First Replacement
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="replacementType"
                      value="Second Replacement"
                      checked={replacementType === "Second Replacement"}
                      onChange={(e) => setReplacementType(e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-sm text-slate-800">
                      Second Replacement
                    </span>
                  </label>
                </div>

                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-medium text-slate-700">
                    Reason for Replacement <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter detailed reason for replacement (e.g. damaged seals, expired batch, germination issue)..."
                    required
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Invoice Products Selection Section */}
            <Card className="bg-white shadow-sm border-slate-200 overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-base font-semibold text-slate-900">
                      Original Invoice Products
                    </CardTitle>
                    {invoiceItems.length > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 font-medium text-xs"
                      >
                        {selectedItems.length} of {invoiceItems.length} selected
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Select only the specific products being replaced. Quantities cannot exceed original invoiced units.
                  </CardDescription>
                </div>

                {invoiceItems.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllItems}
                      className="h-8 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                    >
                      <CheckSquare className="h-3.5 w-3.5 mr-1" />
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={deselectAllItems}
                      className="h-8 text-xs font-medium text-slate-600 hover:text-slate-800"
                    >
                      <Square className="h-3.5 w-3.5 mr-1" />
                      Deselect All
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-0">
                {isFetchingSale ? (
                  <div className="flex flex-col items-center justify-center p-8 space-y-2 text-slate-500">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                    <p className="text-sm font-medium">Fetching invoice products...</p>
                  </div>
                ) : invoiceItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-50/50">
                    <AlertCircle className="h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">
                      No invoice products loaded
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Please enter a valid Order Number above. The items from the original sale will automatically appear here for selective replacement.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-600">
                        <tr>
                          <th className="p-3 w-12 text-center">Replace?</th>
                          <th className="p-3">Product Name</th>
                          <th className="p-3 w-28">Type</th>
                          <th className="p-3 w-28 text-right">Invoiced Qty</th>
                          <th className="p-3 w-36 text-center">Replacement Qty</th>
                          <th className="p-3 w-28 text-right">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoiceItems.map((item) => (
                          <tr
                            key={item.id}
                            className={`transition-colors ${
                              item.isSelected
                                ? "bg-blue-50/40 hover:bg-blue-50/60"
                                : "opacity-60 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={item.isSelected}
                                onChange={() => toggleItemSelection(item.id)}
                                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-900">
                                {item.productName}
                              </div>
                              <div className="text-xs text-slate-500">
                                Unit: {item.unit} {item.brand && item.brand !== "-" && `• Brand: ${item.brand}`}
                              </div>
                            </td>
                            <td className="p-3">
                              {item.isFree ? (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[11px] font-medium">
                                  Free Item
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-600 text-[11px]">
                                  Regular
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-right font-medium text-slate-700">
                              {item.invoicedQty} {item.unit}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <Input
                                  type="number"
                                  min={1}
                                  max={item.invoicedQty}
                                  value={item.replacementQty}
                                  disabled={!item.isSelected}
                                  onChange={(e) =>
                                    updateItemQty(item.id, e.target.value)
                                  }
                                  className={`h-9 w-24 text-center font-bold ${
                                    item.isSelected
                                      ? "border-blue-400 bg-white text-blue-700 focus:ring-blue-500"
                                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                  }`}
                                />
                                <span className="text-xs text-slate-500">
                                  / {item.invoicedQty}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-right text-slate-600">
                              ₹{item.rate}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Summary Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 border-t border-slate-200 gap-3">
                      <div className="text-xs text-slate-600">
                        {selectedItems.length > 0 ? (
                          <span className="font-medium text-blue-700">
                            ✓ {selectedItems.length} product(s) marked for replacement
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium">
                            ⚠ No products selected yet. Check the boxes above to include items.
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-slate-500 text-xs">Total Replaced Units: </span>
                          <span className="font-bold text-slate-900 text-base">
                            {totalSelectedUnits}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Details Card */}
            <Card className="bg-white shadow-sm border-slate-200">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Customer Details
                </CardTitle>
                <CardDescription>
                  Auto-populated from the sales invoice. Can be updated if needed.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Village Search */}
                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-xs font-medium text-slate-600">Village Search API</Label>
                  <div className="flex gap-2">
                    <Input
                      value={villageSearch}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleVillageSearchAction()
                      }
                      onChange={(e) => setVillageSearch(e.target.value)}
                      placeholder="Type village name..."
                    />
                    <Button
                      type="button"
                      onClick={handleVillageSearchAction}
                      disabled={isSearchingVillage}
                      className="px-3"
                    >
                      {isSearchingVillage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {villageSearchResults.length > 0 && (
                    <select
                      className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onChange={(e) => {
                        const selected =
                          villageSearchResults[e.target.selectedIndex - 1];
                        if (selected) {
                          setVillage(selected.Name);
                          setDistrict(selected.District);
                          setState(selected.State);
                          setPin(selected.Pincode);
                          setVillageSearchResults([]);
                        }
                      }}
                    >
                      <option value="">-- Select Village Result --</option>
                      {villageSearchResults.map((v, i) => (
                        <option key={i} value={v.Name}>
                          {v.Name}, {v.District}, {v.State} ({v.Pincode})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Customer Name */}
                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-xs font-medium text-slate-600">
                    Customer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    list="customers-list"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      const existing = customers.find(
                        (c: any) => c.name === e.target.value,
                      );
                      if (existing) {
                        setCustomerId(existing.id);
                      } else {
                        setCustomerId("");
                      }
                    }}
                    placeholder="Customer Name"
                    required
                  />
                  <datalist id="customers-list">
                    {customers
                      .filter(
                        (c: any) =>
                          !villageSearch ||
                          (c.village &&
                            c.village
                              .toLowerCase()
                              .includes(villageSearch.toLowerCase())),
                      )
                      .map((c: any) => (
                        <option key={c.id} value={c.name}>
                          {c.mobile}
                        </option>
                      ))}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">
                    Village <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      list="villages-list"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      required
                    />
                    {isLoadingPincode && (
                      <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    <datalist id="villages-list">
                      {fetchedVillages.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">
                    Pincode <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                    pattern="^[1-9][0-9]{5}$"
                    title="6 digit pincode"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">District</Label>
                  <Input
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">State</Label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">Mandal/Tahsil</Label>
                  <Input
                    value={mandal}
                    onChange={(e) => setMandal(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">House No</Label>
                  <Input
                    value={houseNo}
                    onChange={(e) => setHouseNo(e.target.value)}
                  />
                </div>

                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-xs font-medium text-slate-600">Land Mark</Label>
                  <Input
                    value={landMark}
                    onChange={(e) => setLandMark(e.target.value)}
                  />
                </div>

                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-xs font-medium text-slate-600">S/O, W/O, D/O</Label>
                  <div className="flex gap-2">
                    <select className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                      <option>S/O</option>
                      <option>W/O</option>
                      <option>D/O</option>
                    </select>
                    <Input
                      className="flex-1"
                      value={so}
                      onChange={(e) => setSo(e.target.value)}
                      placeholder="Father/Spouse Name"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">Mobile No</Label>
                  <Input
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">Land Line No</Label>
                  <Input
                    value={landLineNo}
                    onChange={(e) => setLandLineNo(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">DOB / Age</Label>
                  <Input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-600">Marriage Date</Label>
                  <Input
                    type="date"
                    value={marriageDate}
                    onChange={(e) => setMarriageDate(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Bottom Submit Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                type="button"
                onClick={clearForm}
                className="min-h-[48px] px-6"
              >
                Clear
              </Button>
              <Link href="/replacements">
                <Button
                  variant="outline"
                  type="button"
                  className="min-h-[48px] px-6"
                >
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={createReplacement.isPending || selectedItems.length === 0}
                className="min-h-[48px] px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-sm"
              >
                {createReplacement.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Replacement ({selectedItems.length} items)
              </Button>
            </div>
          </form>
        )}
      </FeatureGate>
    </DashboardLayout>
  );
}

export default function NewReplacement() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </DashboardLayout>
      }
    >
      <ReplacementFormContent />
    </Suspense>
  );
}
