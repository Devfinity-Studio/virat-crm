# Testing Strategy & Guidelines

This document outlines the testing architecture, existing test suites, and instructions for running and expanding automated tests in Virat CRM.

## 1. Test Framework & Setup
- **Testing Engine:** Vitest (`vitest`)
- **Configuration:** `vitest.config.ts` configured at project root
- **Assertion Libraries:** Vitest built-in `expect` assertions and Node.js `assert` module

## 2. Running Tests
- **Run all tests:**
  ```bash
  pnpm vitest run
  ```
- **Run tests in watch mode (interactive development):**
  ```bash
  pnpm vitest
  ```
- **Typecheck & Linting Verification:**
  ```bash
  pnpm check
  ```
  *(Executes `next lint && tsc --noEmit`)*

## 3. Existing Test Suites

### Multi-Tenant & Branch Isolation (`tests/integration/multi-tenant.test.ts`)
- Verifies that `enforceBranchIsolation` accurately enforces security boundaries:
  - Developer bypasses branch restrictions and can query cross-branch data.
  - Admin bypasses branch restrictions and can manage multiple branches.
  - Standard employees are restricted strictly to their assigned branch.
  - Unauthorized branch access attempts throw `FORBIDDEN` (`TRPCError`).
  - Missing branch assignment or missing profile throws appropriate security errors.

### Schema & Role-Based Validation (`tests/validation.test.ts`)
- **Postal Pincode Validation:** Validates Indian 6-digit postal pincode regexes (`^[1-9][0-9]{5}$`).
- **RBAC Logic Simulation:** Validates that status updates and manager actions are properly restricted to Managers of subordinates or Admins.
- **Zod Data Schemas:** Validates that boundary constraints on sales quantities, customer phone numbers, and pricing formats match runtime expectations.

## 4. Test Coverage Areas to Expand
1. **tRPC Router Procedures:** Add integration tests for key procedures (`sales.createSale`, `inventory.transferStock`, `crm.updateBalance`) using a mock or ephemeral test database.
2. **Authentication & Session Tokens:** Test token expiration, decryption tampering handling, and Bearer authorization headers.
3. **Geofencing & Distance Calculations:** Add unit tests for Turf.js point-in-polygon checks and cumulative mileage calculations across edge cases (e.g. GPS jitter).
4. **Offline Sync & Service Worker:** Validate sync queues and retry behaviors when network connectivity is lost on mobile devices.
