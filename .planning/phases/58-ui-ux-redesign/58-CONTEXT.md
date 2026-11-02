# Phase 58: UI and UX Redesign — Context & Requirements

## Goal & Strategic Intent
Overhaul the entire UI/UX of the application for mobile-first outdoor field employees (via Android APK wrapper) and managers/admins who are not tech-savvy. The interface must be effortlessly intuitive, impossible to get lost in, use plain everyday language, and operate in **strict light mode only** for maximum outdoor sunlight readability.

## Core Pillars & Requirements

### 1. Mandatory Stitch MCP Workflow (`UI-STITCH-01`)
- Use Stitch MCP tools to design, generate, and inspect UI screens/components before translating into Next.js React code.
- Primary mobile viewport: `390x844` with responsive scaling for desktop admin.

### 2. Strict Light Mode Only (`UI-LIGHT-01`)
- Completely strip all `dark:` Tailwind classes and dark theme toggles.
- Force `<html className="light" style={{ colorScheme: 'light' }}>` at root layout.
- High-contrast sunlight readable color palette:
  - Surface: Pure white (`#FFFFFF`) elevated cards
  - Background: Soft warm-gray (`#F8FAFC`)
  - Typography: Deep slate (`#0F172A`)
  - Status Emerald: Active / Location Sharing (`#16A34A`)
  - Status Amber: Offline buffer countdown (`#D97706`)
  - Status Crimson: Location Off / Lockout (`#DC2626`)
  - Action Royal Blue: Primary Buttons (`#2563EB`)

### 3. Mobile Ergonomics & Safe Areas (`UI-MOBILE-01`)
- Giant touch targets: min-height `52px–56px` (`min-h-[52px]`).
- Zero hidden menus: ban hamburger menus (`☰`), complex multi-level dropdowns, tiny close (`x`) icons, and swipe-only gestures.
- APK safe areas: `min-h-[100dvh]`, `pb-safe`, `select-none` on chrome, `overflow-x-hidden`.

### 4. Role-Aware Bottom Navigation (`UI-NAV-01`)
- Fixed Bottom Navigation Bar (max 3-4 items for Employees, 3-4 items for Admins).
- Large icons AND clear text labels (never icon-only).
- Strict RBAC sanitization: employees never download or see admin navigation or controls.

### 5. Plain Language & Status Clarity (`UI-STATUS-01`)
- Giant Status Hero Card with plain language:
  - "Your Location is Sharing Normally" (no telemetry jargon).
  - "No Internet: Your work is safe. Please turn on mobile data within X minutes."
  - "Location was turned off. Please tap below to log back in and allow location."
- Step-by-step visual location permission onboarding flow for Android APK.

### 6. Admin Live Map & Split Workspace (`UI-ADMIN-01`)
- Interactive Light-Mode map with bottom-sheet drawer on mobile / split view on desktop.
- High-contrast route line with numbered time pins and timeline scrubber.
- Admin Alert Center for instant notifications when location is disabled or users locked out.

