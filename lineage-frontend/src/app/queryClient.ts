import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes - data is fresh for 5 mins
      gcTime: 1000 * 60 * 10,        // 10 minutes - cache persists for 10 mins
      retry: 1,                       // Retry failed requests once
      retryDelay: 1000,              // Wait 1 second before retry
    },
    mutations: {
      retry: 0,                       // Don't retry mutations
    },
  },
})
