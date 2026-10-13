# TRPC API Reference

The application uses TRPC to provide a typesafe API. Below are the primary routers defined in `src/server/api/routers`:

## Core Routers
- **`users`**: User management, authentication (`signup`), role assignments, and status toggling.
- **`hierarchy`**: Manager/Subordinate relationship queries.
- **`roles` / `permissions`**: RBAC configurations.

## Operations Routers
- **`sales`**: Create, update, and manage sales and sale assignments.
- **`inventory`**: Product tracking, stock transfers, and branch inventory management.
- **`replacements`**: Product replacements and defect tracking.
- **`dailyReports`**: Employee daily reporting, PDF generation, and zip exports.
- **`location`**: GPS breadcrumbs and customer visit location logging.

## Communication
- **`alerts` & `notifications`**: Email (Resend), Web Push, and SMS dispatch endpoints.

## Consuming the API
In React components:
```tsx
const { data } = api.users.getAllUsers.useQuery();
const mutation = api.sales.createSale.useMutation({
  onSuccess: () => utils.sales.getAll.invalidate()
});
```
