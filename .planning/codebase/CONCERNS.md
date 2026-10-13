# CONCERNS

- **Test Coverage:** Test coverage appears low, with minimal files in the `tests/` directory.
- **File Sizes:** Some files, especially patching scripts (`patch_*.py`) and older build outputs, are large and might need cleanup.
- **Complexity in Routing:** The tRPC router structure (`src/server/api/routers/`) is growing and might require further modularization as features expand (e.g. nested routers).
- **Mobile Compatibility:** `MOBILE-SPEC.md` and `capacitor.config.ts` suggest a mobile build, ensure web components remain responsive and Capacitor compatible.
