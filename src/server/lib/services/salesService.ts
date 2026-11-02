import { sql } from "drizzle-orm";
import { inventory } from "@/server/db/schema";
import { checkAndNotifyLowStock } from "@/server/lib/alerts";

export interface SaleItemQuantityInput {
  quantity: number;
  isFree?: boolean;
}

export interface SaleQuantitiesResult {
  mainQty: number;
  freeQty: number;
  totalQty: number;
}

export interface SaleBalanceInput {
  invoiceAmount?: string | number | null;
  advancePaymentAmount?: string | number | null;
  receivedAmount?: string | number | null;
}

/**
 * Calculates main, free, and total quantities from line items.
 */
export function calculateSaleQuantities(
  items: SaleItemQuantityInput[],
): SaleQuantitiesResult {
  let mainQty = 0;
  let freeQty = 0;

  for (const item of items) {
    if (item.isFree) {
      freeQty += item.quantity;
    } else {
      mainQty += item.quantity;
    }
  }

  return {
    mainQty,
    freeQty,
    totalQty: mainQty + freeQty,
  };
}

/**
 * Calculates remaining balance amount as (invoiceAmount - advancePaymentAmount - receivedAmount).
 */
export function calculateSaleBalance(input: SaleBalanceInput): string {
  const invoiceAmt = parseFloat(String(input.invoiceAmount ?? "0")) || 0;
  const advanceAmt =
    parseFloat(String(input.advancePaymentAmount ?? "0")) || 0;
  const receivedAmt = parseFloat(String(input.receivedAmount ?? "0")) || 0;

  const balance = invoiceAmt - advanceAmt - receivedAmt;
  return balance.toFixed(2);
}

/**
 * Generates the next sequential invoice/transaction ID.
 * Defaults to "INV-00001" if no prior invoice exists.
 */
export function generateNextInvoiceId(
  lastTransactionNumber?: string | null,
): string {
  if (!lastTransactionNumber || !lastTransactionNumber.trim()) {
    return "INV-00001";
  }

  const trimmed = lastTransactionNumber.trim();
  const match = trimmed.match(/^(.*?)(\d+)$/);
  if (match && match[1] !== undefined && match[2] !== undefined) {
    const prefix = match[1];
    const numDigits = match[2];
    const num = parseInt(numDigits, 10);
    const nextNum = num + 1;

    // Preserve zero-padding or enforce min 5 digits for INV- prefix
    const padLength =
      prefix.toUpperCase().startsWith("INV") || numDigits.startsWith("0")
        ? Math.max(5, numDigits.length)
        : numDigits.length;

    return `${prefix}${String(nextNum).padStart(padLength, "0")}`;
  }

  return `${trimmed}-00001`;
}

/**
 * Deducts stock from branch inventory and triggers low stock alerts.
 */
export async function decrementInventoryStock(
  tx: any,
  branchId: number,
  items: { productId: number; quantity: number }[],
): Promise<void> {
  for (const item of items) {
    if (item.quantity <= 0) continue;

    await tx
      .insert(inventory)
      .values({
        productId: item.productId,
        branchId,
        quantity: -item.quantity,
      })
      .onConflictDoUpdate({
        target: [inventory.productId, inventory.branchId],
        set: { quantity: sql`${inventory.quantity} - ${item.quantity}` },
      });

    await checkAndNotifyLowStock(tx, branchId, item.productId);
  }
}

/**
 * Restores stock back to branch inventory (used during sale updates or cancellations).
 */
export async function restoreInventoryStock(
  tx: any,
  branchId: number,
  items: { productId: number; quantity: number }[],
): Promise<void> {
  for (const item of items) {
    if (item.quantity <= 0) continue;

    await tx
      .insert(inventory)
      .values({
        productId: item.productId,
        branchId,
        quantity: item.quantity,
      })
      .onConflictDoUpdate({
        target: [inventory.productId, inventory.branchId],
        set: { quantity: sql`${inventory.quantity} + ${item.quantity}` },
      });
  }
}
