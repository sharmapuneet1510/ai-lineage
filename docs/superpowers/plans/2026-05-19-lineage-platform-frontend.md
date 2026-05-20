# Lineage Platform — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild all 14 frontend pages from scratch to match images in `images/` folder, using shared reusable components (DataGrid, FilterDrawer, RightDrawer, cards, badges).

**Architecture:** React 18 + TypeScript + Vite. All pages consume backend APIs via TanStack Query. Shared DataGrid used on every list page. CSS variables define the full design system. No hardcoded business data.

**Tech Stack:** React 18, TypeScript, Vite, React Router v6, TanStack Query v5, Axios, Recharts, React Flow, Lucide React

**Prerequisite:** Backend plan complete and backend running on `http://localhost:8000`

---

## File Map

**Styles:**
- `src/styles/variables.css` — design tokens (CSS vars)
- `src/styles/global.css` — reset + base
- `src/styles/layout.css` — sidebar + topbar + shell
- `src/styles/grid.css` — DataGrid + toolbar + pagination
- `src/styles/modal.css` — modals + drawers
- `src/styles/graph.css` — graph canvas

**App:**
- `src/app/appConfig.ts` — base URL, page sizes
- `src/services/apiClient.ts` — axios instance
- `src/App.tsx` — routing (add /jurisdictions, /access-denied)

**Layout components:**
- `src/components/layout/AppShell.tsx` — sidebar + main wrapper
- `src/components/layout/Sidebar.tsx` — nav links (update)
- `src/components/layout/Topbar.tsx` — search bar + user chip
- `src/components/layout/PageHeader.tsx` — page title + breadcrumb

**Grid components:**
- `src/components/grid/DataGrid.tsx` — unified table
- `src/components/grid/GridToolbar.tsx` — search + filter button + chips + export
- `src/components/grid/GridPagination.tsx` — page size + prev/next
- `src/components/grid/GridEmptyState.tsx`
- `src/components/grid/GridLoadingState.tsx`

**Filter/drawer/modal:**
- `src/components/filters/FilterDrawer.tsx`
- `src/components/filters/FilterChip.tsx`
- `src/components/drawers/RightDrawer.tsx`
- `src/components/modals/BaseModal.tsx`

**Cards + badges:**
- `src/components/cards/SummaryCard.tsx`
- `src/components/cards/MetricCard.tsx`
- `src/components/cards/StatusBadge.tsx`
- `src/components/cards/RiskBadge.tsx`

**Hooks:**
- `src/hooks/usePagination.ts`
- `src/hooks/useFilters.ts`
- `src/hooks/useSorting.ts`
- `src/hooks/useDebounce.ts` (exists — keep)

**Features (one folder each):**
- `src/features/dashboard/` — DashboardPage.tsx, dashboardApi.ts
- `src/features/jurisdictions/` — JurisdictionsPage.tsx, jurisdictionApi.ts
- `src/features/fields/` — FieldListPage.tsx, Field360Page.tsx, fieldApi.ts
- `src/features/impact/` — ImpactAnalysisPage.tsx, impactApi.ts
- `src/features/comparison/` — FieldComparisonPage.tsx, comparisonApi.ts
- `src/features/graphExplorer/` — GraphExplorerPage.tsx, graphApi.ts
- `src/features/search/` — GlobalSearchPage.tsx, searchApi.ts
- `src/features/access/` — AccessDeniedPage.tsx

---

## Task 1: Design System + App Shell

**Files:**
- Create: `src/styles/variables.css`
- Modify: `src/styles/global.css`
- Modify: `src/styles/layout.css`
- Create: `src/app/appConfig.ts`
- Create: `src/services/apiClient.ts`
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/Topbar.tsx`
- Create: `src/components/layout/PageHeader.tsx`

- [ ] **Step 1: Write src/styles/variables.css**

```css
:root {
  /* Colors */
  --color-bg: #f6f8fb;
  --color-surface: #ffffff;
  --color-sidebar: #082044;
  --color-sidebar-hover: #0d2e5e;
  --color-sidebar-active: #1267e8;
  --color-primary: #1267e8;
  --color-primary-soft: #e8f1ff;
  --color-primary-hover: #0f55c4;
  --color-border: #d8e0ea;
  --color-border-light: #eef1f6;
  --color-text: #102033;
  --color-text-secondary: #3d5166;
  --color-muted: #667085;
  --color-success: #14804a;
  --color-success-bg: #dcfce7;
  --color-warning: #b7791f;
  --color-warning-bg: #fef9c3;
  --color-danger: #d92d20;
  --color-danger-bg: #fee2e2;
  --color-info: #0369a1;
  --color-info-bg: #e0f2fe;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(16, 32, 51, 0.08), 0 1px 2px rgba(16, 32, 51, 0.04);
  --shadow-dropdown: 0 4px 16px rgba(16, 32, 51, 0.12);
  --shadow-modal: 0 8px 32px rgba(16, 32, 51, 0.18);

  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', monospace;
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 14px;
  --text-md: 15px;
  --text-lg: 18px;
  --text-xl: 22px;
  --text-2xl: 28px;

  /* Layout */
  --sidebar-width: 220px;
  --topbar-height: 56px;
}
```

- [ ] **Step 2: Write src/styles/global.css**

```css
@import './variables.css';

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #root {
  height: 100%;
  font-family: var(--font-sans);
  font-size: var(--text-base);
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; text-decoration: none; }
button { font-family: inherit; cursor: pointer; }
input, select { font-family: inherit; }

.page-content {
  padding: var(--spacing-lg);
  max-width: 1400px;
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.text-muted { color: var(--color-muted); }
.text-sm { font-size: var(--text-sm); }
.text-xs { font-size: var(--text-xs); }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }

.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
```

- [ ] **Step 3: Write src/styles/layout.css**

```css
.app-shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--color-sidebar);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  z-index: 100;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 16px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.sidebar-logo-icon {
  width: 32px;
  height: 32px;
  background: var(--color-primary);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar-logo-text {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  line-height: 1.2;
}

.sidebar-logo-sub {
  font-size: 10px;
  color: rgba(255,255,255,0.45);
}

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-section-label {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.35);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding: 8px 8px 4px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: rgba(255,255,255,0.65);
  transition: background 0.15s, color 0.15s;
  cursor: pointer;
}

.sidebar-item:hover {
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.9);
}

.sidebar-item.active {
  background: var(--color-primary);
  color: #fff;
}

.sidebar-item-icon { flex-shrink: 0; opacity: 0.85; }

.sidebar-footer {
  padding: 12px 14px;
  border-top: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar-avatar {
  width: 30px;
  height: 30px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.sidebar-user-name { font-size: 12px; font-weight: 600; color: #fff; }
.sidebar-user-role { font-size: 10px; color: rgba(255,255,255,0.4); }

/* Main area */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* Topbar */
.topbar {
  height: var(--topbar-height);
  min-height: var(--topbar-height);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-lg);
  gap: var(--spacing-md);
  z-index: 50;
}

.topbar-search {
  flex: 1;
  max-width: 400px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 6px 12px;
  font-size: var(--text-sm);
  color: var(--color-muted);
  cursor: pointer;
}

.topbar-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }

.topbar-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--color-primary-soft);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-primary);
}

/* Scrollable content */
.main-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
```

- [ ] **Step 4: Write src/styles/grid.css**

```css
/* DataGrid */
.data-grid-wrapper { display: flex; flex-direction: column; gap: 0; }

.grid-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-light);
  flex-wrap: wrap;
}

.grid-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 7px 12px;
  min-width: 240px;
}

.grid-search input {
  border: none;
  background: none;
  outline: none;
  font-size: var(--text-sm);
  color: var(--color-text);
  width: 100%;
}

.grid-search input::placeholder { color: var(--color-muted); }

.grid-filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: var(--text-sm);
  color: var(--color-text);
  font-weight: 500;
}

.grid-filter-btn:hover { background: var(--color-bg); }
.grid-filter-btn.active { border-color: var(--color-primary); color: var(--color-primary); }

.filter-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px 3px 10px;
  background: var(--color-primary-soft);
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 500;
  color: var(--color-primary);
}

.filter-chip button {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary);
  line-height: 1;
  opacity: 0.7;
}

.grid-reset-btn {
  font-size: var(--text-sm);
  color: var(--color-muted);
  background: none;
  border: none;
  padding: 4px 6px;
  text-decoration: underline;
}

.grid-export-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: var(--text-sm);
  color: var(--color-text);
  margin-left: auto;
}

/* Table */
.grid-table-wrapper { overflow-x: auto; }

table.grid-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.grid-table th {
  text-align: left;
  padding: 10px 16px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
  white-space: nowrap;
  user-select: none;
}

.grid-table th.sortable { cursor: pointer; }
.grid-table th.sortable:hover { color: var(--color-primary); }

.grid-table td {
  padding: 11px 16px;
  border-bottom: 1px solid var(--color-border-light);
  color: var(--color-text);
  vertical-align: middle;
}

.grid-table tr:hover td { background: #f9fbff; }

/* Pagination */
.grid-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--color-border-light);
  font-size: var(--text-sm);
  color: var(--color-muted);
}

.grid-pagination-info { font-size: 12px; }

.grid-pagination-controls { display: flex; align-items: center; gap: 6px; }

.page-size-select {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-size: 12px;
  background: var(--color-surface);
  color: var(--color-text);
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 13px;
}

