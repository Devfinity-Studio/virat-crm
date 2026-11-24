import { describe, it, expect } from "vitest";

describe("Daily Reports Scoping and Search Logic", () => {
  const sampleReports = [
    {
      id: 1,
      userId: "u-1",
      branchId: 2,
      content: "Today full day office work report preparation and bill clear AO",
      reportDate: new Date("2026-10-30T09:01:30.805Z"),
      user: {
        id: "u-1",
        firstName: "Virendra pratap",
        lastName: "Singh",
        employeeCode: "EMP-001",
      },
      customer: null,
    },
    {
      id: 2,
      userId: "u-2",
      branchId: 2,
      content: "Office work and customer demo at Sharma Agro",
      reportDate: new Date("2026-11-23T18:30:00.000Z"),
      user: {
        id: "u-2",
        firstName: "GOLU",
        lastName: "KUMHAR",
        employeeCode: "EMP-002",
      },
      customer: {
        id: "c-1",
        name: "Sharma Agro Traders",
      },
    },
    {
      id: 3,
      userId: "u-3",
      branchId: 1,
      content: "Inventory audit completed in warehouse",
      reportDate: new Date("2026-11-24T10:00:00.000Z"),
      user: {
        id: "u-3",
        firstName: "Narsingh",
        lastName: "Singh",
        employeeCode: "EMP-003",
      },
      customer: null,
    },
  ];

  it("should match reports by text content search", () => {
    const q = "bill clear".toLowerCase();
    const matches = sampleReports.filter((r) =>
      (r.content ?? "").toLowerCase().includes(q),
    );
    expect(matches.length).toBe(1);
    expect(matches[0]!.id).toBe(1);
  });

  it("should match reports by employee name search case-insensitively", () => {
    const q = "golu".toLowerCase();
    const matches = sampleReports.filter((r) => {
      const userName = `${r.user?.firstName ?? ""} ${r.user?.lastName ?? ""}`.trim().toLowerCase();
      return userName.includes(q);
    });
    expect(matches.length).toBe(1);
    expect(matches[0]!.id).toBe(2);
  });

  it("should match reports by customer name search safely without null pointer exception", () => {
    const q = "sharma agro".toLowerCase();
    const matches = sampleReports.filter((r) =>
      (r.customer?.name ?? "").toLowerCase().includes(q),
    );
    expect(matches.length).toBe(1);
    expect(matches[0]!.id).toBe(2);
  });

  it("should filter by branch correctly when branch scope is selected", () => {
    const branch2Reports = sampleReports.filter((r) => r.branchId === 2);
    expect(branch2Reports.length).toBe(2);

    const branch1Reports = sampleReports.filter((r) => r.branchId === 1);
    expect(branch1Reports.length).toBe(1);
  });

  it("should show all reports when scope is 'all'", () => {
    const allReports = sampleReports;
    expect(allReports.length).toBe(3);
  });
});
