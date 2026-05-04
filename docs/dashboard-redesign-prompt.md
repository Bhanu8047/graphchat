# Dashboard Redesign — Vector Graph Web

@copilot redesign the authenticated app shell + dashboard route. Work entirely inside `apps/web/`. Do **not** modify backend, API, or `graph-service` code. Build on the new color system already in `globals.css` (`almond-silk`, `rosy-taupe`, `berry-crush`, `dusty-olive`, `space-indigo` palettes + semantic tokens) — do not reintroduce legacy colors.

---

## Engineering Principles (apply throughout)

### SOLID
- **S — Single Responsibility:** one component, one job. `Sidebar` lays out nav; `NavLink` renders a link with active state; `DashboardOverviewCard` renders one metric. Don't mix data fetching into presentational components.
- **O — Open/Closed:** new nav items, metric cards, or activity rows are added by data, not by editing the component.
- **L — Liskov Substitution:** every variant of `NavLink` (collapsed/expanded/mobile) honors the same prop contract.
- **I — Interface Segregation:** narrow prop interfaces. `NavLink` takes `{ href, label, icon, active }` — not the whole nav config.
- **D — Dependency Inversion:** consume `usePathname`, theme, and auth via hooks. Don't import singletons inside leaves.

### DRY
- One `navItems` source of truth (already at `apps/web/src/features/navigation/config/nav-items.ts`) — extend it with `icon` per item; consume everywhere (sidebar, mobile drawer, header breadcrumbs).
- One `useActiveRoute(href)` helper for active-state matching (handles nested routes like `/graphs/123` highlighting `/graphs`).
- One motion preset module (`motionPresets.ts`) for fade/slide/spring values reused across animations.
- Shared `Card`/`Surface` atoms — don't re-style panels inline.