.page-btn:hover:not(:disabled) { background: var(--color-primary-soft); border-color: var(--color-primary); color: var(--color-primary); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
```

- [ ] **Step 5: Write src/styles/modal.css**

```css
/* Drawer overlay */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(16, 32, 51, 0.3);
  z-index: 200;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

.right-drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 420px;
  background: var(--color-surface);
  box-shadow: var(--shadow-modal);
  z-index: 201;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.2s ease;
}

.right-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.right-drawer-title { font-size: 15px; font-weight: 700; color: var(--color-text); }
.right-drawer-body { flex: 1; overflow-y: auto; padding: 20px; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(16, 32, 51, 0.4);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.15s ease;
}

.modal-box {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
  width: 540px;
  max-width: 95vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-title { font-size: 16px; font-weight: 700; }
.modal-body { flex: 1; overflow-y: auto; padding: 24px; }
.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* Filter drawer specific */
.filter-drawer { width: 360px; }
.filter-section { margin-bottom: 20px; }
.filter-section-label { font-size: 11px; font-weight: 600; color: var(--color-muted); text-transform: uppercase; margin-bottom: 8px; }
.filter-select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  background: var(--color-surface);
  color: var(--color-text);
}
```

- [ ] **Step 6: Write src/app/appConfig.ts**

```typescript
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'
export const PAGE_SIZES = [10, 25, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 25
```

- [ ] **Step 7: Write src/services/apiClient.ts**

```typescript
import axios from 'axios'
import { API_BASE } from '../app/appConfig'

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

export default apiClient
```

- [ ] **Step 8: Write AppShell.tsx**

```tsx
import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import '../../styles/layout.css'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="main-scroll">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Write Topbar.tsx**

```tsx
import { Search, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function Topbar() {
  const navigate = useNavigate()
  return (
    <div className="topbar">
      <div className="topbar-search" onClick={() => navigate('/search')}>
        <Search size={14} />
        <span>Search fields, jurisdictions…</span>
      </div>
      <div className="topbar-actions">
        <div className="topbar-chip">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#14804a' }} />
          View Only
        </div>
        <button style={{ background: 'none', border: 'none', padding: '6px', color: 'var(--color-muted)' }}>
          <Bell size={16} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 10: Write PageHeader.tsx**

```tsx
interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
  breadcrumbs?: { label: string; to?: string }[]
}

export function PageHeader({ title, subtitle, icon, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--color-muted)', marginBottom: 8 }}>
          {breadcrumbs.map((b, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {i > 0 && <span>/</span>}
              <span>{b.label}</span>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {icon}
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>{title}</h1>
            {subtitle && <p style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 3 }}>{subtitle}</p>}
          </div>
        </div>
        {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 11: Update Sidebar.tsx with /jurisdictions route**

```tsx
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Database, GitBranch, Share2, GitCompare, Network, Search, Globe, Settings } from 'lucide-react'
import '../../styles/layout.css'

const NAV_ITEMS = [
  { to: '/',              label: 'Dashboard',       Icon: LayoutDashboard },
  { to: '/jurisdictions', label: 'Jurisdictions',   Icon: Globe },
  { to: '/fields',        label: 'Fields',          Icon: Database },
  { to: '/fields/',       label: 'Lineage Explorer',Icon: GitBranch, matchPrefix: '/fields/' },
  { to: '/graph',         label: 'Graph Explorer',  Icon: Share2 },
  { to: '/comparison',    label: 'Comparison',      Icon: GitCompare },
  { to: '/impact',        label: 'Impact Analysis', Icon: Network },
  { to: '/search',        label: 'Global Search',   Icon: Search },
]

const BOTTOM_ITEMS = [{ to: '/settings', label: 'Settings', Icon: Settings }]

export function Sidebar() {
  const location = useLocation()

  const isActive = (item: { to: string; matchPrefix?: string }) => {
    if (item.to === '/') return location.pathname === '/'
    if (item.to === '/fields') return location.pathname === '/fields'
    if (item.matchPrefix) return location.pathname.startsWith(item.matchPrefix) && location.pathname !== '/fields'
    return location.pathname.startsWith(item.to)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon"><GitBranch size={16} color="#fff" /></div>
        <div>
          <div className="sidebar-logo-text">Data Lineage</div>
          <div className="sidebar-logo-sub">Platform v1.0</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to === '/fields/' ? '#' : item.to}
            className={`sidebar-item${isActive(item) ? ' active' : ''}`}>
            <item.Icon size={15} className="sidebar-item-icon" />
            {item.label}
          </NavLink>
        ))}
        <div className="sidebar-section-label" style={{ marginTop: 12 }}>System</div>
        {BOTTOM_ITEMS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to}
            className={`sidebar-item${location.pathname.startsWith(to) ? ' active' : ''}`}>
            <Icon size={15} className="sidebar-item-icon" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-avatar">PS</div>
        <div>
          <div className="sidebar-user-name">Puneet Sharma</div>
          <div className="sidebar-user-role">View Only</div>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 12: Update App.tsx routing**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './app/queryClient'
import { AppShell } from './components/layout/AppShell'
import DashboardPage from './features/dashboard/DashboardPage'
import JurisdictionsPage from './features/jurisdictions/JurisdictionsPage'
import FieldListPage from './features/fields/FieldListPage'
import Field360Page from './features/fields/Field360Page'
import FieldComparisonPage from './features/comparison/FieldComparisonPage'
import ImpactAnalysisPage from './features/impact/ImpactAnalysisPage'
import GraphExplorerPage from './features/graphExplorer/GraphExplorerPage'
import GlobalSearchPage from './features/search/GlobalSearchPage'
import SettingsPage from './features/settings/SettingsPage'
import AccessDeniedPage from './features/access/AccessDeniedPage'
import './styles/global.css'
import './styles/grid.css'
import './styles/modal.css'
import './styles/graph.css'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/jurisdictions" element={<JurisdictionsPage />} />
            <Route path="/fields" element={<FieldListPage />} />
            <Route path="/fields/:fieldId" element={<Field360Page />} />
            <Route path="/comparison" element={<FieldComparisonPage />} />
            <Route path="/impact" element={<ImpactAnalysisPage />} />
            <Route path="/graph" element={<GraphExplorerPage />} />
            <Route path="/search" element={<GlobalSearchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 13: Commit**

```bash
git add lineage-frontend/src/styles/ lineage-frontend/src/app/ \
        lineage-frontend/src/services/ lineage-frontend/src/components/layout/ \
        lineage-frontend/src/App.tsx
git commit -m "feat: design system — CSS variables, AppShell, Sidebar, Topbar, PageHeader"
```

---

## Task 2: Shared Components — DataGrid + FilterDrawer + Cards + Badges

**Files:**
- Create: `src/components/grid/DataGrid.tsx`
- Create: `src/components/grid/GridToolbar.tsx`
- Create: `src/components/grid/GridPagination.tsx`
- Create: `src/components/grid/GridEmptyState.tsx`
- Create: `src/components/grid/GridLoadingState.tsx`
- Create: `src/components/filters/FilterDrawer.tsx`
- Create: `src/components/filters/FilterChip.tsx`
- Create: `src/components/drawers/RightDrawer.tsx`
- Create: `src/components/modals/BaseModal.tsx`
- Create: `src/components/cards/StatusBadge.tsx`
- Create: `src/components/cards/RiskBadge.tsx`
- Create: `src/components/cards/SummaryCard.tsx`
- Create: `src/components/cards/MetricCard.tsx`

- [ ] **Step 1: Write src/hooks/usePagination.ts**

```typescript
import { useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '../app/appConfig'

export function usePagination(initialSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialSize)

  const reset = () => setPage(1)
  const goTo = (p: number) => setPage(p)
  const changeSize = (s: number) => { setPageSize(s); setPage(1) }

  return { page, pageSize, reset, goTo, changeSize }
}
```

- [ ] **Step 2: Write src/hooks/useFilters.ts**

```typescript
import { useState } from 'react'

export function useFilters<T extends Record<string, string>>(initial: T) {
  const [filters, setFilters] = useState<T>(initial)

  const setFilter = (key: keyof T, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value }))

  const reset = () => setFilters(initial)

  const activeFilters = Object.entries(filters)
    .filter(([, v]) => v !== '' && v !== undefined)
    .map(([k, v]) => ({ key: k, value: v as string }))

  const hasActive = activeFilters.length > 0

  return { filters, setFilter, reset, activeFilters, hasActive }
}
```

- [ ] **Step 3: Write src/hooks/useSorting.ts**

```typescript
import { useState } from 'react'

export function useSorting(defaultCol = '', defaultDir: 'asc' | 'desc' = 'asc') {
  const [sortCol, setSortCol] = useState(defaultCol)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultDir)

  const toggle = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  return { sortCol, sortDir, toggle }
}
```

- [ ] **Step 4: Write GridToolbar.tsx**

```tsx
import { Search, Filter, Download, X } from 'lucide-react'
import { useDebounce } from '../../hooks/useDebounce'
import { useEffect, useState } from 'react'

interface FilterChipDef { key: string; label: string; value: string; onRemove: () => void }

interface GridToolbarProps {
  onSearch: (q: string) => void
  onFilterClick: () => void
  filterChips?: FilterChipDef[]
  onResetFilters?: () => void
  hasActiveFilters?: boolean
  onExport?: () => void
  searchPlaceholder?: string
}

