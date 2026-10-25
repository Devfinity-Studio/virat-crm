# Requirements: Milestone 11 (Reporting Intelligence & Hierarchy Analytics)

## 1. Role-Based Report Scoping (`REP-xx`)

- **REP-01**: **Employee Scope**: Employees can only view their own individual reports (sales, daily activity, mileage, replacements).
- **REP-02**: **Manager Scope**: Managers can view aggregate reports encompassing all employees in their team (respecting the M:N graph hierarchy), plus their own individual reports.
- **REP-03**: **Admin Scope**: Admins have unrestricted access and can explicitly select to view reports for any specific employee, or select any manager to view that manager's team aggregate.

## 2. Branch-Level Reports (`BRANCH-xx`)

- **BRANCH-01**: **Branch Grouping**: Reports can be grouped and aggregated at the branch level.
- **BRANCH-02**: **Branch Filtering**: Implement dropdown filters to isolate report data to specific branches.

## 3. Visual Analytics (`VIS-xx`)

- **VIS-01**: **Sales Graphs**: Add graphical charts (bar/line) to visualize sales performance trends over time.
- **VIS-02**: **Metrics Dashboard**: Incorporate visual metrics (e.g., total sales, top employees, conversion rates) directly into the reporting UI using responsive charts (e.g., Recharts).

## 4. Daily Reports Fix (`FIX-xx`)

- **FIX-01**: **Submission Flow**: Diagnose and fix the "Submit Daily Report" form/page which is currently non-functional.

## 5. Employee Profiles (`EMP-xx`)

- **EMP-01**: **Custom Date of Joining**: The "Date of Joining" field in the Add Employee form must allow employers to input a custom date instead of defaulting to the current date.
- **EMP-02**: **Document & Photo Upload**: Support uploading and naming multiple PDF documents and a profile photo for each employee.
- **EMP-03**: **Employee Profile View**: Clicking an employee on the employee list page should open a dedicated profile view page for that employee.
- **EMP-04**: **Password Reset**: Provide an option on the employee profile page to change the employee's login password.
- **EMP-05**: **Active Sessions Display**: Display all devices/sessions where the employee is currently logged in on their profile page.

## 6. Mobile & Legal Compliance (`CAP-xx`, `COMP-xx`)

- **CAP-01**: **Mobile Application Build**: Compile web application into standalone native mobile apps for Android and iOS using Capacitor.
- **CAP-02**: **App Store Readiness**: Ensure Google Play Store guidelines, permissions, splash screens, and icons are fulfilled.
- **COMP-01**: **Legal Pages & Compliance**: Implement privacy policy, terms of service, cookie consent, and age verification accessible without requiring login.
- **COMP-02**: **Accessibility & Polish**: Improve form controls, contrast, and responsive layout for mobile screens.

## 7. Technical Debt Remediation (`DEBT-xx`)

- **DEBT-01**: **Root Directory & Script Cleanup**: Consolidate active utility scripts into `scripts/`, remove root legacy patch scripts (`patch_*.py`) and obsolete build output logs (`build_output*.txt`).
- **DEBT-02**: **Mobile Geolocation Entitlements & Battery Hardening**: Configure foreground notification channels and background geolocation permissions/entitlements for Android and iOS in Capacitor setup.
- **DEBT-03**: **Router Modularization & Service Layer**: Extract complex transaction and business logic from large routers (`sales.ts`, `users.ts`) into service helpers (`src/server/lib/services/`).
- **DEBT-04**: **Dynamic Feature Access Default Synchronization**: Implement automatic initialization sync ensuring all defined system features have default permission rows seeded in `rolePermissions`.

## Traceability

| REQ-ID    | Phase | Status |
| --------- | ----- | ------ |
| REP-01    | 49    | [x]    |
| REP-02    | 49    | [x]    |
| REP-03    | 49    | [x]    |
| BRANCH-01 | 50    | [ ]    |
| BRANCH-02 | 50    | [ ]    |
| VIS-01    | 51    | [ ]    |
| VIS-02    | 51    | [ ]    |
| FIX-01    | 48    | [x]    |
| EMP-01    | 52    | [ ]    |
| EMP-02    | 52    | [ ]    |
| EMP-03    | 52    | [ ]    |
| EMP-04    | 52    | [ ]    |
| EMP-05    | 52    | [ ]    |
| CAP-01    | 53    | [ ]    |
| CAP-02    | 53    | [ ]    |
| COMP-01   | 54    | [ ]    |
| COMP-02   | 54    | [ ]    |
| DEBT-01   | 55    | [ ]    |
| DEBT-02   | 55    | [ ]    |
| DEBT-03   | 55    | [ ]    |
| DEBT-04   | 55    | [ ]    |

