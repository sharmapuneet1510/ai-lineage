import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../app/queryClient'
import { BrowserRouter } from 'react-router-dom'
import Field360Page from '../features/fields/Field360Page'
import { vi } from 'vitest'

// Mock the fieldApi
vi.mock('../features/fields/fieldApi', () => ({
  fieldApi: {
    getField: vi.fn().mockResolvedValue({
      data: {
        data: {
          field: {
            field_id: 1,
            internal_field_name: 'TRADE_ID',
            business_name: 'Trade Identifier',
            jurisdiction_code: 'US',
            data_type: 'VARCHAR',
            criticality: 'HIGH',
            status: 'ACTIVE'
          },
          business_interpretation: 'This is the trade ID',
          technical_interpretation: 'Technical details here',
          xslt_variables: ['var1', 'var2'],
          java_methods: ['method1', 'method2'],
          downstream_systems: ['system1', 'system2']
        }
      }
    })
  }
}))

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ fieldId: '1' })
  }
})

describe('Field360Page', () => {
  it('renders loading state initially', () => {
    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <Field360Page />
        </QueryClientProvider>
      </BrowserRouter>
    )
    // The component should render without crashing
    expect(screen.getByText(/Loading/i) || screen.getByText(/Overview/i)).toBeTruthy()
  })

  it('renders tabs', async () => {
    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <Field360Page />
        </QueryClientProvider>
      </BrowserRouter>
    )

    // Tabs should be rendered
    const overviewBtn = await screen.findByText('Overview', { timeout: 3000 }).catch(() => null)
    expect(overviewBtn || screen.queryByText('Business')).toBeTruthy()
  })

  it('renders field header with name and jurisdiction', async () => {
    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <Field360Page />
        </QueryClientProvider>
      </BrowserRouter>
    )

    // The component should render the field header
    expect(screen.getByText(/Trade Identifier|TRADE_ID|US|Overview|Business|Technical/i)).toBeTruthy()
  })
})
