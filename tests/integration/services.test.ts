import "dotenv/config";
import { describe, it, expect, vi } from "vitest";
import {
  calculateSaleQuantities,
  calculateSaleBalance,
  generateNextInvoiceId,
} from "@/server/lib/services/salesService";
import {
  calculateNextEmployeeCode,
  generateWelcomeEmailHtml,
} from "@/server/lib/services/userService";
import {
  getDefaultPermission,
  syncDefaultRolePermissions,
  SYSTEM_FEATURES,
} from "@/server/lib/permissions";

describe("Sales Service Calculations (DEBT-03)", () => {
  it("should accurately calculate main, free, and total quantities", () => {
    const items = [
      { productId: 1, quantity: 10, isFree: false },
      { productId: 2, quantity: 2, isFree: true },
      { productId: 3, quantity: 5, isFree: false },
      { productId: 4, quantity: 1, isFree: true },
    ];

    const result = calculateSaleQuantities(items);
    expect(result.mainQty).toBe(15);
    expect(result.freeQty).toBe(3);
    expect(result.totalQty).toBe(18);
  });

  it("should calculate remaining balance correctly with decimals", () => {
    const balance = calculateSaleBalance({
      invoiceAmount: "15000.50",
      advancePaymentAmount: "5000.25",
      receivedAmount: "2000.00",
    });
    expect(balance).toBe("8000.25");

    const zeroBalance = calculateSaleBalance({
      invoiceAmount: "1000",
      advancePaymentAmount: "500",
      receivedAmount: "500",
    });
    expect(zeroBalance).toBe("0.00");
  });

  it("should generate next sequential invoice ID correctly", () => {
    expect(generateNextInvoiceId(null)).toBe("INV-1000");
    expect(generateNextInvoiceId("")).toBe("INV-1000");
    expect(generateNextInvoiceId("INV-1000")).toBe("INV-1001");
    expect(generateNextInvoiceId("INV-1049")).toBe("INV-1050");
    expect(generateNextInvoiceId("TAX-99")).toBe("TAX-100");
  });
});

describe("User Service Routines (DEBT-03)", () => {
  it("should generate the first code if no users exist in series", () => {
    const nextCode = calculateNextEmployeeCode("EMP0001", []);
    expect(nextCode).toBe("EMP0001");
  });

  it("should increment next employee code correctly from existing codes", () => {
    const existing = ["EMP0001", "EMP0002", "EMP0003", "EMP0007"];
    const nextCode = calculateNextEmployeeCode("EMP0001", existing);
    expect(nextCode).toBe("EMP0008");
  });

  it("should handle custom role prefixes and padding lengths", () => {
    const existing = ["MGR-01", "MGR-02", "MGR-03"];
    const nextCode = calculateNextEmployeeCode("MGR-01", existing);
    expect(nextCode).toBe("MGR-04");
  });

  it("should render onboarding welcome email containing employee code", () => {
    const email = generateWelcomeEmailHtml({
      firstName: "Aarav",
      employeeCode: "EMP0042",
      password: "SecretPassword123!",
    });
    expect(email).toContain("Hi Aarav,");
    expect(email).toContain("EMP0042");
    expect(email).toContain("SecretPassword123!");
  });
});

describe("Feature Access Permissions Sync (DEBT-04)", () => {
  it("should grant full access for Admin and Developer roles", () => {
    for (const feature of SYSTEM_FEATURES) {
      expect(getDefaultPermission("Admin", feature)).toBe(true);
      expect(getDefaultPermission("Developer", feature)).toBe(true);
    }
  });

  it("should restrict admin panel for Manager while allowing reporting & sales", () => {
    expect(getDefaultPermission("Manager", "admin")).toBe(false);
    expect(getDefaultPermission("Manager", "sales")).toBe(true);
    expect(getDefaultPermission("Manager", "reports")).toBe(true);
    expect(getDefaultPermission("Manager", "analytics")).toBe(true);
  });

  it("should restrict executive and admin features for Field Employees", () => {
    expect(getDefaultPermission("Employee", "admin")).toBe(false);
    expect(getDefaultPermission("Employee", "analytics")).toBe(false);
    expect(getDefaultPermission("Employee", "live-map")).toBe(false);
    expect(getDefaultPermission("Employee", "sales")).toBe(true);
    expect(getDefaultPermission("Employee", "reports")).toBe(true);
  });

  it("should insert missing feature permission entries into DB mock", async () => {
    const mockInserted: any[] = [];
    const mockDb = {
      select: () => ({
        from: (table: any) => {
          // Empty roles and permissions to test fresh seed
          return Promise.resolve([]);
        },
      }),
      insert: () => ({
        values: (items: any[]) => {
          mockInserted.push(...items);
          return Promise.resolve();
        },
      }),
    };

    const count = await syncDefaultRolePermissions(mockDb);
    // 4 base roles * 12 features = 48 entries
    expect(count).toBe(48);
    expect(mockInserted.length).toBe(48);
    const adminPanelEntry = mockInserted.find(
      (e) => e.role === "Employee" && e.featureKey === "admin",
    );
    expect(adminPanelEntry?.isEnabled).toBe(false);

    const adminEntry = mockInserted.find(
      (e) => e.role === "Admin" && e.featureKey === "admin",
    );
    expect(adminEntry?.isEnabled).toBe(true);
  });
});
