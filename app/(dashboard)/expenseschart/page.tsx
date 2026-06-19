'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  RefreshCw,
  BarChart3,
  TrendingUp,
  Calendar as CalendarIcon,
  Wallet,
  PieChart,
  User,
  AlertCircle,
  CheckCircle2,
  Circle,
  Layers,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ReusableChart } from '@/components/charts/ReusableChart';
import {
  Treemap,
  Tooltip as TreemapTooltip,
  ResponsiveContainer,
} from 'recharts';

// ── Utility functions ──
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

function formatCurrency(value: any): string {
  const num = parseSafeNumber(value);
  if (num === 0) return 'ETB 0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateWithDay(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatMonth(monthStr: string): string {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function getStatusConfig(percent: number) {
  if (percent <= 30) {
    return {
      status: 'green',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
      label: 'Green (Good)',
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
  } else if (percent <= 50) {
    return {
      status: 'yellow',
      icon: <AlertCircle className="h-4 w-4 text-yellow-400" />,
      label: 'Yellow (Caution)',
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    };
  } else {
    return {
      status: 'red',
      icon: <Circle className="h-4 w-4 text-red-400" />,
      label: 'Red (Warning)',
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
  }
}

function StatusBadge({ percent }: { percent: number }) {
  const config = getStatusConfig(percent);
  return (
    <Badge className={`${config.color} border px-3 py-1 text-xs font-medium flex items-center gap-1`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

// ── Helper for localStorage ──
function getStorageKey(baseKey: string) {
  return `chart_controls_${baseKey}`;
}

// ── Chart wrapper with controls ──
function ChartWithControls({
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

  const [state] = useState(() => loadSavedState());
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'stacked' | 'pie'>(state.chartType);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(state.visibleKeys);

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

  const updateChartType = (type: any) => setChartType(type);

  const toggleKey = (key: string) => {
    if (visibleKeys.includes(key) && visibleKeys.length === 1) {
      toast.warning('At least one series must be visible', {
        description: 'You cannot hide the last visible series.',
        duration: 2000,
      });
      return;
    }
    setVisibleKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const resetToDefault = () => {
    setVisibleKeys(defaultVisibleKeys);
    setChartType(defaultChartType);
  };

  const primaryKey = visibleKeys[0] || null;
  const secondaryKey = visibleKeys[1] || null;
  const primaryColor = availableKeys.find((k) => k.key === primaryKey)?.color || '#3B82F6';
  const secondaryColor = secondaryKey
    ? availableKeys.find((k) => k.key === secondaryKey)?.color || '#8B5CF6'
    : undefined;

  if (!primaryKey && availableKeys.length > 0) {
    setVisibleKeys([availableKeys[0].key]);
  }

  const chartData = data;

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
        {chartData.length === 0 ? (
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
              data={chartData}
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
      <div className="mt-2 text-xs text-gray-500 text-right">
        {visibleKeys.length} series visible
      </div>
    </motion.div>
  );
}

// ── Yearly Heatmap ──
function YearlyHeatmap({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="h-[350px] flex items-center justify-center text-gray-400">No yearly data</div>;
  }

  const weeks: any[] = [];
  let currentWeek: any[] = [];
  data.forEach((day) => {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-800';
    if (value < 500) return 'bg-emerald-900/40';
    if (value < 1000) return 'bg-emerald-700/60';
    if (value < 2000) return 'bg-emerald-500/80';
    return 'bg-emerald-400';
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex flex-wrap gap-1">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-1">
            {week.map((day: any, dayIdx: number) => (
              <TooltipProvider key={`${weekIdx}-${dayIdx}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`w-3 h-3 rounded-sm ${getColor(day.total)} transition-colors hover:scale-110 cursor-pointer`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      {day.date ? (
                        <>
                          <div className="font-bold">{new Date(day.date).toLocaleDateString()}</div>
                          <div>Total: {formatCurrency(day.total)}</div>
                          {day.notes && day.notes.length > 0 && (
                            <div className="mt-1 text-gray-300">
                              {day.notes.slice(0, 2).map((note: string, i: number) => (
                                <div key={i} className="truncate max-w-[200px]">• {note}</div>
                              ))}
                              {day.notes.length > 2 && <div>+{day.notes.length - 2} more</div>}
                            </div>
                          )}
                        </>
                      ) : (
                        <span>No data</span>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end mt-4 gap-2 text-xs text-gray-400">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-gray-800" />
        <div className="w-3 h-3 rounded-sm bg-emerald-900/40" />
        <div className="w-3 h-3 rounded-sm bg-emerald-700/60" />
        <div className="w-3 h-3 rounded-sm bg-emerald-500/80" />
        <div className="w-3 h-3 rounded-sm bg-emerald-400" />
        <span>More</span>
      </div>
    </div>
  );
}

// ── Custom Treemap Content ──
const CustomTreemapContent = (props: any) => {
  const { depth, x, y, width, height, index, name, value, colors } = props;
  const colorPalette = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
  const color = colorPalette[index % colorPalette.length];
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        rx={4}
      />
      {width > 40 && height > 20 && (
        <>
          <text x={x + 8} y={y + 20} fill="#fff" fontSize={12} fontWeight="bold">
            {name}
          </text>
          <text x={x + 8} y={y + 40} fill="#fff" fontSize={10}>
            {formatCurrency(value)}
          </text>
        </>
      )}
    </g>
  );
};

// ── Main Page ──
export default function ExpenseAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filters ──
  const [selectedHeatmapYear, setSelectedHeatmapYear] = useState<number>(new Date().getFullYear());

  // ── Data states ──
  const [overview, setOverview] = useState<any>(null);
  const [referenceBreakdown, setReferenceBreakdown] = useState<any[]>([]);
  const [dailyTrend, setDailyTrend] = useState<any[]>([]);
  const [personalUsage, setPersonalUsage] = useState<any>(null);
  const [profitMargin, setProfitMargin] = useState<any>(null);
  const [categorySpending, setCategorySpending] = useState<any[]>([]);
  const [categoryTreemap, setCategoryTreemap] = useState<any[]>([]);
  const [planExpenses, setPlanExpenses] = useState<any[]>([]);
  const [yearlyHeatmap, setYearlyHeatmap] = useState<any[]>([]);
  const [dailyProfitMargin, setDailyProfitMargin] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // ── Fetch all data ──
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        overviewRes,
        referenceRes,
        dailyRes,
        personalRes,
        profitRes,
        categoryRes,
        treemapRes,
        planRes,
        heatmapRes,
        dailyProfitRes,
        yearsRes,
      ] = await Promise.all([
        api.get('/analytics/expense/overview'),
        api.get('/analytics/expense/reference-breakdown'),
        api.get('/analytics/expense/daily-trend'),
        api.get('/analytics/expense/personal-usage'),
        api.get('/analytics/expense/profit-margin'),
        api.get('/analytics/expense/category-spending'),
        api.get('/analytics/expense/category-treemap'),
        api.get('/analytics/expense/plan-expenses'),
        api.get('/analytics/expense/yearly-heatmap', { params: { year: selectedHeatmapYear } }),
        api.get('/analytics/expense/daily-profit-margin'),
        api.get('/analytics/expense/available-years'),
      ]);

      setOverview(overviewRes.data?.data);
      setReferenceBreakdown(referenceRes.data?.data ?? []);
      setDailyTrend(dailyRes.data?.data ?? []);
      setPersonalUsage(personalRes.data?.data);
      setProfitMargin(profitRes.data?.data);
      setCategorySpending(categoryRes.data?.data ?? []);
      setCategoryTreemap(treemapRes.data?.data ?? []);
      setPlanExpenses(planRes.data?.data ?? []);
      setYearlyHeatmap(heatmapRes.data?.data ?? []);
      setDailyProfitMargin(dailyProfitRes.data?.data ?? []);
      setAvailableYears(yearsRes.data?.data ?? []);
    } catch (err: any) {
      console.error('Expense analytics fetch error:', err);
      setError(err.message || 'Failed to load expense analytics');
      toast.error(err.message || 'Failed to load expense analytics');
    } finally {
      setLoading(false);
    }
  }, [selectedHeatmapYear]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── Transform data for charts ──
  const referenceChartData = referenceBreakdown.map((item) => ({
    name: item.name,
    value: parseSafeNumber(item.value),
    percentage: parseSafeNumber(item.percentage),
  }));

  const dailyChartData = dailyTrend.map((item) => ({
    name: formatDateWithDay(item.name),
    value: parseSafeNumber(item.value),
  }));

  const categoryChartData = categorySpending.map((item) => ({
    name: item.categoryName,
    value: parseSafeNumber(item.total),
  }));

  const planChartData = planExpenses.map((item) => ({
    name: item.planName,
    value: parseSafeNumber(item.total),
  }));

  const treemapData = categoryTreemap.map((item) => ({
    name: item.name,
    value: parseSafeNumber(item.value),
    parent: item.parent,
  }));

  const dailyProfitChartData = dailyProfitMargin.map((item) => {
    const netProfit = parseSafeNumber(item.netProfit);
    const personalExpenses = parseSafeNumber(item.personalExpenses);
    const personalUsagePercent = netProfit > 0 ? (personalExpenses / netProfit) * 100 : 0;
    return {
      name: formatDateWithDay(item.name),
      expenses: parseSafeNumber(item.expenses),
      netProfit: netProfit,
      personalUsagePercent: parseSafeNumber(personalUsagePercent),
    };
  });

  // ── KPI values ──
  const totalExpenses = overview?.totalExpenses || 0;
  const businessExpenses = overview?.businessExpenses || 0;
  const personalExpenses = overview?.personalExpenses || 0;
  const netProfit = overview?.netProfit || 0;
  const totalProfitAfterAll = overview?.totalProfitAfterAll || 0;
  const activePlans = overview?.activePlans || 0;
  const expensesThisMonth = overview?.expensesThisMonth || 0;

  // ── Loading / Error ──
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
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

  // ── Render ──
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl overflow-x-hidden w-full max-w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-wrap gap-4 items-center justify-between w-full max-w-full"
      >
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
            Expense Analytics
          </h1>
          <p className="text-gray-400 mt-2 flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Daily spending, profit, and financial health
          </p>
        </div>
        <Button
          onClick={fetchAllData}
          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white flex-shrink-0"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 md:grid-cols-3 lg:grid-cols-6 mb-12 w-full max-w-full"
      >
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Business Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-400">{formatCurrency(businessExpenses)}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Personal Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{formatCurrency(personalExpenses)}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(netProfit)}
            </div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{activePlans}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Personal Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {personalUsage ? (
              <>
                <div className={`text-2xl font-bold ${personalUsage.personalUsagePercent <= 30 ? 'text-emerald-400' : personalUsage.personalUsagePercent <= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {personalUsage.personalUsagePercent.toFixed(1)}%
                </div>
                <StatusBadge percent={personalUsage.personalUsagePercent} />
              </>
            ) : (
              <div className="text-gray-400">No data</div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Profit Margin & Expense Ratio Cards */}
      {profitMargin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6 md:grid-cols-4 mb-12 w-full max-w-full"
        >
          <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{formatCurrency(profitMargin.totalExpenses)}</div>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Net Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{formatCurrency(profitMargin.netProfit)}</div>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Expense Ratio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{profitMargin.expenseRatio.toFixed(1)}%</div>
              <p className="text-xs text-slate-500">Expenses / Sales</p>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Profit Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${profitMargin.profitMargin > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {profitMargin.profitMargin.toFixed(1)}%
              </div>
              <p className="text-xs text-slate-500">Markup: {profitMargin.markup.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Charts Grid – Only Daily Charts */}
      <div className="grid gap-8 lg:grid-cols-2 w-full max-w-full">
        {/* Daily Expenses & Net Profit & Personal Usage % */}
        <div className="lg:col-span-2">
          <ChartWithControls
            title="Daily Expenses, Net Profit & Personal Usage %"
            data={dailyProfitChartData}
            availableKeys={[
              { key: 'expenses', label: 'Expenses', color: '#EF4444' },
              { key: 'netProfit', label: 'Net Profit', color: '#8B5CF6' },
              { key: 'personalUsagePercent', label: 'Personal Usage %', color: '#F59E0B' },
            ]}
            defaultVisibleKeys={['expenses', 'netProfit']}
            defaultChartType="line"
            storageKey="expense_daily_profit_margin"
            xAxisTickFormatter={(v) => v}
            tooltipLabelFormatter={(label) => {
              const item = dailyProfitChartData.find((d) => d.name === label);
              if (item) {
                return `${label}\nExpenses: ${formatCurrency(item.expenses)}\nNet Profit: ${formatCurrency(item.netProfit)}\nPersonal Usage: ${item.personalUsagePercent.toFixed(1)}%`;
              }
              return label;
            }}
          />
          <div className="mt-2 text-center text-sm text-gray-400">
            X‑Axis: Date &nbsp;|&nbsp; Y‑Axis: Amount (ETB) / Percentage (%)
          </div>
        </div>

        {/* Daily Spending (Expenses per day) */}
        <ChartWithControls
          title="Daily Spending (All Time)"
          data={dailyChartData}
          availableKeys={[{ key: 'value', label: 'Spent', color: '#3B82F6' }]}
          defaultVisibleKeys={['value']}
          defaultChartType="line"
          storageKey="expense_daily"
          xAxisTickFormatter={(v) => v}
          tooltipLabelFormatter={(label) => {
            const item = dailyChartData.find((d) => d.name === label);
            return item ? `${label}: ${formatCurrency(item.value)}` : label;
          }}
        />

        {/* Expense by Reference Type (Pie) */}
        <ChartWithControls
          title="Expense by Reference Type (Pie)"
          data={referenceChartData}
          availableKeys={[{ key: 'value', label: 'Amount', color: '#3B82F6' }]}
          defaultVisibleKeys={['value']}
          defaultChartType="pie"
          storageKey="expense_reference_pie"
          tooltipLabelFormatter={(label) => {
            const item = referenceChartData.find((d) => d.name === label);
            return item
              ? `${item.name}: ${formatCurrency(item.value)} (${item.percentage.toFixed(1)}%)`
              : label;
          }}
        />

        {/* Expense by Reference Type (Bar) */}
        <ChartWithControls
          title="Expense by Reference Type (Bar)"
          data={referenceChartData}
          availableKeys={[{ key: 'value', label: 'Amount', color: '#8B5CF6' }]}
          defaultVisibleKeys={['value']}
          defaultChartType="bar"
          storageKey="expense_reference_bar"
          xAxisTickFormatter={(v) => v}
          tooltipLabelFormatter={(label) => {
            const item = referenceChartData.find((d) => d.name === label);
            return item
              ? `${item.name}: ${formatCurrency(item.value)} (${item.percentage.toFixed(1)}%)`
              : label;
          }}
        />

        {/* Category Spending (Bar) */}
        <ChartWithControls
          title="Category Spending (Flat)"
          data={categoryChartData}
          availableKeys={[{ key: 'value', label: 'Spent', color: '#8B5CF6' }]}
          defaultVisibleKeys={['value']}
          defaultChartType="bar"
          storageKey="expense_category"
          xAxisTickFormatter={(v) => v}
          tooltipLabelFormatter={(label) => {
            const item = categoryChartData.find((d) => d.name === label);
            return item ? `${label}: ${formatCurrency(item.value)}` : label;
          }}
        />

        {/* Plan Expenses */}
        <ChartWithControls
          title="Plan Expenses"
          data={planChartData}
          availableKeys={[{ key: 'value', label: 'Plan Cost', color: '#10B981' }]}
          defaultVisibleKeys={['value']}
          defaultChartType="bar"
          storageKey="expense_plan"
          xAxisTickFormatter={(v) => v}
          tooltipLabelFormatter={(label) => {
            const item = planChartData.find((d) => d.name === label);
            return item ? `${label}: ${formatCurrency(item.value)}` : label;
          }}
        />
      </div>

      {/* Treemap and Heatmap – Full Width */}
      <div className="mt-8 grid gap-8 w-full max-w-full">
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 p-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" /> Expense Category Treemap
          </h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={treemapData.length > 0 ? treemapData : [{ name: 'No data', value: 1 }]}
                dataKey="value"
                nameKey="name"
                stroke="#fff"
                fill="#3B82F6"
                content={<CustomTreemapContent />}
              >
                <TreemapTooltip
                  formatter={(value: any, name: any) => [`${formatCurrency(value)}`, name]}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-cyan-400" /> Yearly Expense Heatmap (GitHub Style)
            </h3>
            <Select
              value={String(selectedHeatmapYear)}
              onValueChange={(val) => setSelectedHeatmapYear(parseInt(val))}
            >
              <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
                {availableYears.length === 0 && (
                  <SelectItem value="all" disabled>
                    No years available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <YearlyHeatmap data={yearlyHeatmap} />
        </Card>
      </div>
    </div>
  );
}