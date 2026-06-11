'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package2, BarChart3, RefreshCw, LineChart, AreaChart, PieChart } from 'lucide-react';
import { toast } from 'sonner';
import { ReusableChart } from '@/components/charts/ReusableChart';

// ==================== TYPES ====================
interface ProductFrequency {
  productId: string;
  productName: string;
  value: number;
}

interface CategoryFrequency {
  categoryId: string;
  categoryName: string;
  products: ProductFrequency[];
}

interface ProductQuantity {
  productId: string;
  productName: string;
  totalBoxesRestocked: number;
  totalSinglesRestocked: number;
}

interface CategoryQuantity {
  categoryId: string;
  categoryName: string;
  products: ProductQuantity[];
}

type ChartType = 'bar' | 'line' | 'area' | 'stacked' | 'pie';

// ==================== KPI CARD ====================
function KpiCard({ label, value, prefix = '', suffix = '', color = '#3B82F6' }: { 
  label: string; 
  value: number; 
  prefix?: string; 
  suffix?: string; 
  color?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1000;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300" />
      <div className="relative backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-4 hover:border-white/20 transition-all duration-300 hover:shadow-2xl">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{label}</p>
        <p className="text-2xl font-bold" style={{ color }}>
          {prefix}{count.toLocaleString()}{suffix}
        </p>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ color }} />
      </div>
    </motion.div>
  );
}

// ==================== MAIN DASHBOARD ====================
export function StockAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'frequency' | 'quantity'>('frequency');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [frequencyData, setFrequencyData] = useState<CategoryFrequency[]>([]);
  const [quantityData, setQuantityData] = useState<CategoryQuantity[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [freqRes, quantRes] = await Promise.all([
        api.get('/analytics/stock/restock-frequency'),
        api.get('/analytics/stock/restock-quantity-details'),
      ]);
      setFrequencyData(freqRes.data.data);
      setQuantityData(quantRes.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load stock analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeData = activeView === 'frequency' ? frequencyData : quantityData;
  const totalCategories = activeData.length;
  const totalProducts = activeData.reduce((sum, cat) => sum + cat.products.length, 0);
  const totalValue =
    activeView === 'frequency'
      ? frequencyData.reduce((sum, cat) => sum + cat.products.reduce((s, p) => s + p.value, 0), 0)
      : quantityData.reduce(
          (sum, cat) =>
            sum + cat.products.reduce((s, p) => s + p.totalBoxesRestocked + p.totalSinglesRestocked, 0),
          0
        );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-12 w-64 bg-white/10" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl bg-white/10" />)}
          </div>
          <Skeleton className="h-[400px] w-full rounded-2xl bg-white/10" />
          <div className="grid gap-8 lg:grid-cols-2">
            <Skeleton className="h-80 rounded-2xl bg-white/10" />
            <Skeleton className="h-80 rounded-2xl bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0F] via-[#12121A] to-[#0A0A0F]" />
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 -right-4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px] animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl p-6 lg:p-8 space-y-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-4 items-center justify-between"
        >
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Stock Analytics
            </h1>
            <p className="text-gray-400 mt-2 flex items-center gap-2">
              <Package2 className="h-4 w-4" /> Real restock data • Boxes vs Singles
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Chart Type Selector */}
            <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
              <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Chart type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">📊 Bar Chart</SelectItem>
                <SelectItem value="line">📈 Line Chart</SelectItem>
                <SelectItem value="area">📉 Area Chart</SelectItem>
                <SelectItem value="stacked">📚 Stacked Bar</SelectItem>
                <SelectItem value="pie">🥧 Pie Chart</SelectItem>
              </SelectContent>
            </Select>

            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'frequency' | 'quantity')}>
              <TabsList className="bg-white/10 backdrop-blur-md border border-white/20">
                <TabsTrigger value="frequency" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                  📈 Frequency
                </TabsTrigger>
                <TabsTrigger value="quantity" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                  📦 Quantity
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={fetchData} className="border-white/20 hover:bg-white/10 text-white">
              <RefreshCw className="mr-2 h-4 w-4" /> Sync
            </Button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-3"
        >
          <KpiCard label="Categories" value={totalCategories} color="#3B82F6" />
          <KpiCard label="Active Products" value={totalProducts} color="#8B5CF6" />
          <KpiCard 
            label={activeView === 'frequency' ? 'Total Restocks' : 'Total Units'} 
            value={totalValue} 
            color="#10B981"
          />
        </motion.div>

        {/* Category Breakdown Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-5 w-5 text-blue-400" />
          <h2 className="text-2xl font-semibold text-white">Category Breakdown</h2>
          <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-300">
            {activeData.length} categories
          </span>
        </motion.div>

        {/* Charts Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {activeData.map((category, idx) => {
            const gradients = [
              { start: '#3B82F6', end: '#8B5CF6' },
              { start: '#10B981', end: '#34D399' },
              { start: '#F59E0B', end: '#FBBF24' },
              { start: '#EF4444', end: '#F87171' },
              { start: '#06B6D4', end: '#22D3EE' },
            ];
            const { start, end } = gradients[idx % gradients.length];

            if (activeView === 'frequency') {
              const freqCategory = category as CategoryFrequency;
              const freqData = freqCategory.products.map(p => ({
                name: p.productName.length > 18 ? p.productName.slice(0, 18) + '…' : p.productName,
                fullName: p.productName,
                value: p.value,
              }));
              return (
                <ReusableChart
                  key={freqCategory.categoryId}
                  title={freqCategory.categoryName}
                  data={freqData}
                  dataKey="value"
                  chartType={chartType}
                  colorStart={start}
                  colorEnd={end}
                  height={350}
                />
              );
            } else {
              const quantCategory = category as CategoryQuantity;
              const quantData = quantCategory.products.map(p => ({
                name: p.productName.length > 18 ? p.productName.slice(0, 18) + '…' : p.productName,
                fullName: p.productName,
                Boxes: p.totalBoxesRestocked,
                Bottles: p.totalSinglesRestocked,
              }));
              // For stacked or pie, we need different handling
              if (chartType === 'stacked') {
                return (
                  <ReusableChart
                    key={category.categoryId}
                    title={category.categoryName}
                    data={quantData}
                    dataKey="Boxes"
                    secondaryDataKey="Bottles"
                    chartType="stacked"
                    colorStart={start}
                    colorEnd={end}
                    height={350}
                  />
                );
              } else if (chartType === 'pie') {
                // Show total boxes vs bottles as pie
                const totalBoxes = quantData.reduce((sum, p) => sum + p.Boxes, 0);
                const totalBottles = quantData.reduce((sum, p) => sum + p.Bottles, 0);
                const pieData = [
                  { name: 'Boxes', value: totalBoxes, color: start },
                  { name: 'Bottles', value: totalBottles, color: end },
                ];
                return (
                  <ReusableChart
                    key={category.categoryId}
                    title={category.categoryName}
                    data={pieData}
                    dataKey="value"
                    chartType="pie"
                    colorStart={start}
                    colorEnd={end}
                    height={350}
                  />
                );
              } else {
                // For bar/line/area on quantity data, we need to reshape: each product as x, two series
                // ReusableChart will handle multi-series via secondaryDataKey
                return (
                  <ReusableChart
                    key={category.categoryId}
                    title={category.categoryName}
                    data={quantData}
                    dataKey="Boxes"
                    secondaryDataKey="Bottles"
                    chartType={chartType}
                    colorStart={start}
                    colorEnd={end}
                    height={350}
                  />
                );
              }
            }
          })}
        </div>
      </div>
    </div>
  );
}