import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './app/queryClient'
import DashboardPage from './features/dashboard/DashboardPage'
import FieldListPage from './features/fields/FieldListPage'
import Field360Page from './features/fields/Field360Page'
import FieldComparisonPage from './features/comparison/FieldComparisonPage'
import ImpactAnalysisPage from './features/impact/ImpactAnalysisPage'
import './App.css'
import './styles/dashboard.css'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="app">
          <nav>
            <Link to="/">Dashboard</Link>
            <Link to="/fields">Fields</Link>
            <Link to="/comparison">Comparison</Link>
            <Link to="/impact">Impact</Link>
          </nav>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/fields" element={<FieldListPage />} />
            <Route path="/fields/:fieldId" element={<Field360Page />} />
            <Route path="/comparison" element={<FieldComparisonPage />} />
            <Route path="/impact" element={<ImpactAnalysisPage />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App