### Atomic Design (existing structure)
- **atoms/** — Button, Input, Badge, Icon, Surface, Avatar (add if missing).
- **molecules/** — `NavLink`, `NavSection`, `ThemeToggle`, `UserMenu`, `BreadcrumbTrail`, `MetricCard`, `SearchTrigger`.
- **organisms/** — `AppSidebar` (replace existing), `AppHeader` (replace existing), `DashboardOverview`, `RecentActivityList`, `QuickActionsGrid`.
- **templates/** — update `AppFrame.tsx` to use the new sidebar/header.
- **features/dashboard/** — `DashboardPage.tsx` composes organisms; owns data hooks.

---

## Library Choice

You may add `@mui/material` + `@emotion/react` + `@emotion/styled` and `motion` (already present as `motion/react`).

**Constraint:** if you bring MUI in, use it sparingly — only for components that are genuinely heavy to build correctly: `Drawer` (mobile sidebar), `Menu` (user dropdown), `Tooltip`, `Skeleton`, `LinearProgress`. Keep all primary surfaces (cards, buttons, layout, nav) on the existing Tailwind atoms — do **not** wholesale replace them with MUI. Wrap MUI's `ThemeProvider` so MUI components consume our CSS-var tokens (`--background`, `--foreground`, `--primary`, etc.) and respond to light/dark.

If you can ship without MUI cleanly, prefer that. Don't add it speculatively.

---

## Layout Spec

```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar (fixed, 264px)  │ Header (sticky, 64px)             │
│  - Logo                 │  - Breadcrumb / page title        │
│  - Nav sections         │  - Global search                  │
│  - Footer (user card)   │  - ThemeToggle · UserMenu         │
│                         ├───────────────────────────────────┤
│                         │ Main (scrollable)                 │
│                         │  max-w-[1400px] mx-auto           │
│                         │  px responsive, generous py       │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar (`AppSidebar`)
- **Desktop ≥ lg:** fixed 264px wide, full viewport height, `surface-muted` background, hairline `border-r`.
- **Tablet/mobile < lg:** hidden; opens as MUI `Drawer` (or motion-animated panel if you skip MUI) from the left, 280px, with backdrop.
- Top: logo + product name; click → `/dashboard`.
- Body: nav sections. Group nav items into:
  - **Workspace:** Dashboard, Repositories, Graphs
  - **Intelligence:** Search, AI Assist
  - **Output:** Export
  - **Account:** Settings
  Each section has a small uppercase label in `--muted-foreground`.
- Each `NavLink`: icon (lucide-react if available, else simple svg), label, optional badge (e.g. count). Active state = `space-indigo-600` left bar (4px), `space-indigo-50` fill (light) / `space-indigo-800` (dark), `--foreground` text. Inactive = transparent bg, `--muted-foreground` text, hover lifts to `surface`.
- Use `useActiveRoute` so `/graphs/:id` keeps `/graphs` active.
- Bottom: compact user card — avatar, name, email truncated, theme toggle on the right. Clicking opens the user menu.
- Subtle `motion` stagger on initial mount (40ms per item, 12px y, 180ms).
- Internal scroll: `overflow-y-auto`, hidden scrollbar except on hover. Never let the sidebar push or clip; height = `100vh`, body uses `overflow-hidden` only on the layout container.

### Header (`AppHeader`)
- Sticky `top-0`, 64px tall, `surface` bg with `backdrop-blur` and a hairline `border-b` that appears on scroll.
- Left: collapsed-sidebar toggle (mobile only) + breadcrumb. Breadcrumb derives from `usePathname`: `Workspace › Dashboard`, `Workspace › Graphs › <id>`. Use `BreadcrumbTrail` molecule.
- Center: `SearchTrigger` (a button styled like an input: "Search graphs, repos…" + ⌘K shortcut hint). Opens a search dialog. Hidden < md; show search icon button instead.
- Right: ThemeToggle, notifications bell (placeholder, no logic), `UserMenu` (avatar → dropdown with Profile, Settings, Sign out). Use MUI `Menu` if you adopt it.

### Main content
- `<main>` wrapper: `flex-1 overflow-y-auto`. Inside, a centered container `mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 lg:py-10`.
- Page title row at the top of every page: H1 (`text-2xl lg:text-3xl font-medium tracking-tight`), subtitle, optional primary action button right-aligned. Wrap on small screens.

---

## Dashboard Page (`/dashboard`)

Replace `apps/web/src/features/dashboard/components/DashboardPage.tsx`. Sections, top to bottom:

1. **Welcome strip** — "Good morning, {firstName}" (time-aware), one-line context (e.g. "3 graphs updated today"). Right side: primary CTA `Import repository`.
2. **Metrics grid** — 4 `MetricCard` tiles: Repositories, Graphs, Vectors indexed, AI calls this week. Each card: label, big number, delta vs last week (green = `dusty-olive-600`, red = `berry-crush-600`), small sparkline placeholder. Grid: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4`. Cards must not overflow on narrow screens — number truncates with `tabular-nums`.
3. **Two-column row** (`grid-cols-1 lg:grid-cols-3 gap-4`):
   - **Recent activity** (col-span-2): list of last 8 events (repo synced, graph built, export run). Each row: icon, title, repo, relative timestamp, status badge. `max-h-[480px] overflow-y-auto`. Empty state via `EmptyState` molecule.
   - **Quick actions** (col-span-1): 4 large buttons in a 2×2 grid — Import repo, Build graph, Run search, Export. Each opens the relevant route. Hover lifts with soft `space-indigo-200` glow.
4. **Recent graphs** — horizontal scrollable rail (`overflow-x-auto snap-x`) of graph preview cards (image/placeholder, name, repo, node count, updated time). Hides scrollbar; arrow buttons appear on hover at md+.
5. **Footer hint band** — small muted card with link to docs.

All sections wrapped in `Surface` atoms with consistent radius (`rounded-2xl`) and padding. Honor `prefers-reduced-motion` — disable mount animations.

---

## Responsiveness checklist

- **375px (mobile):** sidebar hidden behind drawer; header collapses search to icon; metric grid 1-col; quick actions 2-col; recent graphs rail scrolls; no horizontal page scroll anywhere (`overflow-x-hidden` on body).
- **768px (tablet):** sidebar still drawer; metrics 2-col; activity + quick actions stack.
- **1024px (lg):** sidebar fixed; metrics 2- or 4-col; two-column row activates.
- **1440px+:** content centered with `max-w-[1400px]`, generous padding; nothing stretches edge-to-edge except the sidebar background.

## Overflow & sizing rules

- Layout container: `h-screen overflow-hidden flex` (sidebar + main column).
- Main column: `flex-1 min-w-0 flex flex-col` — `min-w-0` is critical so flex children can shrink and inner `truncate` works.
- Header: `shrink-0`. Main: `flex-1 overflow-y-auto`.
- Any text that could overflow (repo names, emails, graph titles): `truncate` + tooltip.
- Lists with bounded height use `max-h-*` + `overflow-y-auto`; never let pages double-scroll.
- Cards never set fixed heights — let content drive — but set `min-h` for visual rhythm where empty states would collapse.

---

## Active route helper

Create `apps/web/src/features/navigation/lib/useActiveRoute.ts`:

```ts
'use client';
import { usePathname } from 'next/navigation';

export function useActiveRoute(href: string): boolean {
  const pathname = usePathname();
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

Use it inside `NavLink`. Don't compute active state in `AppSidebar` — keep that logic in the leaf.

---

## Theming bridge (only if MUI is added)

Create `apps/web/src/features/theme/MuiThemeBridge.tsx` that reads the active class on `<html>` and builds a MUI theme whose `palette.primary.main`, `background.default`, `text.primary`, etc. resolve to `var(--primary)`, `var(--background)`, `var(--foreground)`. Wrap the app with `<MuiThemeBridge>` inside the existing theme provider. This keeps MUI components in lockstep with light/dark toggling.

---

## Animations (motion/react)

Create `apps/web/src/lib/motion-presets.ts`:

```ts
export const fadeInUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.18, ease: 'easeOut' },
};

export const stagger = (delay = 0) => ({
  ...fadeInUp,
  transition: { ...fadeInUp.transition, delay },
});
```

Use for: nav item mount, metric cards mount, activity rows. Keep durations under 200ms — calm, not bouncy. Wrap any motion in a `prefers-reduced-motion` guard.

---

## Files to add / change

**New / replace:**
- `components/organisms/AppSidebar.tsx` (replace)
- `components/organisms/AppHeader.tsx` (replace)
- `components/organisms/DashboardOverview.tsx`
- `components/organisms/RecentActivityList.tsx`
- `components/organisms/QuickActionsGrid.tsx`
- `components/organisms/RecentGraphsRail.tsx`
- `components/molecules/NavLink.tsx`
- `components/molecules/NavSection.tsx`
- `components/molecules/UserMenu.tsx`
- `components/molecules/SearchTrigger.tsx`
- `components/molecules/BreadcrumbTrail.tsx`
- `components/atoms/Avatar.tsx` (if missing)
- `features/navigation/lib/useActiveRoute.ts`
- `features/dashboard/components/DashboardPage.tsx` (replace)
- `lib/motion-presets.ts`

**Edit:**
- `components/templates/AppFrame.tsx` — switch to fixed-sidebar layout described above
- `features/navigation/config/nav-items.ts` — add `icon` field + `section` grouping
- (optional) `features/theme/MuiThemeBridge.tsx` if MUI is adopted
- `apps/web/package.json` — add `@mui/material`, `@emotion/react`, `@emotion/styled`, `lucide-react` only if used

---

## Acceptance

- `pnpm nx lint web` clean.
- `pnpm nx build web` clean.
- `pnpm nx dev web`: visit `/dashboard`, `/repos`, `/graphs`, `/search`, `/ai`, `/export`, `/settings` — sidebar active state correct on each, including nested routes.
- Test at 375 / 768 / 1024 / 1440 widths in both light and dark themes — no horizontal scroll, no clipped content, no double scrollbars.
- Keyboard: tab through sidebar → header → main; visible focus rings; ⌘K opens search trigger (placeholder OK).
- `prefers-reduced-motion: reduce` disables all motion.

Aesthetic target: **calm, minimal, content-first, generous whitespace, soft hairlines, restrained color**. The sidebar is utility, not decoration. When in doubt: less.
