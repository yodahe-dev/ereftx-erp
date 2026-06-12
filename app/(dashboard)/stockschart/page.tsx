// (dashboard)/stockschart/page.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StockAnalyticsDashboard } from '@/components/dashboard/StockAnalyticsDashboard';



export default function StocksPage() {
  return (
      <StockAnalyticsDashboard />
  );
}