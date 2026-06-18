'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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
import { RefreshCw, BarChart3, TrendingUp, Award, Calendar } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

// ── Dynamically import the chart component (client‑only) ──
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

// ── Date formatters ──
function formatDateLabel(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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

// ── Chart Type Selector Wrapper (uses dynamic ReusableChart) ──
function ChartWithTypeSelector({
  title,
  data,
  dataKey,
  secondaryDataKey,
  defaultChartType,
  storageKey,
  colorStart,
  colorEnd,
  height = 350,
  xAxisTickFormatter,
  tooltipLabelFormatter,
}: {
  title: string;
  data: any[];
  dataKey: string;
  secondaryDataKey?: string;
  defaultChartType: 'bar' | 'line' | 'area' | 'stacked' | 'pie';
  storageKey: string;
  colorStart?: string;
  colorEnd?: string;
  height?: number;
  xAxisTickFormatter?: (value: string) => string;
  tooltipLabelFormatter?: (label: string) => string;
}) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'stacked' | 'pie'>(defaultChartType);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved && ['bar', 'line', 'area', 'stacked', 'pie'].includes(saved)) {
      setChartType(saved as any);
    }
  }, [storageKey]);

  const updateChartType = (type: any) => {
    setChartType(type);
    localStorage.setItem(storageKey, type);
  };

  if (!data || data.length === 0) {
    return (
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
        </div>
        <div className="flex items-center justify-center h-[350px] text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-white font-semibold text-lg">{title}</h3>
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
      </div>
      <ReusableChart
        title=""
        data={data}
        dataKey={dataKey}
        secondaryDataKey={secondaryDataKey}
        chartType={chartType}
        colorStart={colorStart || '#3B82F6'}
        colorEnd={colorEnd || '#8B5CF6'}
        height={height}
        xAxisTickFormatter={xAxisTickFormatter}
        tooltipLabelFormatter={tooltipLabelFormatter}
      />
    </div>
  );
}

