"use client";

import { FeatureGate } from "@/app/_components/auth/FeatureGate";
import { api } from "@/trpc/react";
import {
  Package,
  AlertTriangle,
  ArrowRightLeft,
  TrendingUp,
  Search,
  Plus,
  Filter,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/app/_components/layout/DashboardLayout";

export default function InventoryPage() {
  const { data: user } = api.users.getMe.useQuery();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: stock,
    isLoading,
    refetch,
  } = api.inventory.getBranchStock.useQuery({}, { enabled: !!user });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    price: "",
    category: "",
    hsnCode: "",
    pointsPerQty: "",
  });

  const addProductMutation = api.inventory.addProduct.useMutation({
    onSuccess: () => {
      toast.success("Product added successfully");
      setIsAddModalOpen(false);
      setNewProduct({ name: "", sku: "", price: "", category: "", hsnCode: "", pointsPerQty: "" });
      void refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add product");
    },
  });

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price) {
      toast.error("Please fill all fields");
      return;
    }
    addProductMutation.mutate({
      name: newProduct.name,
      sku: newProduct.sku,
      price: parseFloat(newProduct.price),
      category: newProduct.category || undefined,
      hsnCode: newProduct.hsnCode || undefined,
      pointsPerQty: newProduct.pointsPerQty ? parseFloat(newProduct.pointsPerQty) : undefined,
    });
  };

  const filteredStock = stock?.filter(
    (item) =>
      item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const stats = [
    {
      label: "Total SKUs",
      value: stock?.length ?? 0,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Inventory Value",
      value: `₹${stock?.reduce((acc, curr) => acc + Number(curr.product.price) * curr.quantity, 0).toLocaleString() ?? 0}`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Out of Stock",
      value: stock?.filter((s) => s.quantity === 0).length ?? 0,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Low Stock",
      value:
        stock?.filter((s) => s.quantity > 0 && s.quantity < 10).length ?? 0,
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <DashboardLayout>
      <FeatureGate featureKey="inventory">
        <div className="mx-auto max-w-7xl space-y-8 p-8">
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-foreground text-3xl font-bold tracking-tight">
                Inventory Command Center
              </h1>
              <p className="text-muted-foreground mt-1">
                Real-time stock tracking for your branch
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-primary text-primary-foreground flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold shadow-[0_1px_3px_rgba(37,99,235,0.2)] transition-all hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    {stat.label}
                  </p>
                  <div className={cn("rounded-lg p-2.5 shadow-sm", stat.bg)}>
                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                  </div>
                </div>
                <p className="text-2xl font-black tracking-tight text-slate-900 tabular-nums dark:text-slate-100">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Inventory List */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-border flex flex-col justify-between gap-4 border-b bg-slate-50/50 p-5 md:flex-row md:items-center dark:bg-slate-900/50">
              <div className="relative max-w-md flex-1">
                <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by SKU or Product Name..."
                  className="focus:ring-primary/20 focus:border-primary w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-11 text-sm font-medium shadow-sm transition-all outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
              </div>
            </div>

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
              ) : filteredStock?.length === 0 ? (
                <div className="px-6 py-12 text-center font-medium text-slate-500 italic">
                  No products found matching your search.
                </div>
              ) : (
                filteredStock?.map((item) => (
                  <div
                    key={item.productId}
                    className="group flex flex-col justify-between gap-4 px-4 py-2.5 transition-colors odd:bg-white even:bg-slate-100 hover:bg-slate-200/50 sm:flex-row sm:items-center dark:odd:bg-slate-900 dark:even:bg-slate-800 dark:hover:bg-slate-800/80"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 text-primary hidden h-12 w-12 items-center justify-center rounded-xl font-bold shadow-sm sm:flex">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                          {item.product.name}
                        </span>
                        <span className="mt-0.5 font-mono text-xs text-slate-500">
                          {item.product.sku}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-6 sm:w-1/2 sm:justify-end">
                      <div className="flex flex-col sm:items-end">
                        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                          Price
                        </span>
                        <span className="text-lg font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                          ₹{item.product.price}
                        </span>
                      </div>

                      <div className="flex w-16 flex-col sm:items-end">
                        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                          In Stock
                        </span>
                        <span className="text-lg font-bold text-slate-900 tabular-nums dark:text-slate-100">
                          {item.quantity}
                        </span>
                      </div>

                      <div
                        className={cn(
                          "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm",
                          item.quantity === 0
                            ? "bg-rose-500 text-white"
                            : item.quantity < 10
                              ? "bg-amber-400 text-amber-950"
                              : "bg-emerald-500 text-white",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full shadow-sm",
                            item.quantity === 0
                              ? "animate-pulse bg-white"
                              : item.quantity < 10
                                ? "bg-amber-950/50"
                                : "bg-white",
                          )}
                        />
                        {item.quantity === 0
                          ? "OUT OF STOCK"
                          : item.quantity < 10
                            ? "LOW STOCK"
                            : "IN STOCK"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </FeatureGate>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="animate-in fade-in zoom-in-95 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl duration-200 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Add New Product
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 transition-colors hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Product Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Premium Filter"
                  className="focus:ring-primary/20 focus:border-primary w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-all outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    SKU (Auto-generated)
                  </label>
                  <input
                    type="text"
                    disabled
                    placeholder="Auto-generated"
                    className="focus:ring-primary/20 focus:border-primary w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm uppercase transition-all outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800 opacity-70 cursor-not-allowed"
                    value={newProduct.sku}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        sku: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="focus:ring-primary/20 focus:border-primary w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-all outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fertilizer"
                    className="focus:ring-primary/20 focus:border-primary w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-all outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
                    value={newProduct.category}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, category: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 00005"
                    className="focus:ring-primary/20 focus:border-primary w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-all outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
                    value={newProduct.hsnCode}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, hsnCode: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Points Per Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 10"
                    className="focus:ring-primary/20 focus:border-primary w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm transition-all outline-none focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
                    value={newProduct.pointsPerQty}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, pointsPerQty: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-900/50">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                disabled={addProductMutation.isPending}
                className="bg-primary text-primary-foreground flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold shadow-[0_1px_3px_rgba(37,99,235,0.2)] transition-all hover:opacity-90 disabled:opacity-50"
              >
                {addProductMutation.isPending ? "Adding..." : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
