# Phase 59: Product Management & In-Sale Quick-Add — Context & Requirements

## Goal & Strategic Intent
Enable businesses and field agents to manage products smoothly without workflow disruption:
1. Provide a dedicated Products management page (`/products` or `/inventory/products`) to browse, search, filter, and add/edit products with essential metadata (name, SKU, brand, category, HSN, price/rate, min threshold, points per quantity).
2. Allow adding products directly from the New Sales screen (`/sales/new`) via a quick-add dialog/modal without navigating away or losing in-progress sales invoice data. The new product should be created, immediately injected into the product dropdown, and auto-selected for the current row.

---

## Requirements

### 1. Dedicated Products Page (`PROD-CAT-01`)
- **Route:** `/products` (accessible from navigation / inventory section).
- **Features:**
  - Data table / mobile cards listing all active products with Name, SKU, Brand, Category, Price, and Stock Threshold.
  - Search bar filtering by product name, brand, SKU, or category.
  - "Add Product" button opening an intuitive creation dialog.
  - Strict light-mode design with clean `#FFFFFF` cards, `#F8FAFC` canvas, and 52px+ touch targets.

### 2. In-Sale Quick-Add Modal (`PROD-QUICK-01`)
- **Location:** `src/app/sales/new/page.tsx`
- **Trigger:**
  - A "+ New Product" button placed directly above the sales product grid or inside the product selector.
- **Workflow:**
  - Opens a lightweight modal with fields: Product Name, Brand, Unit/Category, Default Price, and SKU (auto-generated if empty).
  - On submit, calls `addProduct` mutation.
  - Once created, invalidates/refetches `getProducts` query.
  - Automatically selects the newly created product in the active sale item row and sets its default rate.
  - Sales form state (customer, order number, existing rows, advance payment, etc.) remains 100% preserved.

### 3. TRPC Backend & RBAC Alignment (`PROD-API-01`, `PROD-RBAC-01`)
- **Router:** `src/server/api/routers/inventory.ts`
- **Endpoints:**
  - Update `addProduct`: Allow creation by users with `sales` or `inventory` feature access (Admins, Managers, and authorized staff).
  - Add `updateProduct` if needed for editing existing product details.
  - Validate uniqueness of SKU and positive pricing.