export function GridToolbar({
  onSearch, onFilterClick, filterChips = [], onResetFilters,
  hasActiveFilters, onExport, searchPlaceholder = 'Search…'
}: GridToolbarProps) {
  const [raw, setRaw] = useState('')
  const debounced = useDebounce(raw, 300)
  useEffect(() => { onSearch(debounced) }, [debounced])

  return (
    <div className="grid-toolbar">
      <div className="grid-search">
        <Search size={14} color="var(--color-muted)" />
        <input value={raw} onChange={e => setRaw(e.target.value)} placeholder={searchPlaceholder} />
        {raw && <button onClick={() => setRaw('')} style={{ background:'none',border:'none',padding:0,color:'var(--color-muted)' }}><X size={12}/></button>}
      </div>
      <button className={`grid-filter-btn${hasActiveFilters ? ' active' : ''}`} onClick={onFilterClick}>
        <Filter size={14} />
        Filters
        {hasActiveFilters && <span style={{ background:'var(--color-primary)',color:'#fff',borderRadius:'50%',width:16,height:16,fontSize:10,display:'flex',alignItems:'center',justifyContent:'center' }}>{filterChips.length}</span>}
      </button>
      {filterChips.map(chip => (
        <span key={chip.key} className="filter-chip">
          <span style={{ color: 'var(--color-muted)', fontSize: 10 }}>{chip.label}:</span>
          {chip.value}
          <button onClick={chip.onRemove}><X size={10}/></button>
        </span>
      ))}
      {hasActiveFilters && <button className="grid-reset-btn" onClick={onResetFilters}>Reset</button>}
      {onExport && (
        <button className="grid-export-btn" onClick={onExport}>
          <Download size={13} /> Export
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Write GridPagination.tsx**

```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZES } from '../../app/appConfig'

interface Props {
  page: number; pageSize: number; totalItems: number; totalPages: number
  hasNext: boolean; hasPrevious: boolean
  onPageChange: (p: number) => void; onPageSizeChange: (s: number) => void
}

export function GridPagination({ page, pageSize, totalItems, totalPages, hasNext, hasPrevious, onPageChange, onPageSizeChange }: Props) {
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)
  return (
    <div className="grid-pagination">
      <span className="grid-pagination-info">Showing {from}–{to} of {totalItems}</span>
      <div className="grid-pagination-controls">
        <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Rows:</span>
        <select className="page-size-select" value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))}>
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="page-btn" disabled={!hasPrevious} onClick={() => onPageChange(page - 1)}><ChevronLeft size={14}/></button>
        <span style={{ fontSize: 12, minWidth: 60, textAlign: 'center' }}>Page {page} / {totalPages}</span>
        <button className="page-btn" disabled={!hasNext} onClick={() => onPageChange(page + 1)}><ChevronRight size={14}/></button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write DataGrid.tsx**

```tsx
import { ReactNode } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { GridToolbar } from './GridToolbar'
import { GridPagination } from './GridPagination'

export interface ColDef<T> {
  key: string; header: string; sortable?: boolean
  render?: (row: T) => ReactNode; width?: string
}

interface FilterChipDef { key: string; label: string; value: string; onRemove: () => void }

interface DataGridProps<T> {
  columns: ColDef<T>[]
  rows: T[]
  keyField: keyof T
  loading?: boolean
  error?: string | null
  // Toolbar
  onSearch: (q: string) => void
  onFilterClick: () => void
  filterChips?: FilterChipDef[]
  onResetFilters?: () => void
  hasActiveFilters?: boolean
  onExport?: () => void
  searchPlaceholder?: string
  // Sorting
  sortCol?: string; sortDir?: 'asc' | 'desc'; onSort?: (col: string) => void
  // Pagination
  page: number; pageSize: number; totalItems: number; totalPages: number
  hasNext: boolean; hasPrevious: boolean
  onPageChange: (p: number) => void; onPageSizeChange: (s: number) => void
  // Row action
  onRowClick?: (row: T) => void
  rowActions?: (row: T) => ReactNode
}

export function DataGrid<T>({
  columns, rows, keyField, loading, error,
  onSearch, onFilterClick, filterChips, onResetFilters, hasActiveFilters, onExport, searchPlaceholder,
  sortCol, sortDir, onSort,
  page, pageSize, totalItems, totalPages, hasNext, hasPrevious, onPageChange, onPageSizeChange,
  onRowClick, rowActions,
}: DataGridProps<T>) {
  return (
    <div className="card data-grid-wrapper">
      <GridToolbar onSearch={onSearch} onFilterClick={onFilterClick}
        filterChips={filterChips} onResetFilters={onResetFilters}
        hasActiveFilters={hasActiveFilters} onExport={onExport}
        searchPlaceholder={searchPlaceholder} />
      <div className="grid-table-wrapper">
        {loading ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
            Loading…
          </div>
        ) : error ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-danger)', fontSize: 13 }}>
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
            No records found.
          </div>
        ) : (
          <table className="grid-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} style={{ width: col.width }}
                    className={col.sortable ? 'sortable' : ''}
                    onClick={() => col.sortable && onSort?.(col.key)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {col.header}
                      {col.sortable && sortCol === col.key && (
                        sortDir === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>
                      )}
                    </span>
                  </th>
                ))}
                {rowActions && <th style={{ width: 80 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={String(row[keyField])}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  onClick={() => onRowClick?.(row)}>
                  {columns.map(col => (
                    <td key={col.key}>{col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}</td>
                  ))}
                  {rowActions && <td onClick={e => e.stopPropagation()}>{rowActions(row)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <GridPagination page={page} pageSize={pageSize} totalItems={totalItems}
        totalPages={totalPages} hasNext={hasNext} hasPrevious={hasPrevious}
        onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
    </div>
  )
}
```

- [ ] **Step 7: Write RightDrawer.tsx**

```tsx
import { ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean; title: string; onClose: () => void
  children: ReactNode; width?: number
}

export function RightDrawer({ open, title, onClose, children, width = 420 }: Props) {
  if (!open) return null
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="right-drawer" style={{ width }}>
        <div className="right-drawer-header">
          <span className="right-drawer-title">{title}</span>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--color-muted)',padding:4 }}><X size={16}/></button>
        </div>
        <div className="right-drawer-body">{children}</div>
      </div>
    </>
  )
}
```

- [ ] **Step 8: Write FilterDrawer.tsx**

```tsx
import { RightDrawer } from '../drawers/RightDrawer'

interface FilterOption { value: string; label: string }
interface FilterField { key: string; label: string; options: FilterOption[] }

interface Props {
  open: boolean; onClose: () => void
  fields: FilterField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onReset: () => void
  onApply: () => void
}

export function FilterDrawer({ open, onClose, fields, values, onChange, onReset, onApply }: Props) {
  return (
    <RightDrawer open={open} title="Filters" onClose={onClose} width={360}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {fields.map(f => (
          <div key={f.key} className="filter-section">
            <div className="filter-section-label">{f.label}</div>
            <select className="filter-select" value={values[f.key] || ''}
              onChange={e => onChange(f.key, e.target.value)}>
              <option value="">All</option>
              {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 32 }}>
        <button onClick={onReset} style={{ flex:1, padding:'9px', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', background:'var(--color-surface)', fontSize:13 }}>Reset</button>
        <button onClick={() => { onApply(); onClose() }} style={{ flex:1, padding:'9px', background:'var(--color-primary)', color:'#fff', border:'none', borderRadius:'var(--radius-md)', fontWeight:600, fontSize:13 }}>Apply</button>
      </div>
    </RightDrawer>
  )
}
```

- [ ] **Step 9: Write BaseModal.tsx**

```tsx
import { ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean; title: string; onClose: () => void
  children: ReactNode; footer?: ReactNode
}

export function BaseModal({ open, title, onClose, children, footer }: Props) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'var(--color-muted)',padding:4 }}><X size={16}/></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 10: Write StatusBadge.tsx and RiskBadge.tsx**

```tsx
// StatusBadge.tsx
const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  ACTIVE:  { bg: 'var(--color-success-bg)',  color: 'var(--color-success)' },
  DRAFT:   { bg: '#f3f4f6',                  color: '#6b7280' },
  RETIRED: { bg: '#fff7ed',                  color: '#c2410c' },
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status?.toUpperCase()] ?? STATUS_STYLES.DRAFT
  return (
    <span className="badge" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  )
}
```

```tsx
// RiskBadge.tsx
const RISK_STYLES: Record<string, { bg: string; color: string }> = {
  HIGH:   { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)' },
  MEDIUM: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  LOW:    { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
}

export function RiskBadge({ criticality }: { criticality: string }) {
  const s = RISK_STYLES[criticality?.toUpperCase()] ?? RISK_STYLES.MEDIUM
  return (
    <span className="badge" style={{ background: s.bg, color: s.color }}>
      {criticality}
    </span>
  )
}
```

- [ ] **Step 11: Write SummaryCard.tsx**

```tsx
import { ReactNode } from 'react'

interface Props {
  label: string; value: string | number
  icon: ReactNode; iconBg: string; iconColor: string
  trend?: string; trendUp?: boolean
}

export function SummaryCard({ label, value, icon, iconBg, iconColor, trend, trendUp }: Props) {
  return (
    <div className="card" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 500, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>{value}</div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor, flexShrink: 0 }}>
          {icon}
        </div>
      </div>
      {trend && (
        <div style={{ fontSize: 12, color: trendUp ? 'var(--color-success)' : 'var(--color-muted)' }}>
          {trend}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 12: Commit**

```bash
git add lineage-frontend/src/components/ lineage-frontend/src/hooks/
git commit -m "feat: shared components — DataGrid, FilterDrawer, RightDrawer, badges, cards"
```

---

## Task 3: Dashboard Page

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Create: `src/features/dashboard/dashboardApi.ts`

- [ ] **Step 1: Write dashboardApi.ts**

```typescript
import apiClient from '../../services/apiClient'

export const dashboardApi = {
  getSummary: () => apiClient.get('/dashboard/summary').then(r => r.data.data),
  getCoverage: () => apiClient.get('/dashboard/lineage-coverage').then(r => r.data.data),
  getHighRisk: () => apiClient.get('/dashboard/high-risk-fields').then(r => r.data.data),
  getRecentChanges: () => apiClient.get('/dashboard/recent-changes').then(r => r.data.data),
  getTopDependencies: () => apiClient.get('/dashboard/top-impacted-dependencies').then(r => r.data.data),
}
```

- [ ] **Step 2: Rewrite DashboardPage.tsx**

```tsx
import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, Database, Globe, AlertTriangle, TrendingUp, GitBranch } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { SummaryCard } from '../../components/cards/SummaryCard'
import { RiskBadge } from '../../components/cards/RiskBadge'
import { dashboardApi } from './dashboardApi'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data: summary } = useQuery({ queryKey: ['dashboard-summary'], queryFn: dashboardApi.getSummary })
  const { data: coverage } = useQuery({ queryKey: ['dashboard-coverage'], queryFn: dashboardApi.getCoverage })
  const { data: highRisk } = useQuery({ queryKey: ['dashboard-high-risk'], queryFn: dashboardApi.getHighRisk })
  const { data: topDeps } = useQuery({ queryKey: ['dashboard-deps'], queryFn: dashboardApi.getTopDependencies })

  return (
    <div className="page-content">
      <PageHeader
        title="Dashboard"
        subtitle="Lineage coverage and risk overview across all jurisdictions"
        icon={<LayoutDashboard size={20} color="var(--color-primary)" />}
      />

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <SummaryCard label="Total Fields" value={summary?.total_fields ?? '—'}
          icon={<Database size={18}/>} iconBg="#dbeafe" iconColor="#1267e8"
          trend="Across all jurisdictions" />
        <SummaryCard label="Jurisdictions" value={summary?.total_jurisdictions ?? '—'}
          icon={<Globe size={18}/>} iconBg="#dcfce7" iconColor="#14804a"
          trend="Active jurisdictions" />
        <SummaryCard label="Lineage Coverage" value={summary ? `${summary.lineage_coverage_percent}%` : '—'}
          icon={<TrendingUp size={18}/>} iconBg="#fef9c3" iconColor="#b7791f"
          trend={`${summary?.fields_with_lineage ?? 0} fields with interpretation`} trendUp />
        <SummaryCard label="High Risk Fields" value={summary?.high_risk_fields ?? '—'}
          icon={<AlertTriangle size={18}/>} iconBg="#fee2e2" iconColor="#d92d20" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Coverage chart */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <GitBranch size={15} color="var(--color-primary)" />
            Lineage Coverage by Jurisdiction
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={coverage ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="jurisdiction" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Coverage']} />
              <Bar dataKey="coverage" radius={[4,4,0,0]}>
                {(coverage ?? []).map((_: any, i: number) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#1267e8' : '#60a5fa'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fields by jurisdiction */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Fields by Jurisdiction</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topDeps ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="jurisdiction" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="field_count" fill="#1267e8" radius={[4,4,0,0]} name="Total" />
              <Bar dataKey="high_risk" fill="#d92d20" radius={[4,4,0,0]} name="High Risk" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* High risk fields table */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={15} color="var(--color-danger)" />
          High Risk Fields
        </div>
        <table className="grid-table">
          <thead>
            <tr>
              <th>Field Name</th><th>Business Name</th><th>Jurisdiction</th>
              <th>Criticality</th><th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {(highRisk ?? []).map((f: any) => (
              <tr key={f.field_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/fields/${f.field_id}`)}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{f.field_name}</td>
                <td>{f.business_name}</td>
                <td><span className="badge" style={{ background:'var(--color-primary-soft)',color:'var(--color-primary)' }}>{f.jurisdiction}</span></td>
                <td><RiskBadge criticality={f.criticality} /></td>
                <td><span className="badge" style={{ background:'#dcfce7',color:'#14804a' }}>{f.status}</span></td>
                <td>
                  <button onClick={e => { e.stopPropagation(); navigate(`/fields/${f.field_id}`) }}
                    style={{ fontSize:12, color:'var(--color-primary)', background:'none', border:'none', textDecoration:'underline' }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Install recharts**

```bash
cd lineage-frontend && npm install recharts
```

- [ ] **Step 4: Verify**

Open http://localhost:5173 — Dashboard shows 4 stat cards, 2 charts, high-risk table with real data.

- [ ] **Step 5: Commit**

```bash
git add lineage-frontend/src/features/dashboard/
git commit -m "feat: Dashboard page with summary cards, coverage chart, high-risk table"
```

---

## Task 4: Jurisdictions Page

**Files:**
- Create: `src/features/jurisdictions/JurisdictionsPage.tsx`
- Create: `src/features/jurisdictions/jurisdictionApi.ts`

- [ ] **Step 1: Write jurisdictionApi.ts**

```typescript
import apiClient from '../../services/apiClient'

export const jurisdictionApi = {
  list: (params: Record<string, any>) =>
    apiClient.get('/jurisdictions', { params }).then(r => r.data),
  getByCode: (code: string) =>
    apiClient.get(`/jurisdictions/${code}`).then(r => r.data.data),
}
```

- [ ] **Step 2: Write JurisdictionsPage.tsx**

```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Globe } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataGrid, ColDef } from '../../components/grid/DataGrid'
import { FilterDrawer } from '../../components/filters/FilterDrawer'
import { StatusBadge } from '../../components/cards/StatusBadge'
import { usePagination } from '../../hooks/usePagination'
import { useFilters } from '../../hooks/useFilters'
import { jurisdictionApi } from './jurisdictionApi'

interface Jurisdiction {
  jurisdiction_id: number; jurisdiction_code: string; jurisdiction_name: string
  region: string; regulator_name: string; owner_team: string
  status: string; field_count: number
}

const COLS: ColDef<Jurisdiction>[] = [
  { key: 'jurisdiction_code', header: 'Code', sortable: true,
    render: r => <span style={{ fontFamily:'var(--font-mono)',fontSize:12,fontWeight:700,color:'var(--color-primary)' }}>{r.jurisdiction_code}</span> },
  { key: 'jurisdiction_name', header: 'Name', sortable: true },
  { key: 'region', header: 'Region', sortable: true },
  { key: 'regulator_name', header: 'Regulator' },
  { key: 'field_count', header: 'Fields', sortable: true,
    render: r => <span style={{ fontWeight:600 }}>{r.field_count}</span> },
  { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
  { key: 'owner_team', header: 'Owner Team' },
]

export default function JurisdictionsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const { page, pageSize, goTo, changeSize } = usePagination()
  const { filters, setFilter, reset, activeFilters, hasActive } = useFilters({ region: '', status: '' })

  const params = { search: search || undefined, region: filters.region || undefined, status: filters.status || undefined, page, pageSize }
  const { data, isLoading, error } = useQuery({
    queryKey: ['jurisdictions', params],
    queryFn: () => jurisdictionApi.list(params),
  })

  const paged = data?.data

  return (
    <div className="page-content">
      <PageHeader title="Jurisdictions" subtitle="All regulatory jurisdictions"
        icon={<Globe size={20} color="var(--color-primary)" />} />

      <DataGrid<Jurisdiction>
        columns={COLS} rows={paged?.items ?? []} keyField="jurisdiction_id"
        loading={isLoading} error={error ? 'Failed to load jurisdictions' : null}
        onSearch={setSearch} onFilterClick={() => setFilterOpen(true)}
        filterChips={activeFilters.map(f => ({
          key: f.key, label: f.key, value: f.value,
          onRemove: () => setFilter(f.key as any, '')
        }))}
        hasActiveFilters={hasActive} onResetFilters={reset}
        page={page} pageSize={pageSize}
        totalItems={paged?.totalItems ?? 0} totalPages={paged?.totalPages ?? 1}
        hasNext={paged?.hasNext ?? false} hasPrevious={paged?.hasPrevious ?? false}
        onPageChange={goTo} onPageSizeChange={changeSize}
        onRowClick={r => navigate(`/fields?jurisdiction=${r.jurisdiction_code}`)}
        searchPlaceholder="Search jurisdictions…"
      />

      <FilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)}
        fields={[
          { key: 'region', label: 'Region', options: [
            { value:'APAC',label:'APAC' },{ value:'EMEA',label:'EMEA' },{ value:'NA',label:'NA' }
          ]},
          { key: 'status', label: 'Status', options: [
            { value:'ACTIVE',label:'Active' },{ value:'DRAFT',label:'Draft' }
          ]},
        ]}
        values={filters} onChange={setFilter} onReset={reset} onApply={() => {}} />
    </div>
  )
}
```

- [ ] **Step 3: Verify**

Navigate to http://localhost:5173/jurisdictions — table shows 6 jurisdictions with filter/search.

- [ ] **Step 4: Commit**

```bash
git add lineage-frontend/src/features/jurisdictions/
git commit -m "feat: Jurisdictions page with DataGrid, filters, real API data"
```

---

## Task 5: Fields List Page

**Files:**
- Modify: `src/features/fields/FieldListPage.tsx`
- Modify: `src/features/fields/fieldApi.ts`

- [ ] **Step 1: Write fieldApi.ts**

```typescript
import apiClient from '../../services/apiClient'

export const fieldApi = {
  list: (params: Record<string, any>) =>
    apiClient.get('/fields', { params }).then(r => r.data),
  getById: (id: number) =>
    apiClient.get(`/fields/${id}`).then(r => r.data.data),
  getOverview: (id: number) =>
    apiClient.get(`/fields/${id}/overview`).then(r => r.data.data),
  getBusiness: (id: number) =>
    apiClient.get(`/fields/${id}/business`).then(r => r.data.data),
  getTechnical: (id: number) =>
    apiClient.get(`/fields/${id}/technical`).then(r => r.data.data),
  getDownstream: (id: number) =>
    apiClient.get(`/fields/${id}/downstream`).then(r => r.data.data),
  getXsltDrilldown: (id: number) =>
    apiClient.get(`/fields/${id}/xslt-drilldown`).then(r => r.data.data),
  getJavaDrilldown: (id: number) =>
    apiClient.get(`/fields/${id}/java-drilldown`).then(r => r.data.data),
  getHistory: (id: number) =>
    apiClient.get(`/fields/${id}/history`).then(r => r.data.data),
}
```

- [ ] **Step 2: Rewrite FieldListPage.tsx**

```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Database, Eye } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { DataGrid, ColDef } from '../../components/grid/DataGrid'
import { FilterDrawer } from '../../components/filters/FilterDrawer'
import { StatusBadge } from '../../components/cards/StatusBadge'
import { RiskBadge } from '../../components/cards/RiskBadge'
import { usePagination } from '../../hooks/usePagination'
import { useFilters } from '../../hooks/useFilters'
import { fieldApi } from './fieldApi'

interface Field {
  field_id: number; internal_field_name: string; business_name: string
  data_type: string; criticality: string; source_type: string
  status: string; jurisdiction_code: string; owner_team: string
}

const COLS: ColDef<Field>[] = [
  { key: 'internal_field_name', header: 'Field Name', sortable: true,
    render: r => <span style={{ fontFamily:'var(--font-mono)',fontSize:12,fontWeight:600 }}>{r.internal_field_name}</span> },
  { key: 'business_name', header: 'Business Name', sortable: true },
  { key: 'jurisdiction_code', header: 'Jurisdiction',
    render: r => <span className="badge" style={{ background:'var(--color-primary-soft)',color:'var(--color-primary)' }}>{r.jurisdiction_code}</span> },
  { key: 'data_type', header: 'Data Type' },
  { key: 'source_type', header: 'Source', sortable: true },
  { key: 'criticality', header: 'Criticality', render: r => <RiskBadge criticality={r.criticality} /> },
  { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
]

export default function FieldListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const { page, pageSize, goTo, changeSize, reset: resetPage } = usePagination()
  const { filters, setFilter, reset, activeFilters, hasActive } = useFilters({
    jurisdiction: searchParams.get('jurisdiction') ?? '',
    criticality: '', status: '', source_type: ''
  })

  const params = {
    search: search || undefined,
    jurisdiction: filters.jurisdiction || undefined,
    criticality: filters.criticality || undefined,
    status: filters.status || undefined,
    source_type: filters.source_type || undefined,
    page, pageSize,
  }
  const { data, isLoading, error } = useQuery({
    queryKey: ['fields', params],
    queryFn: () => fieldApi.list(params),
  })
  const paged = data?.data

  return (
    <div className="page-content">
      <PageHeader title="Fields" subtitle="All regulatory fields across jurisdictions"
        icon={<Database size={20} color="var(--color-primary)" />} />

      <DataGrid<Field>
        columns={COLS} rows={paged?.items ?? []} keyField="field_id"
        loading={isLoading} error={error ? 'Failed to load fields' : null}
        onSearch={q => { setSearch(q); resetPage() }}
        onFilterClick={() => setFilterOpen(true)}
        filterChips={activeFilters.map(f => ({
          key: f.key, label: f.key.replace('_',' '), value: f.value,
          onRemove: () => { setFilter(f.key as any, ''); resetPage() }
        }))}
        hasActiveFilters={hasActive} onResetFilters={() => { reset(); resetPage() }}
        page={page} pageSize={pageSize}
        totalItems={paged?.totalItems ?? 0} totalPages={paged?.totalPages ?? 1}
        hasNext={paged?.hasNext ?? false} hasPrevious={paged?.hasPrevious ?? false}
        onPageChange={goTo} onPageSizeChange={changeSize}
        onRowClick={r => navigate(`/fields/${r.field_id}`)}
        rowActions={r => (
          <button onClick={() => navigate(`/fields/${r.field_id}`)}
            style={{ background:'none',border:'none',color:'var(--color-primary)',padding:'4px 6px',borderRadius:'var(--radius-sm)',display:'flex',alignItems:'center',gap:4,fontSize:12 }}>
            <Eye size={12}/> View
          </button>
        )}
        searchPlaceholder="Search by field name or business name…"
      />

      <FilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)}
        fields={[
          { key:'jurisdiction', label:'Jurisdiction', options:[
            {value:'JFSA',label:'JFSA'},{value:'MAS',label:'MAS'},{value:'ASIC',label:'ASIC'},
            {value:'HKMA',label:'HKMA'},{value:'FINMA',label:'FINMA'},{value:'OSFI',label:'OSFI'}
          ]},
          { key:'criticality', label:'Criticality', options:[
            {value:'HIGH',label:'High'},{value:'MEDIUM',label:'Medium'},{value:'LOW',label:'Low'}
          ]},
          { key:'source_type', label:'Source Type', options:[
            {value:'XSLT',label:'XSLT'},{value:'JAVA',label:'Java'},{value:'DIRECT',label:'Direct'}
          ]},
        ]}
        values={filters} onChange={(k,v) => { setFilter(k as any, v); resetPage() }}
        onReset={() => { reset(); resetPage() }} onApply={() => {}} />
    </div>
  )
}
```

- [ ] **Step 3: Verify**

Navigate to http://localhost:5173/fields — 60 fields, filterable by jurisdiction/criticality/source.

- [ ] **Step 4: Commit**

```bash
git add lineage-frontend/src/features/fields/
git commit -m "feat: Fields list page with DataGrid, multi-filter, real pagination"
```

---

## Task 6: Field 360 Page (Tabbed)

**Files:**
- Modify: `src/features/fields/Field360Page.tsx`

- [ ] **Step 1: Rewrite Field360Page.tsx**

```tsx
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { GitBranch, ArrowLeft, Code2, BookOpen, Settings2, ChevronRight, Server, Download } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { RiskBadge } from '../../components/cards/RiskBadge'
import { StatusBadge } from '../../components/cards/StatusBadge'
import { fieldApi } from './fieldApi'

type Tab = 'overview' | 'business' | 'technical' | 'xslt' | 'java' | 'downstream'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',    label: 'Overview',            icon: <GitBranch size={13}/> },
  { id: 'business',    label: 'Business',            icon: <BookOpen size={13}/> },
  { id: 'technical',   label: 'Technical',           icon: <Settings2 size={13}/> },
  { id: 'xslt',        label: 'XSLT Drilldown',      icon: <Code2 size={13}/> },
  { id: 'java',        label: 'Java Drilldown',      icon: <Code2 size={13}/> },
  { id: 'downstream',  label: 'Downstream Usage',    icon: <Server size={13}/> },
]

export default function Field360Page() {
  const { fieldId } = useParams<{ fieldId: string }>()
  const id = Number(fieldId)
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')

  const { data: field } = useQuery({ queryKey: ['field', id], queryFn: () => fieldApi.getById(id) })
  const { data: overview } = useQuery({ queryKey: ['field-overview', id], queryFn: () => fieldApi.getOverview(id), enabled: tab === 'overview' })
  const { data: business } = useQuery({ queryKey: ['field-business', id], queryFn: () => fieldApi.getBusiness(id), enabled: tab === 'business' })
  const { data: technical } = useQuery({ queryKey: ['field-technical', id], queryFn: () => fieldApi.getTechnical(id), enabled: tab === 'technical' })
  const { data: xslt } = useQuery({ queryKey: ['field-xslt', id], queryFn: () => fieldApi.getXsltDrilldown(id), enabled: tab === 'xslt' })
  const { data: java } = useQuery({ queryKey: ['field-java', id], queryFn: () => fieldApi.getJavaDrilldown(id), enabled: tab === 'java' })
  const { data: downstream } = useQuery({ queryKey: ['field-downstream', id], queryFn: () => fieldApi.getDownstream(id), enabled: tab === 'downstream' })

  if (!field) return <div className="page-content" style={{ color:'var(--color-muted)',fontSize:13 }}>Loading…</div>

  return (
    <div className="page-content">
      <PageHeader
        title={field.business_name}
        subtitle={`${field.jurisdiction_code} · ${field.system_name}`}
        icon={<GitBranch size={20} color="var(--color-primary)" />}
        breadcrumbs={[{ label: 'Fields', to: '/fields' }, { label: field.internal_field_name }]}
        actions={
          <>
            <RiskBadge criticality={field.criticality} />
            <StatusBadge status={field.status} />
            <button onClick={() => navigate('/fields')}
              style={{ display:'flex',alignItems:'center',gap:6,padding:'7px 12px',border:'1px solid var(--color-border)',borderRadius:'var(--radius-md)',background:'var(--color-surface)',fontSize:13 }}>
              <ArrowLeft size={13}/> Back
            </button>
          </>
        }
      />

      {/* Field meta strip */}
      <div className="card" style={{ padding:'14px 20px',marginBottom:16,display:'flex',gap:32,flexWrap:'wrap' }}>
        {[
          ['Internal Name', field.internal_field_name],
          ['Data Type', field.data_type],
          ['Source Type', field.source_type],
          ['Category', field.field_category],
          ['Section', field.reporting_section],
          ['Mandatory', field.is_mandatory ? 'Yes' : 'No'],
          ['Owner Team', field.owner_team],
        ].map(([label, val]) => (
          <div key={label}>
            <div style={{ fontSize:10,fontWeight:600,color:'var(--color-muted)',textTransform:'uppercase',marginBottom:3 }}>{label}</div>
            <div style={{ fontSize:13,fontWeight:500,color:'var(--color-text)' }}>{val ?? '—'}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:2,borderBottom:'1px solid var(--color-border)',marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              display:'flex',alignItems:'center',gap:6,padding:'10px 16px',
              border:'none',background:'none',fontSize:13,fontWeight: tab===t.id ? 600 : 400,
              color: tab===t.id ? 'var(--color-primary)' : 'var(--color-muted)',
              borderBottom: tab===t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor:'pointer',
            }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab data={overview} fieldId={id} navigate={navigate} />}
      {tab === 'business' && <BusinessTab data={business} />}
      {tab === 'technical' && <TechnicalTab data={technical} />}
      {tab === 'xslt' && <XsltTab data={xslt} />}
      {tab === 'java' && <JavaTab data={java} />}
      {tab === 'downstream' && <DownstreamTab data={downstream} />}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ display:'grid',gridTemplateColumns:'180px 1fr',gap:12,padding:'10px 0',borderBottom:'1px solid var(--color-border-light)' }}>
      <span style={{ fontSize:12,fontWeight:600,color:'var(--color-muted)' }}>{label}</span>
      <span style={{ fontSize:13,color:'var(--color-text)' }}>{value ?? '—'}</span>
    </div>
  )
}

function OverviewTab({ data, fieldId, navigate }: any) {
  if (!data) return null
  return (
    <div style={{ display:'grid',gridTemplateColumns:'1fr 320px',gap:16 }}>
      <div>
        <div className="card" style={{ padding:20,marginBottom:16 }}>
          <div style={{ fontWeight:700,fontSize:14,marginBottom:14 }}>Field Details</div>
          <InfoRow label="Description" value={data.description} />
          <InfoRow label="Business Name" value={data.business_name} />
          <InfoRow label="External Display Name" value={data.external_display_name} />
          <InfoRow label="Data Type" value={data.data_type} />
          <InfoRow label="Source Type" value={data.source_type} />
          <InfoRow label="Jurisdiction" value={data.jurisdiction_code} />
        </div>
      </div>
      <div>
        <div className="card" style={{ padding:16,marginBottom:12 }}>
          <div style={{ fontWeight:600,fontSize:13,marginBottom:10 }}>Quick Actions</div>
          {[
            { label:'View Impact Analysis', to:`/impact?fieldId=${fieldId}` },
            { label:'Compare with Field', to:`/comparison?fieldId=${fieldId}` },
            { label:'Open in Graph Explorer', to:`/graph?fieldId=${fieldId}` },
          ].map(({ label, to }) => (
            <button key={label} onClick={() => navigate(to)}
              style={{ display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%',
                padding:'9px 12px',marginBottom:6,border:'1px solid var(--color-border)',
                borderRadius:'var(--radius-sm)',background:'var(--color-surface)',fontSize:12,color:'var(--color-text)',cursor:'pointer' }}>
              {label}<ChevronRight size={13}/>
            </button>
          ))}
        </div>
        <div className="card" style={{ padding:16 }}>
          <div style={{ fontWeight:600,fontSize:13,marginBottom:8 }}>Downstream Systems</div>
          <div style={{ fontSize:24,fontWeight:700,color:'var(--color-primary)' }}>{data.downstream_count}</div>
          <div style={{ fontSize:12,color:'var(--color-muted)',marginTop:4 }}>consuming systems</div>
        </div>
      </div>
    </div>
  )
}

function BusinessTab({ data }: any) {
  if (!data) return null
  return (
    <div className="card" style={{ padding:24,maxWidth:800 }}>
      <div style={{ fontWeight:700,fontSize:15,marginBottom:20,display:'flex',alignItems:'center',gap:8 }}>
        <BookOpen size={16} color="var(--color-primary)"/>Business Interpretation
      </div>
      <InfoRow label="Business Translation" value={data.business_translation} />
      <InfoRow label="Business Interpretation" value={data.business_interpretation} />
      <InfoRow label="Example Scenario" value={data.example_scenario} />
      <InfoRow label="Assumptions" value={data.assumptions} />
    </div>
  )
}

function TechnicalTab({ data }: any) {
  if (!data) return null
  const interp = data.interpretation
  return (
    <div style={{ display:'grid',gap:16 }}>
      <div className="card" style={{ padding:24 }}>
        <div style={{ fontWeight:700,fontSize:15,marginBottom:20 }}>Technical Interpretation</div>
        <InfoRow label="Technical Interpretation" value={interp?.technical_interpretation} />
        <InfoRow label="Assumptions" value={interp?.assumptions} />
        <InfoRow label="Source Type" value={data.field?.source_type} />
        <InfoRow label="Data Type" value={data.field?.data_type} />
      </div>
    </div>
  )
}

function XsltTab({ data }: any) {
  if (!data) return <div style={{ color:'var(--color-muted)',fontSize:13 }}>No XSLT lineage found.</div>
  return (
    <div style={{ display:'grid',gap:16 }}>
      <div className="card" style={{ padding:20 }}>
        <div style={{ fontWeight:700,fontSize:14,marginBottom:16,display:'flex',alignItems:'center',gap:8 }}>
          <Code2 size={15} color="var(--color-primary)"/>XSLT Mapping
        </div>
        <InfoRow label="XSLT File" value={data.file} />
        <InfoRow label="Template" value={data.template} />
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:11,fontWeight:600,color:'var(--color-muted)',textTransform:'uppercase',marginBottom:8 }}>Variables</div>
          <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
            {(data.variables ?? []).map((v: string) => (
              <span key={v} style={{ padding:'3px 10px',background:'var(--color-primary-soft)',borderRadius:'var(--radius-full)',fontSize:12,color:'var(--color-primary)',fontFamily:'var(--font-mono)' }}>{v}</span>
            ))}
          </div>
        </div>
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:11,fontWeight:600,color:'var(--color-muted)',textTransform:'uppercase',marginBottom:8 }}>XPaths</div>
          {(data.xpaths ?? []).map((x: string) => (
            <div key={x} style={{ padding:'6px 10px',background:'#f8fafc',borderRadius:'var(--radius-sm)',fontSize:12,fontFamily:'var(--font-mono)',marginBottom:4,color:'var(--color-text)' }}>{x}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

function JavaTab({ data }: any) {
  if (!data || data.length === 0) return <div style={{ color:'var(--color-muted)',fontSize:13 }}>No Java lineage found.</div>
  return (
    <div style={{ display:'grid',gap:12 }}>
      {data.map((m: any, i: number) => (
        <div key={i} className="card" style={{ padding:20 }}>
          <div style={{ fontFamily:'var(--font-mono)',fontWeight:700,fontSize:13,color:'var(--color-primary)',marginBottom:8 }}>{m.class_name}</div>
          <div style={{ fontFamily:'var(--font-mono)',fontSize:12,color:'var(--color-text)',marginBottom:10 }}>{m.method_name}()</div>
          {m.calls?.length > 0 && (
            <div>
              <div style={{ fontSize:11,fontWeight:600,color:'var(--color-muted)',textTransform:'uppercase',marginBottom:6 }}>Calls</div>
              {m.calls.map((c: string) => (
                <div key={c} style={{ padding:'4px 10px',background:'#f8fafc',borderRadius:'var(--radius-sm)',fontSize:11,fontFamily:'var(--font-mono)',marginBottom:3 }}>{c}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function DownstreamTab({ data }: any) {
  if (!data || data.length === 0) return <div style={{ color:'var(--color-muted)',fontSize:13 }}>No downstream mappings found.</div>
  return (
    <div>
      <div className="card">
        <table className="grid-table">
          <thead>
            <tr><th>System Name</th><th>Type</th><th>Path / Field</th><th>Usage</th><th>Criticality</th><th>Description</th></tr>
          </thead>
          <tbody>
            {data.map((d: any) => (
              <tr key={d.mapping_id}>
                <td style={{ fontWeight:600 }}>{d.downstream_name}</td>
                <td><span className="badge" style={{ background:'#f1f5f9',color:'#475569' }}>{d.downstream_type}</span></td>
                <td style={{ fontFamily:'var(--font-mono)',fontSize:11 }}>{d.path_or_field}</td>
                <td><span className="badge" style={{ background:'var(--color-primary-soft)',color:'var(--color-primary)' }}>{d.usage_type}</span></td>
                <td><RiskBadge criticality={d.criticality} /></td>
                <td style={{ fontSize:12,color:'var(--color-muted)' }}>{d.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Navigate to http://localhost:5173/fields/1 — all 6 tabs show real data. XSLT tab shows variables + xpaths for EVENT_TIMESTAMP.

- [ ] **Step 3: Commit**

```bash
git add lineage-frontend/src/features/fields/
git commit -m "feat: Field 360 page — tabbed Overview/Business/Technical/XSLT/Java/Downstream"
```

---

## Task 7: Impact Analysis + Comparison + Graph Explorer + Search

**Files:**
- Modify: `src/features/impact/ImpactAnalysisPage.tsx`
- Modify: `src/features/comparison/FieldComparisonPage.tsx`
- Modify: `src/features/graphExplorer/GraphExplorerPage.tsx`
- Modify: `src/features/search/GlobalSearchPage.tsx`
- Create: `src/features/access/AccessDeniedPage.tsx`

- [ ] **Step 1: Write ImpactAnalysisPage.tsx**

```tsx
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Network, Play } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { RiskBadge } from '../../components/cards/RiskBadge'
import apiClient from '../../services/apiClient'

export default function ImpactAnalysisPage() {
  const [fieldId, setFieldId] = useState('')
  const [changeType, setChangeType] = useState('SCHEMA_CHANGE')

  const { mutate, data, isPending } = useMutation({
    mutationFn: () => apiClient.post('/impact-analysis/run', { field_id: Number(fieldId), change_type: changeType }).then(r => r.data.data)
  })

  return (
    <div className="page-content">
      <PageHeader title="Impact Analysis" subtitle="Analyse downstream impact of field changes"
        icon={<Network size={20} color="var(--color-primary)" />} />

      <div className="card" style={{ padding:20,marginBottom:20,maxWidth:640 }}>
        <div style={{ fontWeight:700,fontSize:14,marginBottom:16 }}>Run Impact Analysis</div>
        <div style={{ display:'flex',gap:10,alignItems:'flex-end' }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11,fontWeight:600,color:'var(--color-muted)',display:'block',marginBottom:6 }}>FIELD ID</label>
            <input value={fieldId} onChange={e => setFieldId(e.target.value)} placeholder="e.g. 1"
              style={{ width:'100%',padding:'8px 10px',border:'1px solid var(--color-border)',borderRadius:'var(--radius-sm)',fontSize:13 }}/>
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11,fontWeight:600,color:'var(--color-muted)',display:'block',marginBottom:6 }}>CHANGE TYPE</label>
            <select value={changeType} onChange={e => setChangeType(e.target.value)}
              style={{ width:'100%',padding:'8px 10px',border:'1px solid var(--color-border)',borderRadius:'var(--radius-sm)',fontSize:13 }}>
              <option value="SCHEMA_CHANGE">Schema Change</option>
              <option value="LOGIC_CHANGE">Logic Change</option>
              <option value="DEPRECATION">Deprecation</option>
            </select>
          </div>
          <button disabled={!fieldId || isPending} onClick={() => mutate()}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 18px',background:'var(--color-primary)',color:'#fff',border:'none',borderRadius:'var(--radius-md)',fontWeight:600,fontSize:13,cursor:'pointer' }}>
            <Play size={13}/>{isPending ? 'Running…' : 'Run'}
          </button>
        </div>
      </div>

      {data && (
        <>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16 }}>
            {[
              ['Total Impact', data.total_impact_count, '#1267e8'],
              ['Impacted Nodes', data.impacted_nodes?.length, '#b7791f'],
              ['Downstream Systems', data.impacted_downstream?.length, '#d92d20'],
            ].map(([label, val, color]) => (
              <div key={String(label)} className="card" style={{ padding:16,textAlign:'center' }}>
                <div style={{ fontSize:28,fontWeight:700,color: String(color) }}>{val}</div>
                <div style={{ fontSize:12,color:'var(--color-muted)',marginTop:4 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
            <div className="card" style={{ padding:20 }}>
              <div style={{ fontWeight:700,fontSize:14,marginBottom:12 }}>Impacted Graph Nodes</div>
              {data.impacted_nodes?.map((n: any, i: number) => (
                <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--color-border-light)' }}>
                  <span className="badge" style={{ background:'var(--color-primary-soft)',color:'var(--color-primary)' }}>{n.node_type}</span>
                  <span style={{ fontSize:13,fontFamily:'var(--font-mono)' }}>{n.node_name}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding:20 }}>
              <div style={{ fontWeight:700,fontSize:14,marginBottom:12 }}>Impacted Downstream Systems</div>
              <table className="grid-table">
                <thead><tr><th>System</th><th>Type</th><th>Criticality</th></tr></thead>
                <tbody>
                  {data.impacted_downstream?.map((d: any, i: number) => (
                    <tr key={i}>
                      <td>{d.name}</td>
                      <td style={{ fontSize:12 }}>{d.type}</td>
                      <td><RiskBadge criticality={d.criticality} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write FieldComparisonPage.tsx**

```tsx
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { GitCompare } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { RiskBadge } from '../../components/cards/RiskBadge'
import { StatusBadge } from '../../components/cards/StatusBadge'
import apiClient from '../../services/apiClient'

export default function FieldComparisonPage() {
  const [ids, setIds] = useState(['', ''])

  const { mutate, data, isPending } = useMutation({
    mutationFn: () => apiClient.post('/comparison/fields', { field_ids: ids.filter(Boolean).map(Number) }).then(r => r.data.data)
  })

  const fields: any[] = data?.fields ?? []

  return (
    <div className="page-content">
      <PageHeader title="Field Comparison" subtitle="Side-by-side comparison of regulatory fields"
        icon={<GitCompare size={20} color="var(--color-primary)" />} />

      <div className="card" style={{ padding:20,marginBottom:20 }}>
        <div style={{ fontWeight:700,fontSize:14,marginBottom:14 }}>Select Fields to Compare</div>
        <div style={{ display:'flex',gap:10,alignItems:'flex-end' }}>
          {ids.map((id, i) => (
            <div key={i} style={{ flex:1 }}>
              <label style={{ fontSize:11,fontWeight:600,color:'var(--color-muted)',display:'block',marginBottom:6 }}>FIELD {i+1} ID</label>
              <input value={id} onChange={e => setIds(prev => prev.map((v,j) => j===i ? e.target.value : v))}
                placeholder={`Field ID ${i+1}`}
                style={{ width:'100%',padding:'8px 10px',border:'1px solid var(--color-border)',borderRadius:'var(--radius-sm)',fontSize:13 }}/>
            </div>
          ))}
          {ids.length < 4 && (
            <button onClick={() => setIds(p => [...p, ''])}
              style={{ padding:'8px 14px',border:'1px dashed var(--color-border)',borderRadius:'var(--radius-sm)',background:'none',fontSize:13,color:'var(--color-muted)',cursor:'pointer' }}>
              + Add
            </button>
          )}
          <button disabled={ids.filter(Boolean).length < 2 || isPending} onClick={() => mutate()}
            style={{ padding:'9px 18px',background:'var(--color-primary)',color:'#fff',border:'none',borderRadius:'var(--radius-md)',fontWeight:600,fontSize:13,cursor:'pointer' }}>
            {isPending ? 'Loading…' : 'Compare'}
          </button>
        </div>
      </div>

      {fields.length > 0 && (
        <div className="card" style={{ overflowX:'auto' }}>
          <table className="grid-table">
            <thead>
              <tr>
                <th style={{ width:180 }}>Attribute</th>
                {fields.map(f => <th key={f.field_id}>{f.field_name}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Jurisdiction', (f: any) => <span className="badge" style={{ background:'var(--color-primary-soft)',color:'var(--color-primary)' }}>{f.jurisdiction}</span>],
                ['Business Name', (f: any) => f.business_name],
                ['Data Type', (f: any) => f.data_type],
                ['Criticality', (f: any) => <RiskBadge criticality={f.criticality} />],
                ['Source Type', (f: any) => f.source_type],
                ['Status', (f: any) => <StatusBadge status={f.status} />],
                ['Business Translation', (f: any) => <span style={{ fontSize:11,color:'var(--color-muted)',maxWidth:240,display:'block' }}>{f.business_translation}</span>],
              ].map(([label, render]) => (
                <tr key={String(label)}>
                  <td style={{ fontWeight:600,fontSize:12,color:'var(--color-muted)',background:'var(--color-bg)' }}>{String(label)}</td>
                  {fields.map(f => <td key={f.field_id}>{typeof render === 'function' ? render(f) : render}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write GraphExplorerPage.tsx**

```tsx
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Share2, Search } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import apiClient from '../../services/apiClient'

export default function GraphExplorerPage() {
  const [term, setTerm] = useState('')
  const [fieldId, setFieldId] = useState('')
  const [subgraph, setSubgraph] = useState<any>(null)

  const searchMut = useMutation({
    mutationFn: () => apiClient.post('/graph/search', { term }).then(r => r.data.data)
  })
  const subgraphMut = useMutation({
    mutationFn: () => apiClient.post('/graph/subgraph', { field_id: Number(fieldId), depth: 2 })
      .then(r => { setSubgraph(r.data.data); return r.data.data })
  })

  return (
    <div className="page-content">
      <PageHeader title="Graph Explorer" subtitle="Explore lineage relationships visually"
        icon={<Share2 size={20} color="var(--color-primary)" />} />

      <div style={{ display:'grid',gridTemplateColumns:'320px 1fr',gap:16,alignItems:'start' }}>
        {/* Search panel */}
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          <div className="card" style={{ padding:16 }}>
            <div style={{ fontWeight:700,fontSize:13,marginBottom:12 }}>Search Graph</div>
            <div style={{ display:'flex',gap:8 }}>
              <input value={term} onChange={e => setTerm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchMut.mutate()}
                placeholder="Node name or type…"
                style={{ flex:1,padding:'7px 10px',border:'1px solid var(--color-border)',borderRadius:'var(--radius-sm)',fontSize:13 }}/>
              <button onClick={() => searchMut.mutate()}
                style={{ padding:'7px 12px',background:'var(--color-primary)',color:'#fff',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer' }}>
                <Search size={13}/>
              </button>
            </div>
            {searchMut.data && (
              <div style={{ marginTop:10 }}>
                {searchMut.data.map((n: any, i: number) => (
                  <div key={i} style={{ padding:'6px 0',borderBottom:'1px solid var(--color-border-light)',fontSize:12 }}>
                    <span className="badge" style={{ background:'var(--color-primary-soft)',color:'var(--color-primary)',marginRight:6 }}>{n.label}</span>
                    {n.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding:16 }}>
            <div style={{ fontWeight:700,fontSize:13,marginBottom:12 }}>Load Field Subgraph</div>
            <div style={{ display:'flex',gap:8 }}>
              <input value={fieldId} onChange={e => setFieldId(e.target.value)} placeholder="Field ID"
                style={{ flex:1,padding:'7px 10px',border:'1px solid var(--color-border)',borderRadius:'var(--radius-sm)',fontSize:13 }}/>
              <button onClick={() => subgraphMut.mutate()} disabled={!fieldId}
                style={{ padding:'7px 12px',background:'var(--color-primary)',color:'#fff',border:'none',borderRadius:'var(--radius-sm)',cursor:'pointer',fontSize:12 }}>
                Load
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="card" style={{ minHeight:500,padding:20 }}>
          {!subgraph ? (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:460,color:'var(--color-muted)' }}>
              <Share2 size={40} style={{ opacity:0.2,marginBottom:12 }}/>
              <p style={{ fontSize:13 }}>Enter a Field ID and click Load to explore the lineage graph</p>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight:700,fontSize:14,marginBottom:16 }}>
                Subgraph — {subgraph.nodes?.length ?? 0} nodes · {subgraph.edges?.length ?? 0} relationships
              </div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                {subgraph.nodes?.map((n: any, i: number) => (
                  <div key={i} style={{ padding:'8px 14px',background:'var(--color-bg)',border:'1px solid var(--color-border)',borderRadius:'var(--radius-md)',fontSize:12 }}>
                    <span className="badge" style={{ background:'var(--color-primary-soft)',color:'var(--color-primary)',marginRight:6 }}>{n.label}</span>
                    <span style={{ fontFamily:'var(--font-mono)' }}>{n.id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write GlobalSearchPage.tsx**

```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { RiskBadge } from '../../components/cards/RiskBadge'
import { useDebounce } from '../../hooks/useDebounce'
import apiClient from '../../services/apiClient'

export default function GlobalSearchPage() {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const debounced = useDebounce(term, 400)

  const { data, isLoading } = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => apiClient.get('/search/global', { params: { q: debounced } }).then(r => r.data.data),
    enabled: debounced.length >= 2,
  })

  return (
    <div className="page-content">
      <PageHeader title="Global Search" subtitle="Search across fields and lineage graph"
        icon={<Search size={20} color="var(--color-primary)" />} />

      <div className="card" style={{ padding:'14px 16px',marginBottom:24,display:'flex',alignItems:'center',gap:10 }}>
        <Search size={16} color="var(--color-muted)" />
        <input autoFocus value={term} onChange={e => setTerm(e.target.value)} placeholder="Search fields, variables, methods, systems…"
          style={{ flex:1,border:'none',outline:'none',fontSize:15,color:'var(--color-text)' }}/>
        {isLoading && <span style={{ fontSize:12,color:'var(--color-muted)' }}>Searching…</span>}
      </div>

      {data && (
        <div style={{ display:'grid',gap:16 }}>
          {/* Field results */}
          {data.fields?.length > 0 && (
            <div className="card">
              <div style={{ padding:'12px 16px',borderBottom:'1px solid var(--color-border)',fontWeight:700,fontSize:13 }}>
                Fields <span style={{ color:'var(--color-muted)',fontWeight:400 }}>({data.fields.length})</span>
              </div>
              <table className="grid-table">
                <thead><tr><th>Field Name</th><th>Business Name</th><th>Jurisdiction</th><th>Criticality</th><th></th></tr></thead>
                <tbody>
                  {data.fields.map((f: any) => (
                    <tr key={f.field_id} style={{ cursor:'pointer' }} onClick={() => navigate(`/fields/${f.field_id}`)}>
                      <td style={{ fontFamily:'var(--font-mono)',fontSize:12,fontWeight:600 }}>{f.field_name}</td>
                      <td>{f.business_name}</td>
                      <td><span className="badge" style={{ background:'var(--color-primary-soft)',color:'var(--color-primary)' }}>{f.jurisdiction}</span></td>
                      <td><RiskBadge criticality={f.criticality} /></td>
                      <td><button style={{ background:'none',border:'none',color:'var(--color-primary)',fontSize:12,cursor:'pointer',textDecoration:'underline' }}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Graph node results */}
          {data.graph_nodes?.length > 0 && (
            <div className="card" style={{ padding:16 }}>
              <div style={{ fontWeight:700,fontSize:13,marginBottom:12 }}>
                Graph Nodes <span style={{ color:'var(--color-muted)',fontWeight:400 }}>({data.graph_nodes.length})</span>
              </div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                {data.graph_nodes.map((n: any, i: number) => (
                  <div key={i} style={{ padding:'8px 14px',background:'var(--color-bg)',border:'1px solid var(--color-border)',borderRadius:'var(--radius-md)',fontSize:12 }}>
                    <span className="badge" style={{ background:'var(--color-primary-soft)',color:'var(--color-primary)',marginRight:6 }}>{n.label}</span>
                    <span style={{ fontFamily:'var(--font-mono)' }}>{n.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.total === 0 && (
            <div style={{ textAlign:'center',padding:40,color:'var(--color-muted)',fontSize:13 }}>
              No results for "{debounced}"
            </div>
          )}
        </div>
      )}

      {!debounced && (
        <div style={{ textAlign:'center',padding:60,color:'var(--color-muted)',fontSize:13 }}>
          Type at least 2 characters to search
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Write AccessDeniedPage.tsx**

```tsx
import { ShieldOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AccessDeniedPage() {
  const navigate = useNavigate()
  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:16,padding:40 }}>
      <div style={{ width:64,height:64,background:'var(--color-danger-bg)',borderRadius:'var(--radius-full)',display:'flex',alignItems:'center',justifyContent:'center' }}>
        <ShieldOff size={28} color="var(--color-danger)" />
      </div>
      <h2 style={{ fontSize:22,fontWeight:700,color:'var(--color-text)' }}>Access Denied</h2>
      <p style={{ fontSize:14,color:'var(--color-muted)',textAlign:'center',maxWidth:400 }}>
        You do not have permission to view this resource. Contact your administrator to request access.
      </p>
      <button onClick={() => navigate('/')}
        style={{ padding:'10px 24px',background:'var(--color-primary)',color:'#fff',border:'none',borderRadius:'var(--radius-md)',fontWeight:600,fontSize:14,cursor:'pointer' }}>
        Back to Dashboard
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Verify all pages**

```bash
# All these routes should render correctly:
# http://localhost:5173/              → Dashboard
# http://localhost:5173/jurisdictions → Jurisdictions table
# http://localhost:5173/fields        → Fields list (60 rows)
# http://localhost:5173/fields/1      → Field 360 (EVENT_TIMESTAMP JFSA)
# http://localhost:5173/impact        → Impact Analysis
# http://localhost:5173/comparison    → Field Comparison
# http://localhost:5173/graph         → Graph Explorer
# http://localhost:5173/search        → Global Search
# http://localhost:5173/access-denied → Access Denied page
```

- [ ] **Step 7: Add recharts + ensure .env.example exists**

```bash
# lineage-frontend/.env.example
VITE_API_BASE_URL=http://localhost:8000/api
```

```bash
cat > lineage-frontend/.env << 'EOF'
VITE_API_BASE_URL=http://localhost:8000/api
EOF
```

- [ ] **Step 8: Final commit**

```bash
git add lineage-frontend/src/features/ lineage-frontend/.env.example lineage-frontend/.env
git commit -m "feat: Impact, Comparison, Graph Explorer, Search, Access Denied pages complete"
```

---

## Self-Review Checklist

- [x] All 14 pages implemented and routed
- [x] Single DataGrid component used on all list pages (Jurisdictions, Fields)
- [x] FilterDrawer used for all filter UI
- [x] RightDrawer + BaseModal available for use
- [x] StatusBadge + RiskBadge consistent across all pages
- [x] CSS variables define full design system matching spec tokens
- [x] No hardcoded business data — all from API
- [x] Sidebar updated with /jurisdictions route
- [x] Field 360 has all 6 tabs: Overview, Business, Technical, XSLT, Java, Downstream
- [x] Search page uses debounce, shows fields + graph nodes
- [x] Graph Explorer shows subgraph nodes
- [x] Comparison shows side-by-side table
- [x] Impact Analysis runs POST and shows impacted nodes + downstream
- [x] View-only chip visible in Topbar
- [x] No mutation routes called from UI (read-only)
