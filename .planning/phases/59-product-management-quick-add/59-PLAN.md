# Phase 59 Plan: Product Management & In-Sale Quick-Add

## Executive Summary
This phase implements:
1. **Dedicated Products Management Page (`PROD-CAT-01`):** A full-featured products page at `/products` to list, search, view, and add products with clean light-mode cards, search bar, and edit capabilities.
2. **In-Sale Quick-Add Product Modal (`PROD-QUICK-01`):** Direct quick-add dialog on the New Sales page (`/sales/new`) allowing users to create missing products on the fly without losing in-progress sales invoice data, automatically populating and selecting the created product.
3. **TRPC Backend & Permission Support (`PROD-API-01`, `PROD-RBAC-01`):** Update `inventory.addProduct` to support authorized staff (users with `sales` or `inventory` permissions) and add `inventory.updateProduct`.

---

## Plan Details

### Wave 1: Backend Router & Quick-Add Component

#### Task 1: Update TRPC Inventory Router (`PROD-API-01`, `PROD-RBAC-01`)
- **Target Files:**
  - `src/server/api/routers/inventory.ts`
- **Actions:**
  - Update `addProduct`:
    - Allow users with `inventory` or `sales` feature access, or users with role `Admin` or `Manager`.
    - Accept: `name`, `price`, `sku` (optional), `brand` (optional), `category` (optional), `hsnCode` (optional), `minThreshold` (optional), `pointsPerQty` (optional).
  - Add `updateProduct`:
    - Accept `id: z.number()` and optional fields to update.
- **Verification:**
  - `pnpm tsc --noEmit` passes.

#### Task 2: Reusable Quick-Add Product Modal (`PROD-QUICK-01`)
- **Target Files:**
  - `src/app/_components/inventory/QuickAddProductModal.tsx` (new)
- **Actions:**
  - Build accessible modal using shadcn dialog / card primitives in strict light mode.
  - Fields: Product Name (required), Price / Default Rate (required), Brand, Category / Unit, SKU (optional, auto-generated if left blank).
  - `onSuccess: (newProduct: Product) => void` callback to seamlessly integrate with callers.

---

### Wave 2: New Sales Page Integration & Dedicated Products Page

#### Task 3: In-Sale Quick-Add on `/sales/new` (`PROD-QUICK-01`)
- **Target Files:**
  - `src/app/sales/new/page.tsx`
- **Actions:**
  - Add a "+ Add Product" button right above the Sales Products table.
  - Also provide an option in the product select dropdown or row action: "+ New Product".
  - On creation:
    - Invalidate and refetch `getProducts`.
    - Automatically assign the new product ID to the current sale item row.
    - Set the row's `rate` to the product's price and recalculate `amount`.
    - Preserve all other entered sales form fields (customer, date, payments, other rows).

#### Task 4: Dedicated Products Page (`PROD-CAT-01`)
- **Target Files:**
  - `src/app/products/page.tsx` (new)
- **Actions:**
  - Build responsive products directory with:
    - Search input (live filtering by name, SKU, brand, category).
    - Filter pills (All, categories).
    - Product cards with price, brand, category, SKU, and edit trigger.
    - "Add Product" primary button opening the creation modal.
  - Ensure strict light mode and thumb-friendly mobile layouts.

---

### Wave 3: Verification & Deployment Loop

#### Task 5: Zero-Shot Verification
- **Actions:**
  - `pnpm tsc --noEmit`
  - `pnpm vitest run`
  - `pnpm build`
  - Commit to `dev`, push to `origin/dev`, merge into `prod`, and push to `origin/prod`.

