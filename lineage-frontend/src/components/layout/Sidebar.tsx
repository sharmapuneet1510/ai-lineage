import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Database, GitBranch, BarChart2,
  Share2, GitCompare, Settings, Network,
} from 'lucide-react'
import '../../styles/layout.css'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/fields', label: 'Fields', Icon: Database },
  { to: '/fields/1', label: 'Lineage Explorer', Icon: GitBranch },
  { to: '/graph', label: 'Graph Explorer', Icon: Share2 },
  { to: '/comparison', label: 'Comparison', Icon: GitCompare },
  { to: '/impact', label: 'Impact Analysis', Icon: Network },
  { to: '/search', label: 'Global Search', Icon: BarChart2 },
]

const BOTTOM_ITEMS = [
  { to: '/settings', label: 'Settings', Icon: Settings },
]

export function Sidebar() {
  const location = useLocation()

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/'
    if (to === '/fields') return location.pathname === '/fields'
    if (to.startsWith('/fields/')) return location.pathname.startsWith(to)
    return location.pathname.startsWith(to)
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <GitBranch size={16} color="#fff" />
        </div>
        <div>
          <div className="sidebar-logo-text">Data Lineage</div>
          <div className="sidebar-logo-sub">Platform v1.0</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={`sidebar-item${isActive(to) ? ' active' : ''}`}
            aria-current={isActive(to) ? 'page' : undefined}
          >
            <Icon size={16} className="sidebar-item-icon" />
            {label}
          </NavLink>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: 16 }}>System</div>
        {BOTTOM_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={`sidebar-item${isActive(to) ? ' active' : ''}`}
            aria-current={isActive(to) ? 'page' : undefined}
          >
            <Icon size={16} className="sidebar-item-icon" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-avatar">PS</div>
        <div>
          <div className="sidebar-user-name">Puneet Sharma</div>
          <div className="sidebar-user-role">LINEAGE_ADMIN</div>
        </div>
      </div>
    </aside>
  )
}
