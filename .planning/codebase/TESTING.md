---
last_mapped_commit: 8c574802947c74013f90c4768608279f0dee5699
---

# Testing Patterns

**Analysis Date:** 2026-10-31

## Test Framework

**Runner & Assertion:**
- Runner: Vitest 4.1.7 (`vitest`)
- Config: `vitest.config.ts` located at project root with `vite-tsconfig-paths` for `@/*` alias resolution
- Assertion: Vitest built-in `expect` assertions and Node.js `assert` module

**Run Commands:**
```bash
# Run all test suites
pnpm vitest run

# Run tests in interactive watch mode
pnpm vitest

# Run a specific test file
pnpm vitest run tests/integration/services.test.ts

# Verify types and linting
pnpm check
```

## Test File Organization

**Location & Layout:**
- Unit and schema tests reside in `tests/`.
- Integration and service tests reside in `tests/integration/`.

```
tests/
├── integration/
│   ├── multi-tenant.test.ts       # Branch isolation and RBAC bypass tests (6 tests)
│   ├── report-scoping.test.ts     # Role-based report scoping & manager hierarchy tests (14 tests)
│   └── services.test.ts           # Domain services & permission auto-sync tests (12 tests)
└── validation.test.ts             # Pincode regex, RBAC simulation, GPS violation tests (5 tests)
```

## Existing Test Suites & Coverage

**1. Service Layer Tests (`tests/integration/services.test.ts` - 12 tests):**
- `userService`:
  - Sequential employee code generation (`VRT-EMP-0001`, `VRT-EMP-0042`, etc.)
  - Handling of non-standard or missing existing codes
  - Password hashing and verification via `bcryptjs`
  - Manager-subordinate link generation
  - Document-less employee registration permissions (`add-employee-without-docs`)
- `salesService`:
  - Stock validation and balance deductions
  - Total and net receivable calculations with tax and discounts
  - Zero and negative quantity prevention
- `permissions`:
  - `syncDefaultRolePermissions`: Automatic detection and seeding of missing role-feature pairs
  - Role-based defaults (Developer/Admin granted all; Manager/Employee restricted appropriately)

**2. Multi-Tenant Branch Isolation (`tests/integration/multi-tenant.test.ts` - 6 tests):**
- Verifies `enforceBranchIsolation` behavior:
  - Developer bypasses branch boundaries for cross-branch governance
  - Admin bypasses branch boundaries
  - Standard employees attempting to access another branch throw `FORBIDDEN`
  - Standard employees accessing their assigned branch succeed
  - Unassigned branch users throw appropriate errors

**3. Report Scoping & Hierarchy Aggregation (`tests/integration/report-scoping.test.ts` - 14 tests):**
- Validates role-dependent scoping on reports:
  - Admin/Developer see company-wide reports
  - Manager sees reports from their assigned branch and subordinate employees
  - Employee sees only their own submitted reports

**4. Validation & Schema Tests (`tests/validation.test.ts` - 5 tests):**
- Indian 6-digit postal pincode regex validation (`^[1-9][0-9]{5}$`)
- RBAC status transition simulation
- GPS violation alerts and threshold checks
- Branch isolation boundaries
- Real-time low stock threshold alerts

## Test Structure & Patterns

**Suite Pattern:**
```typescript
import { describe, it, expect } from "vitest";

describe("ServiceName / FeatureName", () => {
  describe("methodOrBehavior", () => {
    it("should satisfy the expected requirement", () => {
      // Arrange
      const input = { ... };

      // Act
      const result = executeLogic(input);

      // Assert
      expect(result).toBeDefined();
    });
  });
});
```

## Mocking Strategy

**Patterns:**
- Mocking DB contexts in integration tests:
  ```typescript
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([...]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ id: 1 }]),
  };
  ```
- Use `vi.fn()` or simulated contexts for `createTRPCContext` when testing procedures without live database connections.

## Future Test Expansion Areas
1. **Playwright E2E Tests:** End-to-end browser workflows (login -> dashboard -> new sale -> invoice print) running against an isolated test PostgreSQL container.
2. **Offline Mobile Sync Tests:** Simulating network disconnection during field report submission and verifying replay queue.
