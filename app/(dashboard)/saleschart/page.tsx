'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { RefreshCw, BarChart3, TrendingUp, Award, Calendar, Eye, EyeOff, RotateCcw } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

// ── Dynamically import chart (client‑only) ──
import dynamic from 'next/dynamic';

const ReusableChart = dynamic(
  () => import('@/components/charts/ReusableChart').then((mod) => mod.ReusableChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[350px] text-gray-400">
        Loading chart…
      </div>
    ),
  }
);

// ── Safe number parsing ──
function parseSafeNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// ── Date formatters (include year) ──
function formatDateLabel(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTooltip(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Unknown date';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateFull(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(value: any): string {
  const num = parseSafeNumber(value);
  if (num === 0) return 'ETB 0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(num);
}

function formatNumber(value: any): string {
  const num = parseSafeNumber(value);
  return num.toLocaleString();
}

// ── Types ──
interface SalesSummaryItem {
  date: string;
  salesCount: number;
  totalUnitsSold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  marginPercent: number;
}

interface UnitTypeBreakdown {
  id: string;
  name: string;
  boxes: number;
  singles: number;
  total: number;
  boxPercent: number;
  singlePercent: number;
}

interface TopProduct {
  productId: string;
  productName: string;
  totalUnitsSold?: number;
  totalProfit?: number;
}

// ── Helper to get localStorage key ──
function getStorageKey(baseKey: string) {
  return `chart_controls_${baseKey}`;
}

// ── Reusable Chart with series toggles ──
export function ChartWithControls({
  title,
  data,
  availableKeys,
  defaultVisibleKeys,
  defaultChartType,
  storageKey,
  height = 350,
  xAxisTickFormatter,
  tooltipLabelFormatter,
}: {
  title: string;
  data: any[];
  availableKeys: { key: string; label: string; color: string }[];
  defaultVisibleKeys: string[];
  defaultChartType: 'bar' | 'line' | 'area' | 'stacked' | 'pie';
  storageKey: string;
  height?: number;
  xAxisTickFormatter?: (value: string) => string;
  tooltipLabelFormatter?: (label: string) => string;
}) {
  // Load saved state from localStorage
  const loadSavedState = () => {
    try {
      const saved = localStorage.getItem(getStorageKey(storageKey));
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          chartType: parsed.chartType || defaultChartType,
          visibleKeys: parsed.visibleKeys || defaultVisibleKeys,
        };
      }
    } catch (e) {
      // ignore
    }
    return { chartType: defaultChartType, visibleKeys: defaultVisibleKeys };
  };

  const [state, setState] = useState(() => loadSavedState());
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'stacked' | 'pie'>(state.chartType);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(state.visibleKeys);

  // Save to localStorage whenever chartType or visibleKeys change
  useEffect(() => {
    try {
      localStorage.setItem(
        getStorageKey(storageKey),
        JSON.stringify({ chartType, visibleKeys })
      );
    } catch (e) {
      // ignore
    }
  }, [chartType, visibleKeys, storageKey]);

  const updateChartType = (type: any) => {
    setChartType(type);
  };

  const toggleKey = (key: string) => {
    // If the key is already visible, and it's the only one, prevent toggling off
    if (visibleKeys.includes(key) && visibleKeys.length === 1) {
      toast.warning('At least one series must be visible', {
        description: 'You cannot hide the last visible series.',
        duration: 2000,
      });
      return;
    }

    setVisibleKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const resetToDefault = () => {
    setVisibleKeys(defaultVisibleKeys);
    setChartType(defaultChartType);
  };

  // Determine primary and secondary keys (first two visible)
  const primaryKey = visibleKeys[0] || null;
  const secondaryKey = visibleKeys[1] || null;

  // Get colors
  const primaryColor = availableKeys.find((k) => k.key === primaryKey)?.color || '#3B82F6';
  const secondaryColor = secondaryKey
    ? availableKeys.find((k) => k.key === secondaryKey)?.color || '#8B5CF6'
    : undefined;

  // If for some reason no key is visible, force the first
  if (!primaryKey && availableKeys.length > 0) {
    setVisibleKeys([availableKeys[0].key]);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 w-full max-w-full overflow-hidden hover:border-white/30 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          <span className="w-1 h-6 rounded-full bg-gradient-to-b from-emerald-400 to-teal-400" />
          {title}
        </h3>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Series toggles */}
          {availableKeys.map((k) => {
            const isVisible = visibleKeys.includes(k.key);
            const isLast = visibleKeys.length === 1 && isVisible;
            return (
              <motion.button
                key={k.key}
                onClick={() => toggleKey(k.key)}
                className={`px-3 py-1 text-xs rounded-full transition-all flex items-center gap-1 ${
                  isVisible
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                } ${isLast ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  border: isVisible ? `2px solid ${k.color}` : '2px solid transparent',
                }}
                whileHover={!isLast ? { scale: 1.05 } : {}}
                whileTap={!isLast ? { scale: 0.95 } : {}}
                animate={isLast ? { x: [0, -5, 5, -5, 5, 0] } : {}}
                transition={{ duration: 0.4 }}
                title={isLast ? 'Cannot hide the last visible series' : 'Click to toggle'}
                disabled={isLast}
              >
                {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {k.label}
              </motion.button>
            );
          })}

          {/* Chart type selector */}
          <Select value={chartType} onValueChange={updateChartType}>
            <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Chart type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">📊 Bar</SelectItem>
              <SelectItem value="line">📈 Line</SelectItem>
              <SelectItem value="area">📉 Area</SelectItem>
              <SelectItem value="stacked">📚 Stacked</SelectItem>
              <SelectItem value="pie">🥧 Pie</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset button */}
          <motion.button
            onClick={resetToDefault}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.3 }}
            title="Reset to default"
          >
            <RotateCcw className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {data.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center h-[350px] text-gray-400"
          >
            No data available
          </motion.div>
        ) : (
          <motion.div
            key={chartType + visibleKeys.join(',')}
            initial={{ opacity: 0.5, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <ReusableChart
              title=""
              data={data}
              dataKey={primaryKey || availableKeys[0]?.key || ''}
              secondaryDataKey={secondaryKey || undefined}
              chartType={chartType}
              colorStart={primaryColor}
              colorEnd={secondaryColor}
              height={height}
              xAxisTickFormatter={xAxisTickFormatter}
              tooltipLabelFormatter={tooltipLabelFormatter}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional: show count of visible series */}
      <div className="mt-2 text-xs text-gray-500 text-right">
        {visibleKeys.length} series visible
      </div>
    </motion.div>
  );
}

// ── Main Page Component (unchanged) ──
export default function SalesAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [salesSummary, setSalesSummary] = useState<SalesSummaryItem[]>([]);
  const [unitTypeBreakdown, setUnitTypeBreakdown] = useState<UnitTypeBreakdown[]>([]);
  const [quadrantHeatmap, setQuadrantHeatmap] = useState<any[]>([]);
  const [costVsRetail, setCostVsRetail] = useState<any[]>([]);
  const [dailyProfit, setDailyProfit] = useState<any[]>([]);
  const [dailySalesFrequency, setDailySalesFrequency] = useState<any[]>([]);
  const [dailyQuantitySold, setDailyQuantitySold] = useState<any[]>([]);
  const [topSelling, setTopSelling] = useState<TopProduct[]>([]);
  const [topProfit, setTopProfit] = useState<TopProduct[]>([]);
  const [revenueProfitMargin, setRevenueProfitMargin] = useState<any[]>([]);

  // ── Fetch all data ──
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summaryRes = await api.get('/analytics/sales/sales-summary');
      setSalesSummary(summaryRes.data?.data ?? []);
      console.log('Sales summary (raw):', summaryRes.data?.data?.slice(0, 2));

      const unitRes = await api.get('/analytics/sales/unit-type-breakdown', {
        params: { groupBy: 'product' },
      });
      setUnitTypeBreakdown(unitRes.data?.data ?? []);

      const heatmapRes = await api.get('/analytics/sales/quadrant-heatmap');
      setQuadrantHeatmap(heatmapRes.data?.data ?? []);

      const profitRes = await api.get('/analytics/sales/daily-profit');
      setDailyProfit(profitRes.data?.data ?? []);

      const freqRes = await api.get('/analytics/sales/daily-sales-frequency');
      setDailySalesFrequency(freqRes.data?.data ?? []);

      const qtyRes = await api.get('/analytics/sales/daily-quantity-sold');
      setDailyQuantitySold(qtyRes.data?.data ?? []);

      const costRes = await api.get('/analytics/sales/cost-vs-retail');
      setCostVsRetail(costRes.data?.data ?? []);

      const topSellRes = await api.get('/analytics/sales/top-selling', {
        params: { limit: 10 },
      });
      setTopSelling(topSellRes.data?.data ?? []);

      const topProfitRes = await api.get('/analytics/sales/top-profit', {
        params: { limit: 10 },
      });
      setTopProfit(topProfitRes.data?.data ?? []);

      const rpmRes = await api.get('/analytics/sales/revenue-profit-margin');
      setRevenueProfitMargin(rpmRes.data?.data ?? []);
    } catch (err: any) {
      console.error('Sales analytics fetch error:', err);
      setError(err.message || 'Failed to load sales analytics');
      toast.error(err.message || 'Failed to load sales analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── Transform data for charts ──
  const transformDailyData = (data: any[], keys: string[]) => {
    if (!data || data.length === 0) return [];
    return data.map((item) => ({
      date: item.date,
      name: formatDateLabel(item.date),
      fullDate: formatDateFull(item.date),
      tooltipLabel: formatDateTooltip(item.date),
      ...keys.reduce((acc, key) => ({ ...acc, [key]: parseSafeNumber(item[key]) }), {}),
    }));
  };

  // ── Compute KPIs ──
  const totalRevenue = (salesSummary || []).reduce((sum, d) => sum + parseSafeNumber(d.totalRevenue), 0);
  const totalProfit = (salesSummary || []).reduce((sum, d) => sum + parseSafeNumber(d.totalProfit), 0);
  const totalSalesCount = (salesSummary || []).reduce((sum, d) => sum + parseSafeNumber(d.salesCount), 0);
  const avgMargin =
    (salesSummary || []).length > 0
      ? (salesSummary || []).reduce((sum, d) => sum + parseSafeNumber(d.marginPercent), 0) /
        (salesSummary || []).length
      : 0;

  // ── Prepare data for each chart ──
  const revenueProfitData = transformDailyData(revenueProfitMargin, ['revenue', 'profit', 'marginPercent']);
  const salesFreqData = transformDailyData(dailySalesFrequency, ['saleCount']);
  const quantityData = transformDailyData(dailyQuantitySold, ['totalUnits']);
  const costVsRetailData = transformDailyData(costVsRetail, ['avgBuyPrice', 'avgSellCost']);

  const unitTypePieData = (unitTypeBreakdown || []).map((item) => ({
    name: item.name,
    value: parseSafeNumber(item.total),
    color: '#3B82F6',
  }));

  const stackedData = (unitTypeBreakdown || []).slice(0, 10).map((item) => ({
    name: item.name.length > 12 ? item.name.slice(0, 12) + '…' : item.name,
    fullName: item.name,
    Boxes: parseSafeNumber(item.boxes),
    Singles: parseSafeNumber(item.singles),
  }));

  const totalBoxes = (unitTypeBreakdown || []).reduce((sum, item) => sum + parseSafeNumber(item.boxes), 0);
  const totalSingles = (unitTypeBreakdown || []).reduce((sum, item) => sum + parseSafeNumber(item.singles), 0);
  const boxSingleDonutData = [
    { name: 'Boxes', value: totalBoxes, color: '#3B82F6' },
    { name: 'Singles', value: totalSingles, color: '#10B981' },
  ];

  const heatmapVolumeData = (quadrantHeatmap || []).map((item) => ({
    name: item.productName.length > 15 ? item.productName.slice(0, 15) + '…' : item.productName,
    fullName: item.productName,
    value: parseSafeNumber(item.totalUnitsSold),
    color: item.marginPercent > 30 ? '#10B981' : item.marginPercent > 10 ? '#F59E0B' : '#EF4444',
  }));

  const heatmapMarginData = (quadrantHeatmap || []).map((item) => ({
    name: item.productName.length > 15 ? item.productName.slice(0, 15) + '…' : item.productName,
    fullName: item.productName,
    value: parseSafeNumber(item.marginPercent),
    color: item.hasLossLeader ? '#8B5CF6' : '#3B82F6',
  }));

  const topSellingData = (topSelling || []).map((item) => ({
    name: item.productName.length > 15 ? item.productName.slice(0, 15) + '…' : item.productName,
    fullName: item.productName,
    value: parseSafeNumber(item.totalUnitsSold),
  }));

  const topProfitData = (topProfit || []).map((item) => ({
    name: item.productName.length > 15 ? item.productName.slice(0, 15) + '…' : item.productName,
    fullName: item.productName,
    value: parseSafeNumber(item.totalProfit),
  }));

  // ── Loading / Error states ──
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl overflow-x-hidden">
        <div className="space-y-8">
          <Skeleton className="h-12 w-64 bg-white/10" />
          <div className="grid gap-6 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl bg-white/10" />
            ))}
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[400px] rounded-2xl bg-white/10" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-red-400">
          <h2 className="text-xl font-bold mb-2">Error loading analytics</h2>
          <p>{error}</p>
          <Button
            onClick={fetchAllData}
            className="mt-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Main Render ──
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl overflow-x-hidden w-full max-w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-wrap gap-4 items-center justify-between w-full max-w-full"
      >
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Sales Analytics
          </h1>
          <p className="text-gray-400 mt-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> All‑time sales intelligence
          </p>
        </div>
        <Button
          onClick={fetchAllData}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex-shrink-0"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 md:grid-cols-4 mb-12 w-full max-w-full"
      >
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatNumber(totalSalesCount)}</div>
            <p className="text-xs text-slate-500">all time</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-slate-500">total sales value</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {formatCurrency(totalProfit)}
            </div>
            <p className="text-xs text-slate-500">net profit</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Avg Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {isNaN(avgMargin) ? '0.0%' : avgMargin.toFixed(1) + '%'}
            </div>
            <p className="text-xs text-slate-500">average profit margin</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="mb-8 w-full max-w-full">
        <TabsList className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-1 rounded-xl w-full max-w-full overflow-x-auto flex-nowrap">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white rounded-lg text-slate-300 flex-shrink-0"
          >
            <BarChart3 className="mr-2 h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger
            value="top-products"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg text-slate-300 flex-shrink-0"
          >
            <TrendingUp className="mr-2 h-4 w-4" /> Top Products
          </TabsTrigger>
          <TabsTrigger
            value="daily-breakdown"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-lg text-slate-300 flex-shrink-0"
          >
            <Calendar className="mr-2 h-4 w-4" /> Daily Breakdown
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-6 space-y-8 w-full max-w-full">
          <div className="grid gap-8 lg:grid-cols-2 w-full max-w-full">
            {/* Revenue vs Profit with Margin */}
            <ChartWithControls
              title="Revenue vs Profit with Margin"
              data={revenueProfitData}
              availableKeys={[
                { key: 'revenue', label: 'Revenue', color: '#10B981' },
                { key: 'profit', label: 'Profit', color: '#8B5CF6' },
                { key: 'marginPercent', label: 'Margin %', color: '#F59E0B' },
              ]}
              defaultVisibleKeys={['revenue', 'profit']}
              defaultChartType="bar"
              storageKey="sales_chart_rpm"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />

            {/* Daily Profit */}
            <ChartWithControls
              title="Daily Profit"
              data={revenueProfitData}
              availableKeys={[{ key: 'profit', label: 'Profit', color: '#8B5CF6' }]}
              defaultVisibleKeys={['profit']}
              defaultChartType="line"
              storageKey="sales_chart_daily_profit"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />

            {/* Daily Sales Frequency */}
            <ChartWithControls
              title="Daily Sales Frequency"
              data={salesFreqData}
              availableKeys={[{ key: 'saleCount', label: 'Sales Count', color: '#3B82F6' }]}
              defaultVisibleKeys={['saleCount']}
              defaultChartType="line"
              storageKey="sales_chart_frequency"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />

            {/* Daily Quantity Sold */}
            <ChartWithControls
              title="Daily Quantity Sold"
              data={quantityData}
              availableKeys={[{ key: 'totalUnits', label: 'Units Sold', color: '#8B5CF6' }]}
              defaultVisibleKeys={['totalUnits']}
              defaultChartType="area"
              storageKey="sales_chart_quantity"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />

            {/* Cost vs Retail Price */}
            <ChartWithControls
              title="Cost vs Retail Price"
              data={costVsRetailData}
              availableKeys={[
                { key: 'avgBuyPrice', label: 'Avg Cost', color: '#EF4444' },
                { key: 'avgSellCost', label: 'Avg Retail', color: '#10B981' },
              ]}
              defaultVisibleKeys={['avgBuyPrice', 'avgSellCost']}
              defaultChartType="line"
              storageKey="sales_chart_cost_retail"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />

            {/* Box vs Single (Donut) */}
            <ChartWithControls
              title="Box vs Single (Donut)"
              data={boxSingleDonutData}
              availableKeys={[
                { key: 'value', label: 'Boxes', color: '#3B82F6' },
              ]}
              defaultVisibleKeys={['value']}
              defaultChartType="pie"
              storageKey="sales_chart_box_single_donut"
              tooltipLabelFormatter={(label) => {
                const item = boxSingleDonutData.find((d) => d.name === label);
                return item ? `${label}: ${formatNumber(item.value)} units` : label;
              }}
            />

            {/* Unit Type Mix (All Products) */}
            <ChartWithControls
              title="Unit Type Mix (All Products)"
              data={unitTypePieData}
              availableKeys={[{ key: 'value', label: 'Units', color: '#3B82F6' }]}
              defaultVisibleKeys={['value']}
              defaultChartType="pie"
              storageKey="sales_chart_unit_mix"
            />

            {/* Box vs Single (Top 10 Products) */}
            <ChartWithControls
              title="Box vs Single (Top 10 Products)"
              data={stackedData}
              availableKeys={[
                { key: 'Boxes', label: 'Boxes', color: '#3B82F6' },
                { key: 'Singles', label: 'Singles', color: '#10B981' },
              ]}
              defaultVisibleKeys={['Boxes', 'Singles']}
              defaultChartType="stacked"
              storageKey="sales_chart_box_single"
            />

            {/* Product Volume (Units Sold) */}
            <ChartWithControls
              title="Product Volume (Units Sold)"
              data={heatmapVolumeData}
              availableKeys={[{ key: 'value', label: 'Units Sold', color: '#8B5CF6' }]}
              defaultVisibleKeys={['value']}
              defaultChartType="bar"
              storageKey="sales_chart_volume"
              tooltipLabelFormatter={(label) => {
                const item = quadrantHeatmap.find((p) => p.productName === label);
                return item
                  ? `📦 ${item.productName}\n${formatNumber(item.totalUnitsSold)} units\nMargin: ${item.marginPercent?.toFixed(1)}%`
                  : label;
              }}
            />

            {/* Product Margin % */}
            <ChartWithControls
              title="Product Margin %"
              data={heatmapMarginData}
              availableKeys={[{ key: 'value', label: 'Margin %', color: '#F59E0B' }]}
              defaultVisibleKeys={['value']}
              defaultChartType="bar"
              storageKey="sales_chart_margin"
              tooltipLabelFormatter={(label) => {
                const item = quadrantHeatmap.find((p) => p.productName === label);
                return item
                  ? `📈 ${item.productName}\nMargin: ${item.marginPercent?.toFixed(1)}%\n${item.hasLossLeader ? '⚠️ Loss Leader' : '✅ Profitable'}`
                  : label;
              }}
            />
          </div>
        </TabsContent>

        {/* TOP PRODUCTS TAB */}
        <TabsContent value="top-products" className="mt-6 w-full max-w-full">
          <div className="grid gap-8 lg:grid-cols-2 w-full max-w-full">
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" /> Top Selling Products
              </h3>
              <ChartWithControls
                title="Top Selling"
                data={topSellingData}
                availableKeys={[{ key: 'value', label: 'Units Sold', color: '#3B82F6' }]}
                defaultVisibleKeys={['value']}
                defaultChartType="bar"
                storageKey="sales_chart_top_selling"
                tooltipLabelFormatter={(label) => {
                  const item = topSelling.find((p) => p.productName === label);
                  return item ? `🏆 ${item.productName}\n${formatNumber(item.totalUnitsSold)} units sold` : label;
                }}
              />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" /> Top Profit Products
              </h3>
              <ChartWithControls
                title="Top Profit"
                data={topProfitData}
                availableKeys={[{ key: 'value', label: 'Profit', color: '#F59E0B' }]}
                defaultVisibleKeys={['value']}
                defaultChartType="bar"
                storageKey="sales_chart_top_profit"
                tooltipLabelFormatter={(label) => {
                  const item = topProfit.find((p) => p.productName === label);
                  return item ? `💰 ${item.productName}\n${formatCurrency(item.totalProfit)} profit` : label;
                }}
              />
            </div>
          </div>
        </TabsContent>

        {/* DAILY BREAKDOWN */}
        <TabsContent value="daily-breakdown" className="mt-6 w-full max-w-full">
          <div className="grid gap-8 lg:grid-cols-2 w-full max-w-full">
            <ChartWithControls
              title="Daily Profit"
              data={revenueProfitData}
              availableKeys={[{ key: 'profit', label: 'Profit', color: '#8B5CF6' }]}
              defaultVisibleKeys={['profit']}
              defaultChartType="line"
              storageKey="sales_chart_daily_breakdown_profit"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />

            <ChartWithControls
              title="Daily Sales Frequency"
              data={salesFreqData}
              availableKeys={[{ key: 'saleCount', label: 'Sales Count', color: '#3B82F6' }]}
              defaultVisibleKeys={['saleCount']}
              defaultChartType="line"
              storageKey="sales_chart_daily_breakdown_frequency"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />

            <ChartWithControls
              title="Daily Quantity Sold"
              data={quantityData}
              availableKeys={[{ key: 'totalUnits', label: 'Units Sold', color: '#8B5CF6' }]}
              defaultVisibleKeys={['totalUnits']}
              defaultChartType="area"
              storageKey="sales_chart_daily_breakdown_quantity"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}