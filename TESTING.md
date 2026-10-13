# Testing Strategy

*(Note: Automated testing frameworks are currently minimal or in setup phase).*

## Manual Verification
When developing features:
1. **API Validation**: Ensure Zod schemas strictly validate input payloads in TRPC routers.
2. **Database Integrity**: Verify relations and cascade deletions are functioning as expected (e.g., deleting a User also removes `userManagers` entries).
3. **UI State**: Ensure React Query caches are correctly invalidated after mutations (e.g., `utils.sales.getAll.invalidate()`).

## Future Implementations
- **Unit Testing**: Vitest setup is recommended for utility functions and TRPC router unit testing.
- **E2E Testing**: Playwright or Cypress for core user flows like the new employee creation or sales assignment processes.
