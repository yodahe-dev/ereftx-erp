'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StockAnalyticsDashboard } from '@/components/dashboard/StockAnalyticsDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchInterval: 30000,
      retry: 1,
    },
  },
});


export default function StocksPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <StockAnalyticsDashboard />
    </QueryClientProvider>
  );
}