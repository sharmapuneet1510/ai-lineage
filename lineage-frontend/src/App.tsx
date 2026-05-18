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
import './styles/global.css'
import './styles/components.css'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/fields" element={<FieldListPage />} />
            <Route path="/fields/:fieldId" element={<Field360Page />} />
            <Route path="/comparison" element={<FieldComparisonPage />} />
            <Route path="/impact" element={<ImpactAnalysisPage />} />
            <Route path="/graph" element={<GraphExplorerPage />} />
            <Route path="/search" element={<GlobalSearchPage />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
