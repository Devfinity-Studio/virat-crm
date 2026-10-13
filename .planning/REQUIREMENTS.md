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

## Traceability

| REQ-ID    | Phase | Status |
| --------- | ----- | ------ |
| REP-01    | 49    | [ ]    |
| REP-02    | 49    | [ ]    |
| REP-03    | 49    | [ ]    |
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
