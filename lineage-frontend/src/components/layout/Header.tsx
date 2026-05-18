import { useLocation } from 'react-router-dom'
import { Bell, Search, HelpCircle } from 'lucide-react'

const ROUTE_LABELS: Record<string, string[]> = {
  '/': ['Home', 'Dashboard'],
  '/fields': ['Home', 'Fields'],
  '/comparison': ['Home', 'Comparison'],
  '/impact': ['Home', 'Impact Analysis'],
  '/graph': ['Home', 'Graph Explorer'],
  '/search': ['Home', 'Global Search'],
}

export function Header() {
  const location = useLocation()
  const crumbs = ROUTE_LABELS[location.pathname] ??
    (location.pathname.startsWith('/fields/') ? ['Home', 'Fields', 'Field 360'] : ['Home'])

  return (
    <header className="app-header">
      <div className="header-breadcrumb">
        {crumbs.map((crumb, i) => (
          <span key={i} className="header-breadcrumb-item">
            {i > 0 && <span className="header-breadcrumb-sep">/</span>}
            <span className={i === crumbs.length - 1 ? 'header-breadcrumb-current' : ''}>
              {crumb}
            </span>
          </span>
        ))}
      </div>
      <div className="header-actions">
        <button className="header-icon-btn" title="Search">
          <Search size={16} />
        </button>
        <button className="header-icon-btn" title="Help">
          <HelpCircle size={16} />
        </button>
        <button className="header-icon-btn" title="Notifications">
          <Bell size={16} />
        </button>
      </div>
    </header>
  )
}
