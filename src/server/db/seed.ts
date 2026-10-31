import { db } from "./index";
import {
  branches,
  users,
  products,
  sales,
  saleItems,
  replacements,
  inventory,
  roles,
  rolePermissions,
  systemSettings,
  employeeLocations,
  employeeTrackingStatus,
  leaves,
  userManagers,
} from "./schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  // Truncate tables to allow re-seeding
  await db.execute(sql`TRUNCATE TABLE "virat-crm_system_settings" CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE "virat-crm_role_permission" CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE "virat-crm_stock_transfer" CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE "virat-crm_employee_locations" CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE "virat-crm_employee_tracking_status" CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE "virat-crm_leave" CASCADE;`);
  await db.execute(
    sql`TRUNCATE TABLE "virat-crm_inventory_transaction" CASCADE;`,
  );
  await db.execute(sql`TRUNCATE TABLE "virat-crm_inventory" CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE "virat-crm_replacement" CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE "virat-crm_sale_item" CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE "virat-crm_sale" CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE "virat-crm_product" CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE "virat-crm_user" CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE "virat-crm_roles" CASCADE;`);
  await db.execute(sql`TRUNCATE TABLE "virat-crm_branch" CASCADE;`);

  // Hash passwords
  const devPassword = await bcrypt.hash("password123", 10);
  const adminPassword = await bcrypt.hash("password123", 10);

  const mgr1Pass = await bcrypt.hash("ViratManager1", 10);
  const mgr2Pass = await bcrypt.hash("ViratManager2", 10);

  const emp1Pass = await bcrypt.hash("ViratEmp001", 10);
  const emp2Pass = await bcrypt.hash("ViratEmp002", 10);
  const emp3Pass = await bcrypt.hash("ViratEmp003", 10);
  const emp4Pass = await bcrypt.hash("ViratEmp004", 10);
  const emp5Pass = await bcrypt.hash("ViratEmp005", 10);
  const emp6Pass = await bcrypt.hash("ViratEmp006", 10);
  const emp7Pass = await bcrypt.hash("ViratEmp007", 10);
  const emp8Pass = await bcrypt.hash("ViratEmp008", 10);
  const emp9Pass = await bcrypt.hash("ViratEmp009", 10);
  const emp10Pass = await bcrypt.hash("ViratEmp010", 10);

  // Seed Roles
  const insertedRoles = await db
    .insert(roles)
    .values([
      { name: "Developer", isSystem: true, description: "System Developer" },
      { name: "Admin", isSystem: true, description: "System Administrator" },
      { name: "Manager", isSystem: true, description: "Branch Manager" },
      { name: "Employee", isSystem: true, description: "Field Employee" },
    ])
    .returning();
  console.log("Roles seeded:", insertedRoles.length);

  // Seed Role Permissions
  await db.insert(rolePermissions).values([
    // Developer permissions (Omnipotent bypass role)
    { role: "Developer", featureKey: "dashboard", isEnabled: true },
    { role: "Developer", featureKey: "crm", isEnabled: true },
    { role: "Developer", featureKey: "sales", isEnabled: true },
    { role: "Developer", featureKey: "inventory", isEnabled: true },
    { role: "Developer", featureKey: "workforce", isEnabled: true },
    { role: "Developer", featureKey: "documents", isEnabled: true },
    { role: "Developer", featureKey: "replacements", isEnabled: true },
    { role: "Developer", featureKey: "performance", isEnabled: true },

    // Admin permissions
    { role: "Admin", featureKey: "dashboard", isEnabled: true },
    { role: "Admin", featureKey: "crm", isEnabled: true },
    { role: "Admin", featureKey: "sales", isEnabled: true },
    { role: "Admin", featureKey: "inventory", isEnabled: true },
    { role: "Admin", featureKey: "workforce", isEnabled: true },
    { role: "Admin", featureKey: "documents", isEnabled: true },
    { role: "Admin", featureKey: "replacements", isEnabled: true },
    { role: "Admin", featureKey: "performance", isEnabled: true },

    // Manager permissions
    { role: "Manager", featureKey: "dashboard", isEnabled: true },
    { role: "Manager", featureKey: "crm", isEnabled: true },
    { role: "Manager", featureKey: "sales", isEnabled: true },
    { role: "Manager", featureKey: "inventory", isEnabled: true },
    { role: "Manager", featureKey: "workforce", isEnabled: true },
    { role: "Manager", featureKey: "documents", isEnabled: true },
    { role: "Manager", featureKey: "replacements", isEnabled: true },
    { role: "Manager", featureKey: "performance", isEnabled: true },

    // Employee permissions
    { role: "Employee", featureKey: "dashboard", isEnabled: true },
    { role: "Employee", featureKey: "crm", isEnabled: true },
    { role: "Employee", featureKey: "sales", isEnabled: true },
    { role: "Employee", featureKey: "inventory", isEnabled: true },
    { role: "Employee", featureKey: "workforce", isEnabled: true },
    { role: "Employee", featureKey: "documents", isEnabled: true },
    { role: "Employee", featureKey: "replacements", isEnabled: true },
  ]);
  console.log("Role permissions seeded");

  // Seed Branches
  const insertedBranches = await db
    .insert(branches)
    .values([
      {
        name: "Headquarters",
        latitude: "28.6139",
        longitude: "77.2090",
        radiusMeters: 9999999, // Large radius for global physical testing
        isActive: true,
      },
      {
        name: "North Branch",
        latitude: "28.7041",
        longitude: "77.1025",
        radiusMeters: 9999999, // Large radius for global physical testing
        isActive: true,
      },
    ])
    .returning();

  console.log("Branches seeded:", insertedBranches.length);

  const hq = insertedBranches[0];

  if (!hq) {
    throw new Error("Failed to insert Headquarters branch");
  }
  const insertedUsers = await db
    .insert(users)
    .values([
      {
        employeeCode: "DEV001",
        password: devPassword,
        email: "developer@viraterp.com",
        firstName: "System",
        lastName: "Developer",
        role: "Developer",
        branchId: hq.id,
        isActive: true,
      },
      {
        employeeCode: "ADMIN001",
        password: adminPassword,
        email: "admin@viraterp.com",
        firstName: "System",
        lastName: "Admin",
        role: "Admin",
        branchId: hq.id,
        isActive: true,
      },
      // Managers
      {
        employeeCode: "MGR001",
        password: mgr1Pass,
        email: "mgr001@viraterp.com",
        firstName: "Rajesh",
        lastName: "Sharma",
        role: "Manager",
        branchId: hq.id,
        isActive: true,
      },
      {
        employeeCode: "MGR002",
        password: mgr2Pass,
        email: "mgr002@viraterp.com",
        firstName: "Priya",
        lastName: "Patel",
        role: "Manager",
        branchId: hq.id,
        isActive: true,
      },
      // Employees
      {
        employeeCode: "EMP001",
        password: emp1Pass,
        email: "emp001@viraterp.com",
        firstName: "Amit",
        lastName: "Kumar",
        role: "Employee",
        branchId: hq.id,
        isActive: true,
      },
      {
        employeeCode: "EMP002",
        password: emp2Pass,
        email: "emp002@viraterp.com",
        firstName: "Sunita",
        lastName: "Singh",
        role: "Employee",
        branchId: hq.id,
        isActive: true,
      },
      {
        employeeCode: "EMP003",
        password: emp3Pass,
        email: "emp003@viraterp.com",
        firstName: "Vikram",
        lastName: "Yadav",
        role: "Employee",
        branchId: hq.id,
        isActive: true,
      },
      {
        employeeCode: "EMP004",
        password: emp4Pass,
        email: "emp004@viraterp.com",
        firstName: "Neha",
        lastName: "Gupta",
        role: "Employee",
        branchId: hq.id,
        isActive: true,
      },
      {
        employeeCode: "EMP005",
        password: emp5Pass,
        email: "emp005@viraterp.com",
        firstName: "Deepak",
        lastName: "Verma",
        role: "Employee",
        branchId: hq.id,
        isActive: true,
      },
      {
        employeeCode: "EMP006",
        password: emp6Pass,
        email: "emp006@viraterp.com",
        firstName: "Anjali",
        lastName: "Rao",
        role: "Employee",
        branchId: hq.id,
        isActive: true,
      },
      {
        employeeCode: "EMP007",
        password: emp7Pass,
        email: "emp007@viraterp.com",
        firstName: "Sandeep",
        lastName: "Mishra",
        role: "Employee",
        branchId: hq.id,
        isActive: true,
      },
      {
        employeeCode: "EMP008",
        password: emp8Pass,
        email: "emp008@viraterp.com",
        firstName: "Pooja",
        lastName: "Choudhary",
        role: "Employee",
        branchId: hq.id,
        isActive: true,
      },
      {
        employeeCode: "EMP009",
        password: emp9Pass,
        email: "emp009@viraterp.com",
        firstName: "Manoj",
        lastName: "Joshi",
        role: "Employee",
        branchId: hq.id,
        isActive: true,
      },
      {
        employeeCode: "EMP010",
        password: emp10Pass,
        email: "emp010@viraterp.com",
        firstName: "Kavita",
        lastName: "Reddy",
        role: "Employee",
        branchId: hq.id,
        isActive: true,
      },
    ])
    .returning();

  console.log("Users seeded:", insertedUsers.length);
  const employee = insertedUsers.find((u) => u.employeeCode === "EMP001");
  const manager = insertedUsers.find((u) => u.employeeCode === "MGR001");
  const manager2 = insertedUsers.find((u) => u.employeeCode === "MGR002");

  // Assign Managers
  const userManagersData = [];
  for (const user of insertedUsers) {
    if (user.role === "Employee") {
      userManagersData.push({ userId: user.id, managerId: manager!.id });
      // Half of them also report to manager2
      if (Math.random() > 0.5) {
        userManagersData.push({ userId: user.id, managerId: manager2!.id });
      }
    }
  }
  await db.insert(userManagers).values(userManagersData);
  console.log("User-Manager relations seeded");

  // Seed Products
  const insertedProducts = await db
    .insert(products)
    .values([
      { name: "Virat Premium Cement", sku: "VPC-001", price: "350.00" },
      { name: "Virat Standard Cement", sku: "VSC-002", price: "280.00" },
      { name: "Virat Quick-Dry", sku: "VQD-003", price: "400.00" },
    ])
    .returning();

  console.log("Products seeded:", insertedProducts.length);
  const p1 = insertedProducts[0]!;
  const p2 = insertedProducts[1]!;

  // Seed Sales
  const insertedSales = await db
    .insert(sales)
    .values([
      {
        branchId: hq.id,
        orderNumber: "ORD-1001",
        transactionNumber: "TXN-1001",
        status: "Approved",
        userId: employee!.id,
        managerId: manager!.id,
        pincode: "110001",
        customerName: "Ramesh Builders",
        customerAddress: "New Delhi",
        mainQty: 100,
        freeQty: 10,
        totalQty: 110,
        invoiceAmount: "35000.00",
        receivedAmount: "35000.00",
        balanceAmount: "0.00",
      },
      {
        branchId: hq.id,
        orderNumber: "ORD-1002",
        status: "Pending",
        userId: employee!.id,
        managerId: manager!.id,
        pincode: "110002",
        customerName: "Suresh Constructions",
        customerAddress: "South Delhi",
        mainQty: 50,
        freeQty: 0,
        totalQty: 50,
        invoiceAmount: "14000.00",
        receivedAmount: "5000.00",
        balanceAmount: "9000.00",
      },
    ])
    .returning();

  console.log("Sales seeded:", insertedSales.length);
  const sale1 = insertedSales[0]!;
  const sale2 = insertedSales[1]!;

  // Seed Sale Items
  await db.insert(saleItems).values([
    { saleId: sale1.id, productId: p1.id, quantity: 100, isFree: false },
    { saleId: sale1.id, productId: p2.id, quantity: 10, isFree: true },
    { saleId: sale2.id, productId: p2.id, quantity: 50, isFree: false },
  ]);
  console.log("Sale Items seeded");

  // Seed Inventory
  await db.insert(inventory).values([
    { productId: p1.id, branchId: hq.id, quantity: 1000 },
    { productId: p2.id, branchId: hq.id, quantity: 2000 },
    { productId: insertedProducts[2]!.id, branchId: hq.id, quantity: 500 },
  ]);
  console.log("Inventory seeded");

  // Seed Replacements
  await db.insert(replacements).values([
    {
      originalSaleId: sale1.id,
      branchId: hq.id,
      userId: employee!.id,
      reason: "Bags were torn during transit",
      status: "Pending",
    },
    {
      originalSaleId: sale2.id,
      branchId: hq.id,
      userId: employee!.id,
      reason: "Quality check failed",
      status: "Approved",
    },
  ]);

  // Bulk Seed 20 Sales
  const bulkSales = [];
  for (let i = 3; i <= 22; i++) {
    bulkSales.push({
      branchId: hq.id,
      orderNumber: `ORD-10${i < 10 ? "0" + i : i}`,
      status: i % 2 === 0 ? "Approved" : "Pending",
      userId: employee!.id,
      managerId: manager!.id,
      pincode: "110001",
      customerName: `Customer ${i} Construction`,
      customerAddress: `Address ${i}, New Delhi`,
      mainQty: i * 10,
      freeQty: i,
      totalQty: i * 11,
      invoiceAmount: (i * 3500).toFixed(2),
      receivedAmount: (i * 3000).toFixed(2),
      balanceAmount: (i * 500).toFixed(2),
    });
  }
  await db.insert(sales).values(bulkSales as any);
  console.log("Bulk sales seeded");

  // Bulk Seed Employee Locations & Tracking Status
  const bulkLocations = [];
  for (let i = 1; i <= 20; i++) {
    const rDate = new Date(Date.now() - i * 86400000);
    bulkLocations.push({
      employeeId: employee!.id,
      latitude: 28.6139 + Math.random() * 0.1,
      longitude: 77.209 + Math.random() * 0.1,
      accuracy: 10 + Math.random() * 20,
      isOfflineSynced: false,
      recordedAt: rDate,
    });
  }
  await db.insert(employeeLocations).values(bulkLocations as any);
  await db.insert(employeeTrackingStatus).values({
    employeeId: employee!.id,
    lastLatitude: 28.6139,
    lastLongitude: 77.209,
    lastUpdatedAt: new Date(),
    locationPermissionStatus: "ALWAYS",
    isOnline: true,
  });
  console.log("Bulk employee locations and tracking status seeded");

  // Seed System Settings
  await db.insert(systemSettings).values({
    id: "global",
    maxUsers: 50,
    isSystemLocked: false,
    isReadOnly: false,
    disabledFeaturesGlobal: [],
  });
  console.log("System Settings seeded");

  console.log("Database seeding completed.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Seeding failed:", e);
  process.exit(1);
});
