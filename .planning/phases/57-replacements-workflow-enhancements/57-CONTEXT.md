# Phase 57: Replacements Workflow Enhancements (AO Officer Selection & Invoice Product Item Selection)

## Context & Objectives
Field workforce users and managers processing product replacements require accurate tracking of the responsible Agricultural Officer (AO) and precise item-level replacement auditing from original sales invoices.

### Core Requirements
1. **Agricultural Officer (AO) Search & Selection:**
   - In the replacement creation form, provide a search bar to search active employees by **Name** or **Employee Code (E-Code)**.
   - Select the specific AO who executed or authorized the replacement in the field.
   - Persist the selected AO (`aoId` / `agricultural_officer_id`) in the `replacements` table.
   - Display the assigned AO in replacement detail views and tables.

2. **Original Invoice Product Ingestion:**
   - When creating a replacement from an original sale (or selecting an invoice), automatically load the items and products associated with that original invoice.
   - Display each item with product name, SKU/category, unit, and original invoiced quantity.

3. **Selective / Itemized Product Replacement:**
   - Support partial replacements: allow users to pick which specific products from the original invoice are being replaced.
   - For each selected product, allow setting the replacement quantity (constrained by the original invoiced quantity).
   - Only save the selected items and quantities into `replacementItems`.
   - Update replacement totals and validation accordingly.

## Schema Considerations
- Update `src/server/db/schema/replacements.ts` to include `aoId: uuid("ao_id").references(() => users.id)` on the `replacements` table.
- Update `replacementsRelations` to link `ao: one(users, { fields: [replacements.aoId], references: [users.id] })`.
- Ensure migrations are prepared and synced to both dev and prod databases.
