"use client";

import { useState, useMemo } from "react";
import { FeatureGate } from "@/app/_components/auth/FeatureGate";
import { DashboardLayout } from "@/app/_components/layout/DashboardLayout";
import { QuickAddProductModal } from "@/app/_components/inventory/QuickAddProductModal";
import { api } from "@/trpc/react";
import {
  Package,
  Plus,
  Search,
  Tag,
  Layers,
  Edit2,
  RefreshCw,
  Coins,
  ShieldAlert,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Product = {
  id: number;
  name: string;
  sku: string;
  price: string;
  category?: string | null;
  brand?: string | null;
  hsnCode?: string | null;
  minThreshold?: number | null;
  pointsPerQty?: string | null;
};

export default function ProductsPage() {
  const { data: user } = api.users.getMe.useQuery();
  const utils = api.useUtils();

  const {
    data: products = [],
    isLoading,
    isRefetching,
    refetch,
  } = api.inventory.getProducts.useQuery();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    sku: "",
    brand: "",
    category: "",
    price: "",
    pointsPerQty: "",
    minThreshold: "",
    hsnCode: "",
  });

  const isManagerOrAdmin =
    user?.role === "Admin" ||
    user?.role === "Developer" ||
    user?.role === "Manager";

  const updateProductMutation = api.inventory.updateProduct.useMutation({
    onSuccess: async () => {
      toast.success("Product updated successfully!");
      setEditingProduct(null);
      await utils.inventory.getProducts.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update product");
    },
  });

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setEditForm({
      name: p.name || "",
      sku: p.sku || "",
      brand: p.brand || "",
      category: p.category || "",
      price: p.price || "0",
      pointsPerQty: p.pointsPerQty || "0",
      minThreshold: p.minThreshold?.toString() || "10",
      hsnCode: p.hsnCode || "",
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const priceNum = parseFloat(editForm.price);
    if (!editForm.name.trim()) {
      toast.error("Product name cannot be empty");
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Valid price is required");
      return;
    }

    updateProductMutation.mutate({
      id: editingProduct.id,
      name: editForm.name.trim(),
      sku: editForm.sku.trim() || undefined,
      brand: editForm.brand.trim() || undefined,
      category: editForm.category.trim() || undefined,
      hsnCode: editForm.hsnCode.trim() || undefined,
      price: priceNum,
      pointsPerQty: editForm.pointsPerQty ? parseFloat(editForm.pointsPerQty) : 0,
      minThreshold: editForm.minThreshold ? parseInt(editForm.minThreshold, 10) : 10,
    });
  };

  // Derive unique categories and brands for filter pills
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand?.trim()) set.add(p.brand.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === "ALL" || p.category === selectedCategory;
      const matchesBrand =
        selectedBrand === "ALL" || p.brand === selectedBrand;

      return matchesSearch && matchesCat && matchesBrand;
    });
  }, [products, searchQuery, selectedCategory, selectedBrand]);

  return (
    <FeatureGate featureKey="sales">
      <DashboardLayout>
        <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                      Product Master
                    </h1>
                    <p className="text-sm font-medium text-slate-500">
                      Manage product catalog, SKUs, pricing & loyalty points
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                  disabled={isLoading || isRefetching}
                  className="h-11 rounded-xl border-slate-200 bg-white px-3.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>

                <Button
                  onClick={() => setIsQuickAddOpen(true)}
                  className="h-12 min-h-[48px] rounded-xl bg-blue-600 px-5 font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 active:scale-98 transition-all"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add New Product
                </Button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Total Products
                    </p>
                    <p className="text-xl font-bold text-slate-900">
                      {products.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Categories
                    </p>
                    <p className="text-xl font-bold text-slate-900">
                      {categories.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Brands
                    </p>
                    <p className="text-xl font-bold text-slate-900">
                      {brands.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Coins className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      With Points
                    </p>
                    <p className="text-xl font-bold text-slate-900">
                      {products.filter((p) => Number(p.pointsPerQty) > 0).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by product name, SKU, brand, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/50 pl-10 pr-10 text-sm focus:border-blue-500 focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Clear filters button if active */}
                {(searchQuery || selectedCategory !== "ALL" || selectedBrand !== "ALL") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("ALL");
                      setSelectedBrand("ALL");
                    }}
                    className="h-11 rounded-xl text-slate-500 hover:text-slate-900"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>

              {/* Category Pills */}
              {categories.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5 no-scrollbar text-xs">
                  <span className="font-semibold text-slate-400 whitespace-nowrap">
                    Category:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("ALL")}
                    className={`rounded-lg px-3 py-1.5 font-medium transition-all whitespace-nowrap ${
                      selectedCategory === "ALL"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-lg px-3 py-1.5 font-medium transition-all whitespace-nowrap ${
                        selectedCategory === cat
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Products Catalog Display */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="mt-3 text-sm font-medium text-slate-500">
                  Loading product catalog...
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Package className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">
                  No products found
                </h3>
                <p className="mt-1 text-sm text-slate-500 max-w-sm">
                  {searchQuery || selectedCategory !== "ALL" || selectedBrand !== "ALL"
                    ? "Try adjusting your search terms or filters to find the products."
                    : "No products exist in your catalog yet. Click below to add your first product."}
                </p>
                <div className="mt-6">
                  <Button
                    onClick={() => setIsQuickAddOpen(true)}
                    className="h-11 rounded-xl bg-blue-600 px-4 text-white hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product Now
                  </Button>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3.5">Product Details</th>
                        <th className="px-6 py-3.5">SKU</th>
                        <th className="px-6 py-3.5">Category</th>
                        <th className="px-6 py-3.5 text-right">Unit Price</th>
                        <th className="px-6 py-3.5 text-right">Points / Qty</th>
                        <th className="px-6 py-3.5 text-right">Min Threshold</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredProducts.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">
                                {p.name}
                              </span>
                              {p.brand && (
                                <span className="text-xs text-blue-600 font-medium">
                                  {p.brand}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {p.sku}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {p.category ? (
                              <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
                                {p.category}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-bold text-slate-900">
                              ₹{parseFloat(p.price || "0").toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {Number(p.pointsPerQty) > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 border border-amber-200/50">
                                <Coins className="h-3 w-3" />
                                {p.pointsPerQty}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600">
                            {p.minThreshold ?? 10}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(p)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit product"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-base leading-snug">
                            {p.name}
                          </h4>
                          {p.brand && (
                            <p className="text-xs font-semibold text-blue-600">
                              {p.brand}
                            </p>
                          )}
                          <p className="font-mono text-xs text-slate-500 mt-0.5">
                            SKU: {p.sku}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(p)}
                          className="h-9 w-9 p-0 rounded-xl border-slate-200 text-slate-600 hover:text-blue-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-2">
                          {p.category && (
                            <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
                              {p.category}
                            </span>
                          )}
                          {Number(p.pointsPerQty) > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                              <Coins className="h-3 w-3" />
                              {p.pointsPerQty} pts
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-base font-extrabold text-slate-900">
                            ₹{parseFloat(p.price || "0").toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Add Product Modal */}
        <QuickAddProductModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
        />

        {/* Edit Product Modal */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                    <Edit2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Edit Product
                    </h2>
                    <p className="text-xs text-slate-500">
                      Update product details, pricing, and point incentives
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!isManagerOrAdmin ? (
                <div className="p-6 text-center space-y-3">
                  <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto" />
                  <h3 className="font-bold text-slate-900">Permission Required</h3>
                  <p className="text-sm text-slate-500">
                    Only Managers and Admins can update existing products. Please contact your administrator.
                  </p>
                  <Button
                    onClick={() => setEditingProduct(null)}
                    className="w-full mt-4"
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-name" className="text-xs font-bold text-slate-700">
                      Product Name *
                    </Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      className="h-10 rounded-xl"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-sku" className="text-xs font-bold text-slate-700">
                        SKU / Code
                      </Label>
                      <Input
                        id="edit-sku"
                        value={editForm.sku}
                        onChange={(e) =>
                          setEditForm({ ...editForm, sku: e.target.value })
                        }
                        className="h-10 rounded-xl font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-brand" className="text-xs font-bold text-slate-700">
                        Brand / Line
                      </Label>
                      <Input
                        id="edit-brand"
                        value={editForm.brand}
                        onChange={(e) =>
                          setEditForm({ ...editForm, brand: e.target.value })
                        }
                        className="h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-category" className="text-xs font-bold text-slate-700">
                        Category / Form
                      </Label>
                      <Input
                        id="edit-category"
                        value={editForm.category}
                        onChange={(e) =>
                          setEditForm({ ...editForm, category: e.target.value })
                        }
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-price" className="text-xs font-bold text-slate-700">
                        Base Price (₹) *
                      </Label>
                      <Input
                        id="edit-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.price}
                        onChange={(e) =>
                          setEditForm({ ...editForm, price: e.target.value })
                        }
                        className="h-10 rounded-xl font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-points" className="text-xs font-bold text-slate-700">
                        Points per Qty
                      </Label>
                      <Input
                        id="edit-points"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.pointsPerQty}
                        onChange={(e) =>
                          setEditForm({ ...editForm, pointsPerQty: e.target.value })
                        }
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-threshold" className="text-xs font-bold text-slate-700">
                        Min Threshold Alert
                      </Label>
                      <Input
                        id="edit-threshold"
                        type="number"
                        min="0"
                        value={editForm.minThreshold}
                        onChange={(e) =>
                          setEditForm({ ...editForm, minThreshold: e.target.value })
                        }
                        className="h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingProduct(null)}
                      className="h-10 rounded-xl px-4"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateProductMutation.isPending}
                      className="h-10 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700"
                    >
                      {updateProductMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </DashboardLayout>
    </FeatureGate>
  );
}