// ── Main Component ──
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

  // ── Transform data for charts (always return array) ──
  const transformDailyData = (data: any[], keys: string[]) => {
    if (!data || data.length === 0) return [];
    return data.map((item) => ({
      name: formatDateLabel(item.date),
      fullDate: formatDateFull(item.date),
      tooltipLabel: formatDateTooltip(item.date),
      ...keys.reduce((acc, key) => ({ ...acc, [key]: parseSafeNumber(item[key]) }), {}),
    }));
  };

  // ── Compute KPIs with safe parsing ──
  const totalRevenue = (salesSummary || []).reduce((sum, d) => sum + parseSafeNumber(d.totalRevenue), 0);
  const totalProfit = (salesSummary || []).reduce((sum, d) => sum + parseSafeNumber(d.totalProfit), 0);
  const totalSalesCount = (salesSummary || []).reduce((sum, d) => sum + parseSafeNumber(d.salesCount), 0);
  const avgMargin = (salesSummary || []).length > 0
    ? (salesSummary || []).reduce((sum, d) => sum + parseSafeNumber(d.marginPercent), 0) / (salesSummary || []).length
    : 0;

  // ── Prepare chart data ──
  const revenueProfitData = transformDailyData(revenueProfitMargin, ['revenue', 'profit', 'marginPercent']);
  const salesFreqData = transformDailyData(dailySalesFrequency, ['saleCount']);
  const quantityData = transformDailyData(dailyQuantitySold, ['totalUnits']);
  const costVsRetailData = transformDailyData(costVsRetail, ['avgBuyPrice', 'avgSellCost']);

  // Unit Type Mix
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

  // Box vs Single Donut
  const totalBoxes = (unitTypeBreakdown || []).reduce((sum, item) => sum + parseSafeNumber(item.boxes), 0);
  const totalSingles = (unitTypeBreakdown || []).reduce((sum, item) => sum + parseSafeNumber(item.singles), 0);
  const boxSingleDonutData = [
    { name: 'Boxes', value: totalBoxes, color: '#3B82F6' },
    { name: 'Singles', value: totalSingles, color: '#10B981' },
  ];

  // Quadrant Heatmap
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

  // Top Products
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

  // ── Render ──
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
            <ChartWithTypeSelector
              title="Revenue vs Profit with Margin"
              data={revenueProfitData}
              dataKey="revenue"
              secondaryDataKey="profit"
              defaultChartType="bar"
              storageKey="sales_chart_rpm"
              colorStart="#10B981"
              colorEnd="#8B5CF6"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />

            <ChartWithTypeSelector
              title="Daily Profit"
              data={revenueProfitData}
              dataKey="profit"
              defaultChartType="line"
              storageKey="sales_chart_daily_profit"
              colorStart="#8B5CF6"
              colorEnd="#EC4899"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />

            <ChartWithTypeSelector
              title="Daily Sales Frequency"
              data={salesFreqData}
              dataKey="saleCount"
              defaultChartType="line"
              storageKey="sales_chart_frequency"
              colorStart="#3B82F6"
              colorEnd="#8B5CF6"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />

            <ChartWithTypeSelector
              title="Daily Quantity Sold"
              data={quantityData}
              dataKey="totalUnits"
              defaultChartType="area"
              storageKey="sales_chart_quantity"
              colorStart="#8B5CF6"
              colorEnd="#EC4899"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />

            <ChartWithTypeSelector
              title="Cost vs Retail Price"
              data={costVsRetailData}
              dataKey="avgBuyPrice"
              secondaryDataKey="avgSellCost"
              defaultChartType="line"
              storageKey="sales_chart_cost_retail"
              colorStart="#EF4444"
              colorEnd="#10B981"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />

            <ChartWithTypeSelector
              title="Box vs Single (Donut)"
              data={boxSingleDonutData}
              dataKey="value"
              defaultChartType="pie"
              storageKey="sales_chart_box_single_donut"
              colorStart="#3B82F6"
              colorEnd="#10B981"
              tooltipLabelFormatter={(label) => {
                const item = boxSingleDonutData.find((d) => d.name === label);
                return item ? `${label}: ${formatNumber(item.value)} units` : label;
              }}
            />

            <ChartWithTypeSelector
              title="Unit Type Mix (All Products)"
              data={unitTypePieData}
              dataKey="value"
              defaultChartType="pie"
              storageKey="sales_chart_unit_mix"
              colorStart="#3B82F6"
              colorEnd="#10B981"
            />

            <ChartWithTypeSelector
              title="Box vs Single (Top 10 Products)"
              data={stackedData}
              dataKey="Boxes"
              secondaryDataKey="Singles"
              defaultChartType="stacked"
              storageKey="sales_chart_box_single"
              colorStart="#3B82F6"
              colorEnd="#10B981"
            />

            <ChartWithTypeSelector
              title="Product Volume (Units Sold)"
              data={heatmapVolumeData}
              dataKey="value"
              defaultChartType="bar"
              storageKey="sales_chart_volume"
              colorStart="#8B5CF6"
              colorEnd="#3B82F6"
              tooltipLabelFormatter={(label) => {
                const item = quadrantHeatmap.find((p) => p.productName === label);
                return item
                  ? `📦 ${item.productName}\n${formatNumber(item.totalUnitsSold)} units\nMargin: ${item.marginPercent?.toFixed(1)}%`
                  : label;
              }}
            />

            <ChartWithTypeSelector
              title="Product Margin %"
              data={heatmapMarginData}
              dataKey="value"
              defaultChartType="bar"
              storageKey="sales_chart_margin"
              colorStart="#10B981"
              colorEnd="#F59E0B"
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
              <ChartWithTypeSelector
                title="Top Selling"
                data={topSellingData}
                dataKey="value"
                defaultChartType="bar"
                storageKey="sales_chart_top_selling"
                colorStart="#3B82F6"
                colorEnd="#10B981"
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
              <ChartWithTypeSelector
                title="Top Profit"
                data={topProfitData}
                dataKey="value"
                defaultChartType="bar"
                storageKey="sales_chart_top_profit"
                colorStart="#F59E0B"
                colorEnd="#EF4444"
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
            <ChartWithTypeSelector
              title="Daily Profit"
              data={revenueProfitData}
              dataKey="profit"
              defaultChartType="line"
              storageKey="sales_chart_daily_breakdown_profit"
              colorStart="#8B5CF6"
              colorEnd="#EC4899"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />

            <ChartWithTypeSelector
              title="Daily Sales Frequency"
              data={salesFreqData}
              dataKey="saleCount"
              defaultChartType="line"
              storageKey="sales_chart_daily_breakdown_frequency"
              colorStart="#3B82F6"
              colorEnd="#8B5CF6"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />

            <ChartWithTypeSelector
              title="Daily Quantity Sold"
              data={quantityData}
              dataKey="totalUnits"
              defaultChartType="area"
              storageKey="sales_chart_daily_breakdown_quantity"
              colorStart="#8B5CF6"
              colorEnd="#EC4899"
              xAxisTickFormatter={formatDateLabel}
              tooltipLabelFormatter={formatDateTooltip}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}