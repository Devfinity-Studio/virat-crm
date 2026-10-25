# Phase 49 Context: Role-Based Report Scoping & Hierarchy Aggregation

## Domain
Role-based report access control and recursive manager hierarchy aggregation for field daily reports, sales reports, and mileage reimbursements.

## Requirements Covered
- **REP-01**: Employee Scope — Employees can only view their own individual reports.
- **REP-02**: Manager Scope — Managers can view aggregate reports encompassing all employees in their team (respecting the M:N graph hierarchy via `userManagers`), plus their own individual reports.
- **REP-03**: Admin Scope — Admins have unrestricted access and can explicitly select to view reports for any specific employee, or select any manager to view that manager's team aggregate.

## Decisions Captured
1. **Frontend Scope Integration:** Use `reports.ts` `getReportData` and `dailyReports.ts` `listScopedReports` for data fetching.
2. **Mobile UI Design:** Boxy, clean cards with vibrant status badges and clear typography.
3. **Scroll & Layout Fixes:** Maintain `pb-24` safe-area padding so bottom navigation bars do not obscure action buttons or table items.
4. **Scope Navigation:** Toggle between "My Reports" vs "Team Reports" for Managers, and additional "Branch Reports" + employee selector for Admins. Employees do not see team toggles.
