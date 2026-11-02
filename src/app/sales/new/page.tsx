"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FeatureGate } from "@/app/_components/auth/FeatureGate";
import { DashboardLayout } from "../../_components/layout/DashboardLayout";
import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  WifiOff,
  Search,
  X,
  Plus,
  Trash2,
  PackagePlus,
  AlertCircle,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { FileUploader } from "@/app/_components/ui/FileUploader";
import { MultiSelectInput } from "@/app/_components/ui/MultiSelectInput";
import { usePincodeLookup } from "@/hooks/usePincodeLookup";
import { QuickAddProductModal } from "@/app/_components/inventory/QuickAddProductModal";

export default function NewSale() {
  const router = useRouter();

  const [branchId, setBranchId] = useState("");
  const [success, setSuccess] = useState(false);
  const [newSaleId, setNewSaleId] = useState<number | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [transactionNumber, setTransactionNumber] = useState("");
  const [invDate, setInvDate] = useState("");

  const [cmrId, setCmrId] = useState("");
  const [tmNo, setTmNo] = useState("");
  const [docMonth, setDocMonth] = useState("");

  useEffect(() => {
    setDocMonth(
      new Date()
        .toLocaleString("en-US", { month: "short", year: "numeric" })
        .replace(" ", "-"),
    );
  }, []);

  const [userIds, setUserIds] = useState<string[]>([]);
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const [saleType, setSaleType] = useState("Direct to Customer from PU");
  const [oldAdvanceOrderNumber, setOldAdvanceOrderNumber] = useState("");

  const [customerId, setCustomerId] = useState("");

  // Customer details
  const [villageSearch, setVillageSearch] = useState("");
  const [isSearchingVillage, setIsSearchingVillage] = useState(false);
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

  const { data: branches = [] } = api.inventory.getBranches.useQuery();
  const { data: products = [] } = api.inventory.getProducts.useQuery();

  // Quick-Add Product Modal State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [activeRowIdForProductAdd, setActiveRowIdForProductAdd] = useState<number | null>(null);

  const { data: nextInvoiceId } = api.sales.getNextInvoiceId.useQuery();
  useEffect(() => {
    if (nextInvoiceId && !transactionNumber) setTransactionNumber(nextInvoiceId);
  }, [nextInvoiceId, transactionNumber]);

  const [debouncedTxnNumber, setDebouncedTxnNumber] = useState(transactionNumber);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTxnNumber(transactionNumber.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [transactionNumber]);

  const { data: duplicateCheck, isLoading: isCheckingDuplicate } =
    api.sales.checkInvoiceNumber.useQuery(
      { invoiceNumber: debouncedTxnNumber },
      { enabled: !!debouncedTxnNumber },
    );

  const handleInvDateChange = (val: string) => {
    setInvDate(val);
    if (val) {
      const parts = val.split("-");
      if (parts.length === 3) {
        const d = new Date(
          parseInt(parts[0]!, 10),
          parseInt(parts[1]!, 10) - 1,
          parseInt(parts[2]!, 10),
        );
        if (!isNaN(d.getTime())) {
          const formatted = d
            .toLocaleString("en-US", { month: "short", year: "numeric" })
            .replace(" ", "-");
          setDocMonth(formatted);
        }
      }
    }
  };

  const { data: customers = [] } = api.crm.getBranchCustomers.useQuery();

  const {
    fetchedDistrict,
    fetchedState,
    villages: fetchedVillages,
    isLoading: isLoadingPincode,
  } = usePincodeLookup(pin);

  const [villageSearchResults, setVillageSearchResults] = useState<
    { Name: string; District: string; State: string; Pincode: string }[]
  >([]);

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

  const fieldSupportOptions = orgUsers.map((u) => ({
    id: u.id,
    label: u.employeeCode
      ? `${u.employeeCode} - ${u.firstName} ${u.lastName || ""}`
      : `${u.firstName} ${u.lastName || ""}`,
  }));

  // Populate customer fields on change
  useEffect(() => {
    if (customerId) {
      const c: any = customers.find((x) => x.id === customerId);
      if (c) {
        setCustomerName(c.name || "");
        setMobileNo(c.mobile || "");
        setLandLineNo(c.landlineNo || "");
        setPin(c.pincode || "");
        setVillage(c.village || "");
        setDistrict(c.district || "");
        setState(c.state || "");
        setHouseNo(String(c.address || ""));
        setSo(String(c.fatherName || ""));
        if (c.dob)
          setDob(
            new Date(c.dob as string | number | Date)
              .toISOString()
              .split("T")[0] || "",
          );
        if (c.marriageDate)
          setMarriageDate(
            new Date(c.marriageDate as string | number | Date)
              .toISOString()
              .split("T")[0] || "",
          );
      }
    } else {
      setCustomerName("");
      setMobileNo("");
      setLandLineNo("");
      setPin("");
      setVillage("");
      setDistrict("");
      setState("");
      setHouseNo("");
      setSo("");
      setDob("");
      setMarriageDate("");
    }
  }, [customerId, customers]);

  // Product grids
  const [saleItems, setSaleItems] = useState([
    {
      id: Date.now(),
      productId: "",
      quantity: "1",
      rate: "",
      amount: "",
      ptsPerQty: "",
      totalPts: "",
    },
  ]);

  const [freeItems, setFreeItems] = useState([
    {
      id: Date.now() + 1,
      productId: "",
      offerNumber: "",
      freeProduct: "",
      freeQty: "",
    },
  ]);

  const [invoiceAmount, setInvoiceAmount] = useState("");

  useEffect(() => {
    const total = saleItems.reduce(
      (acc, item) => acc + (parseFloat(item.amount) || 0),
      0,
    );
    setInvoiceAmount(total > 0 ? total.toFixed(2) : "");
  }, [saleItems]);

  const createSale = api.sales.createSale.useMutation({
    onSuccess: (data) => {
      if (data) {
        setSuccess(true);
        setNewSaleId(data.id);
        router.refresh();
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      toast.error("Please select a branch");
      return;
    }

    // Combine items
    const validSaleItems = saleItems
      .filter((i) => i.productId && i.quantity)
      .map((i) => ({
        productId: parseInt(i.productId),
        quantity: parseInt(i.quantity),
        isFree: false,
        ptsPerQty: i.ptsPerQty,
        totalPts: i.totalPts,
      }));

    const validFreeItems = freeItems
      .filter((i) => i.productId && i.freeQty)
      .map((i) => ({
        productId: parseInt(i.productId),
        quantity: parseInt(i.freeQty),
        isFree: true,
        offerNumber: i.offerNumber,
      }));

    const allItems = [...validSaleItems, ...validFreeItems];

    if (allItems.length === 0) {
      toast.error("Please select a product and quantity for at least one item");
      return;
    }

    if (!orderNumber?.trim()) {
      toast.error("Order No is required");
      return;
    }

    if (duplicateCheck?.exists) {
      toast.error(`Invoice number "${transactionNumber}" already exists! Please choose a unique invoice number.`);
      return;
    }

    if (!customerName?.trim()) {
      toast.error("Customer Name is required");
      return;
    }

    if (!pin || !/^[1-9][0-9]{5}$/.test(pin)) {
      toast.error("Valid 6-digit Pincode is required");
      return;
    }

    if (!invoiceAmount || parseFloat(invoiceAmount) < 0) {
      toast.error("Valid Invoice Amount is required");
      return;
    }

    const saleData = {
      branchId: parseInt(branchId),
      pincode: pin === "" ? undefined : pin,
      addressLine1: houseNo === "" ? undefined : houseNo,
      landmark: landMark === "" ? undefined : landMark,
      area: mandal === "" ? undefined : mandal,
      city: district === "" ? undefined : district,
      state: state === "" ? undefined : state,
      cmrId: cmrId === "" ? undefined : cmrId,
      tmNo: tmNo === "" ? undefined : tmNo,
      saleType: saleType,
      oldAdvanceOrderNumber:
        saleType === "Free product against old advance"
          ? oldAdvanceOrderNumber || undefined
          : undefined,
      orderNumber: orderNumber,
      transactionNumber:
        transactionNumber === "" ? undefined : transactionNumber,
      customerName: customerName,
      customerAddress: houseNo,
      invoiceAmount: invoiceAmount === "" ? undefined : invoiceAmount,
      advancePaymentAmount: "0",
      receivedAmount: "0",
      registerType: "Sale" as const,
      customerId: customerId === "" ? undefined : customerId,
      tradeDiscount: "0",
      basicInvoiceValue: "0",
      cgst: "0",
      sgst: "0",
      igst: "0",
      userIds,
      managerIds,
      items: allItems,
    };

    if (!navigator.onLine) {
      const { addToOfflineQueue } = await import("@/lib/offline-db");
      await addToOfflineQueue({
        type: "createSale",
        data: saleData,
        createdAt: Date.now(),
      });
      setSuccess(true);
      setNewSaleId(-1);
      return;
    }

    createSale.mutate(saleData);
  };

  const mainQtyTotal = saleItems.reduce(
    (acc, item) => acc + (parseInt(item.quantity) || 0),
    0,
  );
  const freeQtyTotal = freeItems.reduce(
    (acc, item) => acc + (parseInt(item.freeQty) || 0),
    0,
  );
  const totalQty = mainQtyTotal + freeQtyTotal;

  const clearForm = () => {
    setBranchId("");
    setOrderNumber("");
    setOrderDate("");
    setTransactionNumber("");
    setInvDate("");
    setCmrId("");
    setTmNo("");
    setDocMonth(
      new Date()
        .toLocaleString("en-US", { month: "short", year: "numeric" })
        .replace(" ", "-"),
    );
    setUserIds([]);
    setManagerIds([]);
    setSaleType("Direct to Customer from PU");
    setOldAdvanceOrderNumber("");
    setCustomerId("");
    setVillageSearch("");
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
    setSaleItems([
      {
        id: Date.now(),
        productId: "",
        quantity: "1",
        rate: "",
        amount: "",
        ptsPerQty: "",
        totalPts: "",
      },
    ]);
    setFreeItems([
      {
        id: Date.now() + 1,
        productId: "",
        offerNumber: "",
        freeProduct: "",
        freeQty: "",
      },
    ]);
    setInvoiceAmount("");
  };

  const updateSaleItem = (id: number, field: string, value: string) => {
    // Quick Add Trigger from select option
    if (field === "productId" && value === "__NEW__") {
      setActiveRowIdForProductAdd(id);
      setIsQuickAddOpen(true);
      return;
    }

    setSaleItems(
      saleItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        // Auto-populate from product if productId changes
        if (field === "productId") {
          const prod = products.find((p) => p.id === parseInt(value, 10));
          if (prod) {
            updated.rate = prod.price?.toString() || "0";
            updated.ptsPerQty = prod.pointsPerQty?.toString() || "0";
          }
        }

        const qty = parseFloat(updated.quantity) || 0;
        const rate = parseFloat(updated.rate) || 0;
        const pts = parseFloat(updated.ptsPerQty) || 0;

        if (field === "quantity" || field === "rate" || field === "productId") {
          updated.amount = (qty * rate).toFixed(2);
        }
        if (
          field === "quantity" ||
          field === "ptsPerQty" ||
          field === "productId"
        ) {
          updated.totalPts = (qty * pts).toFixed(2);
        }

        return updated;
      }),
    );
  };

  const handleProductCreated = (newProduct: {
    id: number;
    name: string;
    sku: string;
    price: string;
  }) => {
    if (activeRowIdForProductAdd) {
      setSaleItems((prev) =>
        prev.map((item) => {
          if (item.id !== activeRowIdForProductAdd) return item;
          const qty = parseFloat(item.quantity) || 1;
          const rate = parseFloat(newProduct.price) || 0;
          return {
            ...item,
            productId: newProduct.id.toString(),
            rate: newProduct.price,
            amount: (qty * rate).toFixed(2),
          };
        }),
      );
    } else {
      const rate = parseFloat(newProduct.price) || 0;
      setSaleItems((prev) => [
        ...prev.filter((i) => i.productId),
        {
          id: Date.now(),
          productId: newProduct.id.toString(),
          quantity: "1",
          rate: newProduct.price,
          amount: (1 * rate).toFixed(2),
          ptsPerQty: "0",
          totalPts: "0",
        },
      ]);
    }
    setActiveRowIdForProductAdd(null);
  };

  const updateFreeItem = (id: number, field: string, value: string) => {
    if (field === "productId" && value === "__NEW__") {
      setIsQuickAddOpen(true);
      return;
    }
    setFreeItems(
      freeItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const parsedInvoice = parseFloat(invoiceAmount) || 0;
  const balanceAmount = parsedInvoice.toFixed(2);

  return (
    <DashboardLayout>
      <FeatureGate featureKey="sales">
        {success && newSaleId ? (
          <div className="mx-auto flex max-w-4xl flex-col space-y-6">
            <Card
              className={cn(
                "border-primary/20",
                newSaleId === -1
                  ? "border-orange-200 bg-orange-50"
                  : "bg-primary/5",
              )}
            >
              <CardContent className="pt-6 text-center">
                <div
                  className={cn(
                    "mb-4 inline-flex rounded-full p-3",
                    newSaleId === -1 ? "bg-orange-100" : "bg-primary/20",
                  )}
                >
                  {newSaleId === -1 ? (
                    <WifiOff className="h-10 w-10 text-orange-600" />
                  ) : (
                    <CheckCircle className="text-primary h-10 w-10" />
                  )}
                </div>
                <h2 className="text-2xl font-bold">
                  {newSaleId === -1
                    ? "Sale Saved Locally!"
                    : "Sale Logged Successfully!"}
                </h2>
                <p className="text-muted-foreground mt-2">
                  {newSaleId === -1 ? "You are offline." : "Saved."}
                </p>
              </CardContent>
            </Card>

            {newSaleId !== -1 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-muted-foreground text-sm font-semibold uppercase">
                    Upload Invoice / Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FileUploader
                    entityType="sale"
                    entityId={newSaleId}
                    maxFiles={3}
                    onUploadComplete={() => undefined}
                  />
                  <div className="mt-6 flex justify-center">
                    <Link href="/sales">
                      <Button variant="outline">Skip & Finish</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex justify-center">
                <Link href="/sales">
                  <Button className="px-8">Return</Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-5xl space-y-6 pb-12"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  New Sales Invoice
                </h1>
                <p className="text-muted-foreground">
                  B2C Direct to Customer from PU
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" type="button" onClick={clearForm}>
                  Clear
                </Button>
                <Link href="/sales">
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={createSale.isPending}>
                  {createSale.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Invoice
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Document Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Company */}
                <div className="space-y-1">
                  <Label>Company</Label>
                  <Input
                    value="Virat Bio Plaantec Private Limited"
                    readOnly
                    className="bg-muted"
                  />
                </div>
                {/* Branch */}
                <div className="space-y-1">
                  <Label>
                    Branch <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Order No */}
                <div className="space-y-1">
                  <Label>
                    Order No <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    required
                  />
                </div>
                {/* Order Date */}
                <div className="space-y-1">
                  <Label>Order Date</Label>
                  <Input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
                {/* Tax Inv No */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tax-inv-no">Tax Inv No</Label>
                    {isCheckingDuplicate && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-normal">
                        <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="tax-inv-no"
                      value={transactionNumber}
                      onChange={(e) => setTransactionNumber(e.target.value)}
                      placeholder="e.g. INV-00001"
                      className={cn(
                        duplicateCheck?.exists &&
                          "border-red-500 focus-visible:ring-red-500/20 pr-9 text-red-900 bg-red-50/40",
                        !duplicateCheck?.exists &&
                          debouncedTxnNumber &&
                          !isCheckingDuplicate &&
                          "border-emerald-500 focus-visible:ring-emerald-500/20 pr-9",
                      )}
                    />
                    {duplicateCheck?.exists && (
                      <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                    )}
                    {!duplicateCheck?.exists &&
                      debouncedTxnNumber &&
                      !isCheckingDuplicate && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                      )}
                  </div>
                  {duplicateCheck?.exists && (
                    <p className="text-xs font-semibold text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Invoice &quot;{transactionNumber}&quot; already exists!
                    </p>
                  )}
                  {!duplicateCheck?.exists &&
                    debouncedTxnNumber &&
                    !isCheckingDuplicate && (
                      <p className="text-xs font-medium text-emerald-600 flex items-center gap-1 mt-1">
                        <Check className="h-3.5 w-3.5 shrink-0" />
                        Invoice number available
                      </p>
                    )}
                </div>
                {/* Inv Date */}
                <div className="space-y-1">
                  <Label>Inv Date</Label>
                  <Input
                    type="date"
                    value={invDate}
                    onChange={(e) => handleInvDateChange(e.target.value)}
                  />
                </div>
                {/* DocMonth */}
                <div className="space-y-1">
                  <Label>Doc Month</Label>
                  <Input
                    value={docMonth}
                    onChange={(e) => setDocMonth(e.target.value)}
                  />
                </div>
                {/* CMR ID */}
                <div className="space-y-1">
                  <Label>CMR ID</Label>
                  <Input
                    value={cmrId}
                    onChange={(e) => setCmrId(e.target.value)}
                  />
                </div>
                {/* TM No */}
                <div className="space-y-1">
                  <Label>TM No</Label>
                  <Input
                    value={tmNo}
                    onChange={(e) => setTmNo(e.target.value)}
                  />
                </div>
                {/* Ecode */}
                <div className="space-y-1 lg:col-span-2">
                  <Label>Ecode</Label>
                  <MultiSelectInput
                    options={allUsersOptions}
                    selectedIds={userIds}
                    onChange={setUserIds}
                    placeholder="Select Ecode..."
                  />
                </div>
                {/* Field Support */}
                <div className="space-y-1 lg:col-span-2">
                  <Label>Field Support By</Label>
                  <MultiSelectInput
                    options={fieldSupportOptions}
                    selectedIds={managerIds}
                    onChange={setManagerIds}
                    placeholder="Search employee by code or name for Field Support..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sale Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="saleType"
                      value="Direct to Customer from PU"
                      checked={saleType === "Direct to Customer from PU"}
                      onChange={(e) => setSaleType(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="font-medium text-sm">
                      Direct to Customer from PU
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="saleType"
                      value="Free product against old advance"
                      checked={
                        saleType === "Free product against old advance"
                      }
                      onChange={(e) => setSaleType(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="font-medium text-sm">
                      Free product against old advance
                    </span>
                  </label>
                </div>
                {saleType === "Free product against old advance" && (
                  <div className="w-full md:w-1/3 space-y-1">
                    <Label>
                      Old Advance Order No{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      value={oldAdvanceOrderNumber}
                      onChange={(e) => setOldAdvanceOrderNumber(e.target.value)}
                      required
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Village Search */}
                <div className="space-y-1 lg:col-span-2">
                  <Label>Village Search</Label>
                  <div className="flex gap-2">
                    <Input
                      value={villageSearch}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleVillageSearchAction()
                      }
                      onChange={(e) => setVillageSearch(e.target.value)}
                      placeholder="Type village name to search API..."
                    />
                    <Button
                      type="button"
                      onClick={handleVillageSearchAction}
                      disabled={isSearchingVillage}
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
                      className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                  <Label>
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
                    placeholder="Type or select customer..."
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
                  <Label>
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
                  <Label>
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
                  <Label>District</Label>
                  <Input
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>State</Label>
                  <Input
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Mandal/Tahsil</Label>
                  <Input
                    value={mandal}
                    onChange={(e) => setMandal(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>House No</Label>
                  <Input
                    value={houseNo}
                    onChange={(e) => setHouseNo(e.target.value)}
                  />
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <Label>Land Mark</Label>
                  <Input
                    value={landMark}
                    onChange={(e) => setLandMark(e.target.value)}
                  />
                </div>

                <div className="space-y-1 lg:col-span-2">
                  <Label>S/O, W/O, D/O</Label>
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
                  <Label>Mobile No</Label>
                  <Input
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Land Line No</Label>
                  <Input
                    value={landLineNo}
                    onChange={(e) => setLandLineNo(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>DOB / Age</Label>
                  <Input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Marriage Date</Label>
                  <Input
                    type="date"
                    value={marriageDate}
                    onChange={(e) => setMarriageDate(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Sale Products Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>
                  Sale Products <span className="text-red-500">*</span>
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveRowIdForProductAdd(
                        saleItems[saleItems.length - 1]?.id ?? null,
                      );
                      setIsQuickAddOpen(true);
                    }}
                    className="border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100 font-semibold"
                  >
                    <PackagePlus className="w-4 h-4 mr-1 text-blue-600" /> + Add
                    New Product
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSaleItems([
                        {
                          id: Date.now(),
                          productId: "",
                          quantity: "1",
                          rate: "",
                          amount: "",
                          ptsPerQty: "",
                          totalPts: "",
                        },
                      ])
                    }
                  >
                    <X className="w-4 h-4 mr-1 text-red-500" /> Clear
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSaleItems([
                        ...saleItems,
                        {
                          id: Date.now(),
                          productId: "",
                          quantity: "1",
                          rate: "",
                          amount: "",
                          ptsPerQty: "",
                          totalPts: "",
                        },
                      ])
                    }
                  >
                    <Plus className="w-4 h-4 mr-1 text-green-500" /> Add Row
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="font-medium p-3 w-12 text-center rounded-tl-md">
                        Sl
                      </th>
                      <th className="font-medium p-3">Main Product</th>
                      <th className="font-medium p-3 w-28">Brand</th>
                      <th className="font-medium p-3 w-24">Unit</th>
                      <th className="font-medium p-3 w-28 text-right">Qty</th>
                      <th className="font-medium p-3 w-32 text-right">Rate</th>
                      <th className="font-medium p-3 w-32 text-right">Amount</th>
                      <th className="font-medium p-3 w-28 text-right rounded-tr-md">
                        TotalPts
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleItems.map((item: any, idx: number) => {
                      const matchedProd = products.find(
                        (p: any) => p.id === parseInt(item.productId, 10),
                      );
                      return (
                        <tr key={item.id} className="border-b">
                          <td className="p-2 text-center font-medium">
                            {idx + 1}
                          </td>
                          <td className="p-2">
                            <select
                              value={item.productId}
                              onChange={(e) =>
                                updateSaleItem(
                                  item.id,
                                  "productId",
                                  e.target.value,
                                )
                              }
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium"
                            >
                              <option value="">Select Product...</option>
                              {products.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (₹{p.price})
                                </option>
                              ))}
                              <option
                                value="__NEW__"
                                className="font-bold text-blue-600"
                              >
                                + Add New Product...
                              </option>
                            </select>
                          </td>
                          <td className="p-2">
                            <Input
                              disabled
                              value={matchedProd?.brand || "-"}
                              className="h-9 bg-muted/50 text-xs text-slate-600"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              disabled
                              value={matchedProd?.category || "Unit"}
                              className="h-9 bg-muted/50 text-xs text-center text-slate-600"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateSaleItem(
                                  item.id,
                                  "quantity",
                                  e.target.value,
                                )
                              }
                              className="h-9 text-right"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={item.rate}
                              onChange={(e) =>
                                updateSaleItem(item.id, "rate", e.target.value)
                              }
                              className="h-9 text-right font-medium"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={item.amount}
                              onChange={(e) =>
                                updateSaleItem(
                                  item.id,
                                  "amount",
                                  e.target.value,
                                )
                              }
                              className="h-9 text-right font-bold text-slate-900"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={item.totalPts}
                              onChange={(e) =>
                                updateSaleItem(
                                  item.id,
                                  "totalPts",
                                  e.target.value,
                                )
                              }
                              className="h-9 text-right"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Free Products Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Free Products</CardTitle>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFreeItems([
                        {
                          id: Date.now() + 1,
                          productId: "",
                          offerNumber: "",
                          freeProduct: "",
                          freeQty: "",
                        },
                      ])
                    }
                  >
                    <X className="w-4 h-4 mr-1 text-red-500" /> Clear
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFreeItems([
                        ...freeItems,
                        {
                          id: Date.now() + 1,
                          productId: "",
                          offerNumber: "",
                          freeProduct: "",
                          freeQty: "",
                        },
                      ])
                    }
                  >
                    <Plus className="w-4 h-4 mr-1 text-green-500" /> Add Row
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="font-medium p-3 w-12 text-center rounded-tl-md">
                        Sl
                      </th>
                      <th className="font-medium p-3">Main Product</th>
                      <th className="font-medium p-3 w-40">Offer Number</th>
                      <th className="font-medium p-3">Free Product</th>
                      <th className="font-medium p-3 w-24">Free Unit</th>
                      <th className="font-medium p-3 w-12 text-center rounded-tr-md">
                        Del
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {freeItems.map((item: any, idx: number) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2 text-center font-medium">
                          {idx + 1}
                        </td>
                        <td className="p-2">
                          <select
                            value={item.productId}
                            onChange={(e) =>
                              updateFreeItem(
                                item.id,
                                "productId",
                                e.target.value,
                              )
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="">Select Product...</option>
                            {products.map((p: any) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.offerNumber}
                            onChange={(e) =>
                              updateFreeItem(
                                item.id,
                                "offerNumber",
                                e.target.value,
                              )
                            }
                            className="h-9"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={item.freeProduct}
                            onChange={(e) =>
                              updateFreeItem(
                                item.id,
                                "freeProduct",
                                e.target.value,
                              )
                            }
                            className="h-9"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.freeQty}
                            onChange={(e) =>
                              updateFreeItem(
                                item.id,
                                "freeQty",
                                e.target.value,
                              )
                            }
                            className="h-9 text-right"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => {
                              if (freeItems.length > 1)
                                setFreeItems(
                                  freeItems.filter((f: any) => f.id !== item.id),
                                );
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row justify-end gap-12">
                  {/* Units Summary */}
                  <div className="space-y-2 w-full md:w-64">
                    <h3 className="font-semibold text-muted-foreground mb-3 uppercase text-xs tracking-wider">
                      Units Summary
                    </h3>
                    <div className="flex justify-between items-center text-sm">
                      <span>Main Unit:</span>
                      <span className="font-medium">{mainQtyTotal}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Free Unit:</span>
                      <span className="font-medium">{freeQtyTotal}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 border-t font-semibold">
                      <span>Total Unit:</span>
                      <span>{totalQty}</span>
                    </div>
                  </div>

                  {/* Financials */}
                  <div className="space-y-2 w-full md:w-64">
                    <h3 className="font-semibold text-muted-foreground mb-3 uppercase text-xs tracking-wider">
                      Financials
                    </h3>
                    <div className="flex justify-between items-center text-sm">
                      <span>Invoice Amount:</span>
                      <span className="font-medium">
                        ₹ {invoiceAmount || "0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-lg pt-2 border-t font-bold text-primary">
                      <span>Balance:</span>
                      <span>₹ {balanceAmount}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Add Product Modal */}
            <QuickAddProductModal
              isOpen={isQuickAddOpen}
              onClose={() => {
                setIsQuickAddOpen(false);
                setActiveRowIdForProductAdd(null);
              }}
              onProductCreated={handleProductCreated}
            />
          </form>
        )}
      </FeatureGate>
    </DashboardLayout>
  );
}
