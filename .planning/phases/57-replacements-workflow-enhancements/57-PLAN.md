# Phase 57 Plan: Replacements Workflow Enhancements

## Executive Summary
This phase implements critical workflow and tracking improvements to the Replacements module:
1. **Agricultural Officer (AO) Attribution (`REP-AO-01`):** Allows selecting the responsible AO through a live search bar (by employee name or e-code) and persists this association in the database.
2. **Invoice Product Auto-Ingestion (`REP-INV-01`):** When the replacement page is loaded (via URL query params or order lookup), original invoice products are automatically fetched and presented.
3. **Itemized / Partial Replacement Selection (`REP-ITEM-01`):** Replaces the manual row-entry table with an invoice-driven item selector where users can selectively check off which products are being replaced and set replacement quantities bounded by the original invoiced quantities.

---

## Status: COMPLETED

### Wave 1: Database Schema & Backend Services [COMPLETED]

#### Task 1: Extend Database Schema for Agricultural Officer (`REP-AO-01`) [COMPLETED]
- **Target Files:**
  - `src/server/db/schema/replacements.ts`
- **Actions:**
  - Add `aoId: uuid("ao_id").references(() => users.id)` column to `replacements` table definition.
  - Add `ao` relation in `replacementsRelations` pointing to `users`.
  - Sync schema changes across both Neon database branches (dev and prod) via idempotent DDL (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS "ao_id" uuid REFERENCES "virat-crm_user"("id") ON DELETE SET NULL`).
- **Verification:**
  - `pnpm tsc --noEmit` verifies schema typing.
  - Database table `virat-crm_replacement` has `ao_id` column present in both DEV (`ep-soft-thunder`) and PROD (`ep-small-bonus`) databases.

#### Task 2: Update TRPC Replacements Router (`REP-AO-01`, `REP-INV-01`, `REP-ITEM-01`) [COMPLETED]
- **Target Files:**
  - `src/server/api/routers/replacements.ts`
  - `src/server/api/routers/sales.ts`
- **Actions:**
  - Update `createReplacement` input schema in `replacements.ts`:
    - Accept `aoId: z.string().uuid().optional().nullable()`.
    - Accept `items: z.array(z.object({ productId: z.number(), quantity: z.number().min(1) }))`.
  - In `createReplacement`, validate that submitted items belong to the original sale and their quantities do not exceed the original invoice item quantities.
  - Update `getReplacements` and `getMyReplacements` queries to join `ao: true` and `items: { with: { product: true } }`.
  - Ensure `sales.getSaleByOrderNumber` and `sales.getSaleById` eagerly include product details in `items`.
- **Verification:**
  - Automated integration tests pass.
  - Backend validation strictly enforces `quantity <= invoicedQty`.

---

### Wave 2: Frontend Replacement Form & Dashboard UI [COMPLETED]

#### Task 3: Agricultural Officer (AO) Search & Selector Component (`REP-AO-01`) [COMPLETED]
- **Target Files:**
  - `src/app/_components/ui/EmployeeSearchCombobox.tsx`
  - `src/app/replacements/new/page.tsx`
- **Actions:**
  - Implement a dedicated AO search bar in the replacement creation form.
  - Allow searching active employees by Name or Employee Code (E-Code).
  - Show quick-select dropdown results displaying Name, E-Code, and Role.
  - When selected, display an active badge with AO Name, E-Code, and a clear button (`X`).

#### Task 4: Original Invoice Product Ingestion & Itemized Selection (`REP-INV-01`, `REP-ITEM-01`) [COMPLETED]
- **Target Files:**
  - `src/app/replacements/new/page.tsx`
- **Actions:**
  - Support reading `?orderNumber=` or `?saleId=` from `useSearchParams` on mount so navigating from an invoice directly populates the form.
  - Replace the blank product grid with an **Original Invoice Product Selection Card**:
    - Display all items from the fetched sale invoice.
    - Each item row includes:
      - Checkbox toggle: "Select for Replacement".
      - Product name, category/unit.
      - Original Invoiced Quantity.
      - Replacement Quantity input (disabled if unchecked, constrained to `1 <= qty <= invoicedQty`).
    - Real-time summary showing total selected items and total replacement units.
    - Block submission if 0 items are selected.
  - Submit only checked items with their specified replacement quantities.

#### Task 5: Replacements Dashboard & Export Update (`REP-AO-01`) [COMPLETED]
- **Target Files:**
  - `src/app/replacements/page.tsx`
- **Actions:**
  - Add "Responsible AO" column and badge to the replacements dashboard table/card view.
  - Display list of replaced items on replacement cards.
  - Update the Excel export in `handleExportExcel` to include the AO Name, E-Code, and replaced product summary.
- **Verification:**
  - `pnpm tsc --noEmit` passed with 0 errors.
  - `pnpm vitest run` passed (47/47 tests).
  - `pnpm build` compiled all 46 routes cleanly.
