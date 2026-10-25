---
wave: 1
depends_on: []
files_modified:
  - src/server/api/routers/reports.ts
  - src/server/api/routers/dailyReports.ts
  - src/app/_components/reports/ReportList.tsx
  - src/app/_components/reports/MileageReportList.tsx
  - tests/integration/report-scoping.test.ts
autonomous: true
---

# Phase 49: Role-Based Report Scoping & Hierarchy Aggregation

## Objective
Enforce strict role-based scoping and M:N hierarchy aggregation across all reporting interfaces. Ensure field employees are restricted strictly to their own individual records, managers can seamlessly toggle between personal reports and recursive team aggregates (descendants in the organizational hierarchy), and administrators have unrestricted filtering across any individual, team, or branch.

## Requirements Traceability
- **REP-01**: Employee Scope — Employees can only view their own individual reports (sales, daily activity, mileage, replacements).
- **REP-02**: Manager Scope — Managers can view aggregate reports encompassing all employees in their team (respecting the M:N graph hierarchy via `userManagers`), plus their own individual reports.
- **REP-03**: Admin Scope — Admins have unrestricted access and can explicitly select to view reports for any specific employee, or select any manager to view that manager's team aggregate.

---

## Tasks

<task>
  <id>49.1</id>
  <title>Harden Scope Authorization in Reports Routers (`reports.ts` & `dailyReports.ts`)</title>
  <read_first>
    - src/server/api/routers/reports.ts
    - src/server/api/routers/dailyReports.ts
    - src/server/db/schema/users.ts
    - src/server/db/schema/daily_reports.ts
  </read_first>
  <action>
    Audit and harden `getReportData` in `src/server/api/routers/reports.ts` and `listScopedReports` in `src/server/api/routers/dailyReports.ts`:
    1. **Strict Employee Enforcement (REP-01):** If the caller's role is `Employee`, forcibly constrain `input.scope` to `"individual"` and ensure `effectiveId === ctx.dbUser.id`. Throw `TRPCError({ code: "FORBIDDEN" })` if an employee attempts to specify `scope: "team"`, `scope: "management"`, or `scope: "branch"`, or pass a `targetId` other than their own.
    2. **Manager Hierarchy Aggregation (REP-02):**
       - For managers querying `scope: "management"`, execute the recursive CTE query on `virat-crm_user_managers` starting from the manager's ID to fetch all direct and indirect team subordinates.
       - Include the manager's own ID in aggregate team metrics when appropriate or clearly separate individual vs team tabs.
       - Ensure managers cannot query arbitrary target users outside their reporting branch/subtree.
    3. **Admin Unrestricted Selection (REP-03):** Allow `Admin` and `Developer` roles to freely query any `targetId`, any `branchId`, and any `scope`.
  </action>
  <acceptance_criteria>
    - `src/server/api/routers/reports.ts` throws `FORBIDDEN` if an employee attempts cross-user or team queries.
    - `src/server/api/routers/dailyReports.ts` enforces the same role-based scope restrictions in `listScopedReports`.
    - Recursive CTE query correctly resolves multi-level manager hierarchy tree.
    - Admins and Developers can query any individual, team, or branch without `FORBIDDEN` errors.
  </acceptance_criteria>
</task>

<task>
  <id>49.2</id>
  <title>Refine Frontend Scope Controls & Dropdowns (`ReportList.tsx` & `MileageReportList.tsx`)</title>
  <read_first>
    - src/app/_components/reports/ReportList.tsx
    - src/app/_components/reports/MileageReportList.tsx
    - src/app/reports/page.tsx
  </read_first>
  <action>
    Enhance the reporting UI components to provide intuitive role-adaptive scope controls:
    1. **Scope Toggle Component:**
       - Employees see only their own history (no team toggle visible).
       - Managers see a toggle between "My Reports" (`scope: "individual"`) and "Team Reports" (`scope: "management"`).
       - Admins see "My Reports", "Team Reports", and "Branch Reports", along with selectable user/branch dropdowns.
    2. **Target User Dropdown for Admins (REP-03):**
       - Hook up `api.reports.getSelectableUsers.useQuery()` to populate an employee/manager filter when an Admin wants to inspect specific team or individual performance.
    3. **Mobile Layout & Card Styling:**
       - Ensure report list cards render cleanly on mobile viewports with adequate touch targets and safe-area padding (`pb-24`) to prevent obstruction by bottom navigation bars.
  </action>
  <acceptance_criteria>
    - Field employees do not see team/branch toggle buttons.
    - Managers can toggle between "My Reports" and "Team Reports" seamlessly.
    - Admins can select specific employees or branches from filter dropdowns.
    - Responsive mobile layout renders properly without UI truncation.
  </acceptance_criteria>
</task>

<task>
  <id>49.3</id>
  <title>Integration Tests for Report Scoping & Hierarchy Aggregation</title>
  <read_first>
    - tests/integration/multi-tenant.test.ts
    - src/server/api/routers/reports.ts
    - src/server/api/routers/dailyReports.ts
  </read_first>
  <action>
    Create a new Vitest integration test suite at `tests/integration/report-scoping.test.ts`:
    1. Test that `Employee` attempting to access team or branch scope throws `TRPCError` with code `FORBIDDEN`.
    2. Test that `Manager` querying their team scope retrieves their subordinate user IDs.
    3. Test that `Admin` can query any employee, manager, or branch scope without restriction.
    4. Run `pnpm vitest run tests/integration/report-scoping.test.ts` to verify 100% test pass.
  </action>
  <acceptance_criteria>
    - `tests/integration/report-scoping.test.ts` is created and passes cleanly.
    - Covers REP-01, REP-02, and REP-03 requirements with explicit assertions.
    - `pnpm check` and `pnpm vitest run` exit with code 0.
  </acceptance_criteria>
</task>

---

## Verification & Acceptance Plan
1. **Automated Vitest Suite:** Run `pnpm vitest run tests/integration/report-scoping.test.ts`.
2. **Type Safety & Lint:** Run `pnpm check` to ensure zero TypeScript errors or lint issues.
3. **Manual Simulation:** Test report retrieval for `Employee` (emp001), `Manager`, and `Admin` (EMP001) to verify correct data scoping and access enforcement.
