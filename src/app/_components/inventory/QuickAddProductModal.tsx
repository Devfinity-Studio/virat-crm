"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Loader2, Plus, PackagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuickAddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated?: (product: {
    id: number;
    name: string;
    sku: string;
    price: string;
    brand?: string | null;
    category?: string | null;
  }) => void;
  defaultName?: string;
}

export function QuickAddProductModal({
  isOpen,
  onClose,
  onProductCreated,
  defaultName = "",
}: QuickAddProductModalProps) {
  const [name, setName] = useState(defaultName);
  const [price, setPrice] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [sku, setSku] = useState("");
  const [pointsPerQty, setPointsPerQty] = useState("");

  const utils = api.useUtils();

  const addProductMutation = api.inventory.addProduct.useMutation({
    onSuccess: async (newProduct) => {
      if (!newProduct) return;
      toast.success(`Product "${newProduct.name}" added successfully!`);
      await utils.inventory.getProducts.invalidate();
      if (onProductCreated) {
        onProductCreated({
          id: newProduct.id,
          name: newProduct.name,
          sku: newProduct.sku,
          price: newProduct.price.toString(),
          brand: newProduct.brand,
          category: newProduct.category,
        });
      }
      handleClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create product");
    },
  });

  const handleClose = () => {
    setName("");
    setPrice("");
    setBrand("");
    setCategory("");
    setSku("");
    setPointsPerQty("");
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(price);
    if (!name.trim()) {
      toast.error("Please enter a product name");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error("Please enter a valid price (>= 0)");
      return;
    }

    addProductMutation.mutate({
      name: name.trim(),
      price: parsedPrice,
      brand: brand.trim() || undefined,
      category: category.trim() || undefined,
      sku: sku.trim() || undefined,
      pointsPerQty: pointsPerQty ? parseFloat(pointsPerQty) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Add New Product
              </h2>
              <p className="text-xs text-slate-500">
                Quickly add product to the active inventory catalog
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Product Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Product Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bio-Fertilizer Organic 5L"
              className="h-11 text-sm bg-slate-50/50 focus:bg-white"
              required
              autoFocus
            />
          </div>

          {/* Grid 2 cols: Price and Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Default Price (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="h-11 text-sm bg-slate-50/50 focus:bg-white text-right font-medium"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Brand / Manufacturer
              </Label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Virat Bio"
                className="h-11 text-sm bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>

          {/* Grid 2 cols: Category/Unit and SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Category / Unit
              </Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Liquid / Bottle / Kg"
                className="h-11 text-sm bg-slate-50/50 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>SKU Code</span>
                <span className="text-[10px] text-slate-400 font-normal">Auto if blank</span>
              </Label>
              <Input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. VRT-BIO-500"
                className="h-11 text-sm font-mono bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>

          {/* Points Per Quantity */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Points Per Quantity (Optional)</span>
              <span className="text-[10px] text-slate-400 font-normal">For commission calculation</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={pointsPerQty}
              onChange={(e) => setPointsPerQty(e.target.value)}
              placeholder="0.00"
              className="h-11 text-sm bg-slate-50/50 focus:bg-white text-right"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="min-h-[44px] px-4 text-slate-600 hover:text-slate-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addProductMutation.isPending}
              className="min-h-[44px] px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {addProductMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Product
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

