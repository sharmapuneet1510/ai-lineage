import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './app/queryClient'
import { AppLayout } from './components/layout/AppLayout'
import DashboardPage from './features/dashboard/DashboardPage'
import FieldListPage from './features/fields/FieldListPage'
import Field360Page from './features/fields/Field360Page'
import FieldComparisonPage from './features/comparison/FieldComparisonPage'
import ImpactAnalysisPage from './features/impact/ImpactAnalysisPage'
import GraphExplorerPage from './features/graphExplorer/GraphExplorerPage'
import GlobalSearchPage from './features/search/GlobalSearchPage'
import SettingsPage from './features/settings/SettingsPage'
import InvestigationWorkspace from './investigation/InvestigationWorkspace'
import './styles/global.css'
import './styles/components.css'

/** Pages that live inside the standard app shell (sidebar + header). */
function ShellRoutes() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/fields" element={<FieldListPage />} />
        <Route path="/fields/:fieldId" element={<Field360Page />} />
        <Route path="/comparison" element={<FieldComparisonPage />} />
        <Route path="/impact" element={<ImpactAnalysisPage />} />
        <Route path="/graph" element={<GraphExplorerPage />} />
        <Route path="/search" element={<GlobalSearchPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppLayout>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Premium investigation workspace — full-bleed, owns its own chrome */}
          <Route path="/investigate" element={<InvestigationWorkspace />} />
          <Route path="/investigate/:fieldId" element={<InvestigationWorkspace />} />
          {/* Everything else renders inside the standard app shell */}
          <Route path="*" element={<ShellRoutes />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
