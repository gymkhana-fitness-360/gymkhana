# Playbook: Mobile staff shell & PWA

## When to use

Staff use dashboard on phone — bottom nav, installable PWA, admin preview of employee UX.

## PWA

| File | Purpose |
|------|---------|
| `src/app/manifest.ts` | `start_url: '/dashboard'`, icons in `public/` |
| `public/sw.js` | Minimal shell cache — **do not** cache `/api/*` |
| `lib/sw-register.ts` | `registerServiceWorker()` in `DashboardShell` |

## Mobile bottom nav

`components/dashboard/mobile-bottom-nav.tsx`:

- Fixed bottom bar `md:hidden`
- Tabs: Home (admin), Members, Payments, Attendance + Menu (opens sidebar)
- `pb-[calc(4.25rem+env(safe-area-inset-bottom))]` on `SidebarInset`

## Assume employee view

| Piece | Path |
|-------|------|
| Hook | `hooks/use-assume-employee-view.ts` |
| Storage key | `fitness360_assume_employee_view` |
| Banner | `components/dashboard/assume-employee-view-banner.tsx` |
| Toggle | Settings → Session (admin only) |

When enabled: sidebar shows staff-limited nav; mobile nav hides Dashboard home.

## Dashboard shell

`components/dashboard/dashboard-shell.tsx` wires:

- `MobileSidebarCloseOnNavigate`
- `MobileBottomNav`
- `AssumeEmployeeViewBanner`
- `PwaBootstrap`

## Rules

- Staff nav is **subset** of admin — filter in `app-sidebar.tsx` via `useAssumeEmployeeView()`
- Do not duplicate routes — same URLs, fewer nav items
- Semantic tokens only (`rules/ui-kit.mdc`)
