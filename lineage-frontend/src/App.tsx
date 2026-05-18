import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './app/queryClient'
import './App.css'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="app">
          <h1>Lineage Platform</h1>
          <p>Coming soon...</p>
          <Routes>
            {/* Routes will be added here */}
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App
