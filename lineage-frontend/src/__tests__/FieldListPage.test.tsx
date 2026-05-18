import { render, screen } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../app/queryClient'
import FieldListPage from '../features/fields/FieldListPage'

describe('FieldListPage', () => {
  it('renders field list page', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <FieldListPage />
      </QueryClientProvider>
    )
    expect(screen.getByText('Fields')).toBeInTheDocument()
  })
})
