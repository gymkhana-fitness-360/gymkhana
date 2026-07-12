# Fitness360 UI kit

Dashboard and self-hosted product UI only.

## Foundation

- **Components:** shadcn/ui in `src/components/ui/`
- **Styling:** Tailwind CSS 4 + CSS variables in `src/app/globals.css`
- **Fonts:** Geist Sans / Geist Mono (`--font-geist-sans`, `--font-geist-mono`)
- **Icons:** `lucide-react`
- **Toasts:** `sonner` via `@/components/ui/toaster`

## shadcn primitives (installed)

```
avatar, badge, button, card, checkbox, collapsible, dialog,
dropdown-menu, form, input, label, pagination, select-native,
separator, sheet, sidebar, skeleton, table, tabs, textarea,
tooltip, theme-toggle
```

Add new shadcn components via project conventions (match existing `components/ui/*` patterns).

## Semantic color tokens

**Never** use raw `bg-white`, `text-gray-500`, etc. on dashboard surfaces.

| Token | Use |
|-------|-----|
| `bg-background` | Page background |
| `text-foreground` | Primary text |
| `bg-card` / `text-card-foreground` | Cards, panels |
| `bg-muted` / `text-muted-foreground` | Secondary surfaces, hints |
| `border-border` | All borders |
| `bg-primary` / `text-primary-foreground` | Primary actions |
| `bg-destructive` / `text-destructive-foreground` | Delete, errors |
| `bg-sidebar` + sidebar-* vars | App sidebar |

Dark mode: `.dark` class on root — `ThemeToggle` in header.

## Layout shell

```tsx
// src/app/dashboard/layout.tsx wraps children in:
<DashboardShell initialGyms={...} initialGymId={...}>
  {children}
</DashboardShell>
```

- `DashboardShell` — `SidebarProvider` + `AppSidebar` + `SiteHeader`
- `AppSidebar` — nav groups, permission-gated items, `useSidebarCounts`
- `SiteHeader` — gym selector, theme, user menu
- `GymSelector` — multi-gym switch (`GYM_COOKIE_NAME` / header)

**Spacing:** `p-3 md:p-4` content padding; `gap-3` / `gap-4` between sections.

## Dashboard component library

| Component | Path | Use |
|-----------|------|-----|
| `DashboardPageHeader` | `dashboard/dashboard-page-header.tsx` | Title + actions row |
| `StatCard` | `dashboard/stat-card.tsx` | KPI tiles |
| `CashflowWidgets` | `dashboard/cashflow-widgets.tsx` | Finance charts |
| `CollectionDashboard` | `dashboard/collection-dashboard.tsx` | Collections view |
| `DashboardQuickEntry` | `dashboard/dashboard-quick-entry.tsx` | Paste payment lines |
| `RefreshableRupee` | `dashboard/refreshable-rupee.tsx` | Animated ₹ stat |

## Feature component folders

```
src/components/members/     # Member detail, history, forms
src/components/bills/       # Bill templates, print
src/components/settings/    # Settings tabs, services catalog
src/components/marketplace/
src/components/leads/
src/components/attendance/
src/components/i18n/        # LocaleProvider
```

## Forms pattern

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<Label htmlFor="name">Name</Label>
<Input id="name" className="..." />
<Button type="submit">Save</Button>
```

Complex forms: `Form` + `react-hook-form` + Zod resolver (see existing member forms).

## Tables

Use `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` from `ui/table`.  
Pagination: `components/ui/pagination.tsx` for long lists.

## Money display

```tsx
import { formatCurrency } from "@/lib/utils";

<span>{formatCurrency(amount)}</span>  // ₹1,234 — en-IN
```

Respect gym `currencyCode` via `formatCurrencyAmount` from `@/lib/currency` when gym context known.

## Loading & errors

- `Skeleton` / `loading-skeleton.tsx` for page load
- `analytics-skeleton.tsx` for analytics
- `error-boundary.tsx` at app level
- `AnalyticsErrorBoundary` for chart sections

## Accessibility

- Icon-only buttons: `aria-label`
- Form fields: `Label` + `htmlFor`, `aria-invalid` on errors
- Focus rings: `focus-visible:ring-ring`

## Anti-patterns

- ❌ Inline styles for colors
- ❌ New raw `<button>` / `<input>` in dashboard
- ❌ Fetching Prisma from client components
- ❌ Hard-coded "Fitness360" — use `APP_NAME` from `site-config.ts`
- ❌ USD in product UI — default INR
