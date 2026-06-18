'use client';

import { useState, useEffect, useCallback, useMemo, JSX } from 'react';
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
import {
  RefreshCw,
  BarChart3,
  TrendingUp,
  Calendar as CalendarIcon,
  Eye,
  EyeOff,
  RotateCcw,
  Wallet,
  PieChart,
  Target,
  Clock,
  User,
  Building,
  TrendingDown,
  DollarSign,
  CalendarDays,
  Filter,
  Layers,
  AlertCircle,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// ── Dynamically import charts ──
import dynamic from 'next/dynamic';

const ReusableChart = dynamic(
  () => import('@/components/charts/ReusableChart').then((mod) => mod.ReusableChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[350px] text-gray-400">
        <div className="animate-pulse flex space-x-4">
          <div className="h-12 w-12 bg-gray-700 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    ),
  }
);

// ── Treemap (Recharts) ──
import { Treemap as RechartsTreemap, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

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
  if (num === 0) return 'ETB 0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(num);
}

function formatNumber(value: any): string {
  const num = parseSafeNumber(value);
  return num.toLocaleString();
}

function formatMonthLabel(monthStr: string): string {
  if (!monthStr) return 'Unknown';
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTooltip(dateStr: string): string {
  if (!dateStr) return 'Unknown date';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Helper for localStorage ──
function getStorageKey(baseKey: string) {
  return `chart_controls_${baseKey}`;
}

// ── Get status config ──
function getStatusConfig(percent: number): { status: 'green' | 'yellow' | 'red'; icon: JSX.Element; label: string; color: string } {
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

// ── Status Badge ──
function StatusBadge({ percent }: { percent: number }) {
  const config = getStatusConfig(percent);
  return (
    <Badge className={`${config.color} border px-3 py-1 text-xs font-medium flex items-center gap-1`}>
      {config.icon}
      {config.label}
    </Badge>
  );
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
        {data.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center h-[350px] text-gray-400"
          >
            No data available for this period
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
      <div className="mt-2 text-xs text-gray-500 text-right">
        {visibleKeys.length} series visible
      </div>
    </motion.div>
  );
}

// ── Custom Treemap Component ──
function ExpenseTreemap({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="h-[350px] flex items-center justify-center text-gray-400">No category data</div>;
  }

  const treemapData = data.map((item) => ({
    name: item.name || 'Uncategorized',
    size: item.value || 0,
    parent: item.parent || null,
  }));

  const buildTree = (items: any[], parentId: string | null): any[] => {
    return items
      .filter((item) => item.parent === parentId)
      .map((item) => ({
        name: item.name,
        size: item.size,
        children: buildTree(items, item.name),
      }));
  };

  const tree = buildTree(treemapData, null);
  const finalData = tree.length > 0 ? tree : treemapData.map((d) => ({ name: d.name, size: d.size }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <RechartsTreemap
        data={finalData}
        dataKey="size"
        nameKey="name"
        stroke="#fff"
        fill="#3B82F6"
        content={<CustomizedTreemapContent />}
      >
        <RechartsTooltip
          formatter={(value: any) => formatCurrency(value)}
          contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }}
          labelStyle={{ color: '#94a3b8' }}
        />
      </RechartsTreemap>
    </ResponsiveContainer>
  );
}

const CustomizedTreemapContent = (props: any) => {
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

// ── Budget Progress Bars ──
function BudgetProgress({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="h-[350px] flex items-center justify-center text-gray-400">No active budgets</div>;
  }

  return (
    <div className="space-y-4">
      {data.map((plan) => {
        const progress = Math.min(plan.progress, 100);
        const isCompleted = plan.status === 'completed' || progress >= 100;
        const isOver = plan.progress > 100;
        const barColor = isOver ? 'bg-red-500' : isCompleted ? 'bg-emerald-500' : 'bg-blue-500';
        const labelColor = isOver ? 'text-red-400' : isCompleted ? 'text-emerald-400' : 'text-blue-400';
        return (
          <div key={plan.id} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">{plan.title}</span>
              <span className={labelColor}>
                {formatCurrency(plan.currentAllocatedAmount)} / {formatCurrency(plan.targetAmount)}
                <span className="ml-2 text-xs">
                  ({progress.toFixed(0)}%)
                </span>
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div
                className={`h-full ${barColor}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Monthly Calendar Heatmap ──
function CalendarHeatmap({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="h-[350px] flex items-center justify-center text-gray-400">No heatmap data</div>;
  }

  const weeks: any[] = [];
  let currentWeek: any[] = [];
  data.forEach((day, index) => {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay(); // 0=Sun
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
    if (index === data.length - 1) {
      weeks.push(currentWeek);
    }
  });

  if (weeks.length > 0 && weeks[0].length < 7) {
    const firstDay = new Date(data[0].date).getDay();
    for (let i = 0; i < firstDay; i++) {
      weeks[0].unshift({ date: '', total: 0, notes: [] });
    }
  }
  if (weeks.length > 0) {
    const lastWeek = weeks[weeks.length - 1];
    while (lastWeek.length < 7) {
      lastWeek.push({ date: '', total: 0, notes: [] });
    }
  }

  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-800';
    if (value < 500) return 'bg-emerald-900/40';
    if (value < 1000) return 'bg-emerald-700/60';
    if (value < 2000) return 'bg-emerald-500/80';
    return 'bg-emerald-400';
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-xs text-gray-500 text-center py-1">
              {day}
            </div>
          ))}
          {weeks.flat().map((day, idx) => (
            <TooltipProvider key={idx}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`aspect-square rounded-sm ${getColor(day.total)} transition-colors hover:scale-110 cursor-pointer`}
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
                            {day.notes.slice(0, 3).map((note: string, i: number) => (
                              <div key={i} className="truncate max-w-[200px]">• {note}</div>
                            ))}
                            {day.notes.length > 3 && <div>+{day.notes.length - 3} more</div>}
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
    </div>
  );
}

// ── Yearly Heatmap (GitHub style) ──
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

// ── Main Page ──
export default function ExpenseAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  // Data states
  const [overview, setOverview] = useState<any>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<any[]>([]);
  const [categoryTreemap, setCategoryTreemap] = useState<any[]>([]);
  const [budgetProgress, setBudgetProgress] = useState<any[]>([]);
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [paymentType, setPaymentType] = useState<any[]>([]);
  const [personalVsBusiness, setPersonalVsBusiness] = useState<any[]>([]);
  const [burnRate, setBurnRate] = useState<any[]>([]);
  const [runway, setRunway] = useState<any>(null);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [dailyNetProfit, setDailyNetProfit] = useState<any[]>([]);
  const [cumulativeProfit, setCumulativeProfit] = useState<any[]>([]);
  const [weeklyAggregates, setWeeklyAggregates] = useState<any[]>([]);
  const [categorySpending, setCategorySpending] = useState<any[]>([]);
  const [referenceTypeSummary, setReferenceTypeSummary] = useState<any[]>([]);
  const [yearlyHeatmap, setYearlyHeatmap] = useState<any[]>([]);
  const [profitMargin, setProfitMargin] = useState<any>(null);
  // ── New personal usage states ──
  const [personalUsageSummary, setPersonalUsageSummary] = useState<any[]>([]);
  const [personalUsageTotal, setPersonalUsageTotal] = useState<any>(null);

  // ── Fetch all data ──
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        overviewRes,
        trendRes,
        breakdownRes,
        treemapRes,
        budgetRes,
        cashFlowRes,
        paymentRes,
        personalRes,
        burnRes,
        runwayRes,
        heatmapRes,
        dailyProfitRes,
        cumulativeRes,
        weeklyRes,
        categorySpendRes,
        refTypeRes,
        yearlyHeatmapRes,
        profitMarginRes,
        personalUsageSummaryRes,
        personalUsageTotalRes,
      ] = await Promise.all([
        api.get('/analytics/expense/overview'),
        api.get('/analytics/expense/monthly-trend'),
        api.get('/analytics/expense/expense-breakdown'),
        api.get('/analytics/expense/category-treemap'),
        api.get('/analytics/expense/budget-progress'),
        api.get('/analytics/expense/cash-flow'),
        api.get('/analytics/expense/payment-type'),
        api.get('/analytics/expense/personal-vs-business'),
        api.get('/analytics/expense/burn-rate'),
        api.get('/analytics/expense/runway'),
        api.get('/analytics/expense/heatmap'),
        api.get('/analytics/expense/daily-net-profit'),
        api.get('/analytics/expense/cumulative-profit'),
        api.get('/analytics/expense/weekly-aggregates'),
        api.get('/analytics/expense/category-spending'),
        api.get('/analytics/expense/reference-type-summary'),
        api.get('/analytics/expense/yearly-heatmap'),
        api.get('/analytics/expense/profit-margin'),
        api.get('/analytics/expense/personal-usage-summary'),
        api.get('/analytics/expense/personal-usage-total'),
      ]);

      setOverview(overviewRes.data?.data);
      setMonthlyTrend(trendRes.data?.data ?? []);
      setExpenseBreakdown(breakdownRes.data?.data ?? []);
      setCategoryTreemap(treemapRes.data?.data ?? []);
      setBudgetProgress(budgetRes.data?.data ?? []);
      setCashFlow(cashFlowRes.data?.data ?? []);
      setPaymentType(paymentRes.data?.data ?? []);
      setPersonalVsBusiness(personalRes.data?.data ?? []);
      setBurnRate(burnRes.data?.data ?? []);
      setRunway(runwayRes.data?.data);
      setHeatmap(heatmapRes.data?.data ?? []);
      setDailyNetProfit(dailyProfitRes.data?.data ?? []);
      setCumulativeProfit(cumulativeRes.data?.data ?? []);
      setWeeklyAggregates(weeklyRes.data?.data ?? []);
      setCategorySpending(categorySpendRes.data?.data ?? []);
      setReferenceTypeSummary(refTypeRes.data?.data ?? []);
      setYearlyHeatmap(yearlyHeatmapRes.data?.data ?? []);
      setProfitMargin(profitMarginRes.data?.data);
      setPersonalUsageSummary(personalUsageSummaryRes.data?.data ?? []);
      setPersonalUsageTotal(personalUsageTotalRes.data?.data);
    } catch (err: any) {
      console.error('Expense analytics fetch error:', err);
      setError(err.message || 'Failed to load expense analytics');
      toast.error(err.message || 'Failed to load expense analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── Extract available years ──
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    monthlyTrend.forEach((item) => {
      if (item.month) {
        const year = parseInt(item.month.split('-')[0]);
        if (!isNaN(year)) years.add(year);
      }
    });
    dailyNetProfit.forEach((item) => {
      if (item.day) {
        const year = new Date(item.day).getFullYear();
        if (!isNaN(year)) years.add(year);
      }
    });
    const currentYear = new Date().getFullYear();
    if (!years.has(currentYear)) years.add(currentYear);
    return Array.from(years).sort();
  }, [monthlyTrend, dailyNetProfit]);

  // ── Filter functions ──
  const filterByYear = (data: any[], dateKey: string, year: number | 'all') => {
    if (year === 'all') return data;
    return data.filter((item) => {
      const dateStr = item[dateKey];
      if (!dateStr) return false;
      const itemYear = new Date(dateStr).getFullYear();
      return itemYear === year;
    });
  };

  // ── Transform functions ──
  const transformMonthlyTrend = (data: any[]) => {
    const filtered = filterByYear(data, 'month', selectedYear);
    return filtered.map((item) => ({
      month: formatMonthLabel(item.month),
      revenue: parseSafeNumber(item.revenue),
      totalCost: parseSafeNumber(item.totalCost),
      netProfit: parseSafeNumber(item.netProfit),
    }));
  };

  const transformExpenseBreakdown = (data: any[]) => {
    const filtered = filterByYear(data, 'month', selectedYear);
    return filtered.map((item) => ({
      month: formatMonthLabel(item.month),
      stock: parseSafeNumber(item.stock),
      personal: parseSafeNumber(item.personal),
      recurring: parseSafeNumber(item.recurring),
      general: parseSafeNumber(item.general),
      plan: parseSafeNumber(item.plan),
    }));
  };

  const transformCashFlow = (data: any[]) => {
    const filtered = filterByYear(data, 'month', selectedYear);
    return filtered.map((item) => ({
      month: formatMonthLabel(item.month),
      paid: parseSafeNumber(item.paid),
      pending: parseSafeNumber(item.pending),
    }));
  };

  const transformPersonalVsBusiness = (data: any[]) => {
    const filtered = filterByYear(data, 'month', selectedYear);
    return filtered.map((item) => ({
      month: formatMonthLabel(item.month),
      personal: parseSafeNumber(item.personal),
      business: parseSafeNumber(item.business),
    }));
  };

  const transformBurnRate = (data: any[]) => {
    const filtered = filterByYear(data, 'month', selectedYear);
    return filtered.map((item) => ({
      month: formatMonthLabel(item.month),
      fixed: parseSafeNumber(item.fixed),
      variable: parseSafeNumber(item.variable),
    }));
  };

  const transformDailyNetProfit = (data: any[]) => {
    const filtered = filterByYear(data, 'day', selectedYear);
    return filtered.map((item) => ({
      day: formatDateLabel(item.day),
      revenue: parseSafeNumber(item.revenue),
      expenses: parseSafeNumber(item.expenses),
      netProfit: parseSafeNumber(item.netProfit),
    }));
  };

  const transformCumulativeProfit = (data: any[]) => {
    const filtered = filterByYear(data, 'day', selectedYear);
    return filtered.map((item) => ({
      day: formatDateLabel(item.day),
      cumulativeProfit: parseSafeNumber(item.cumulativeProfit),
    }));
  };

  const transformWeeklyAggregates = (data: any[]) => {
    const filtered = data.filter((item) => {
      if (selectedYear === 'all') return true;
      const weekStr = item.week;
      if (!weekStr) return false;
      const year = parseInt(weekStr.substring(0, 4));
      return year === selectedYear;
    });
    return filtered.map((item) => ({
      week: `Week ${item.week.substring(4)}`,
      revenue: parseSafeNumber(item.revenue),
      expenses: parseSafeNumber(item.expenses),
      netProfit: parseSafeNumber(item.netProfit),
      expenseRatio: parseSafeNumber(item.expenseRatio),
    }));
  };

  const transformCategorySpending = (data: any[]) => {
    return data.map((item) => ({
      name: item.categoryName,
      value: parseSafeNumber(item.total),
    }));
  };

  const transformReferenceTypeSummary = (data: any[]) => {
    return data.map((item) => ({
      name: item.referenceType.charAt(0).toUpperCase() + item.referenceType.slice(1),
      value: parseSafeNumber(item.total),
    }));
  };

  // ── KPI values ──
  const totalProfit = overview?.totalProfit || 0;
  const pendingInvoices = overview?.pendingInvoices || 0;
  const activePlans = overview?.activePlans || 0;
  const expensesThisMonth = overview?.expensesThisMonth || 0;
  const revenueThisMonth = overview?.revenueThisMonth || 0;
  const profitThisMonth = overview?.profitThisMonth || 0;

  // ── Personal Usage helpers ──
  const personalUsageTotalConfig = personalUsageTotal
    ? getStatusConfig(personalUsageTotal.personalUsagePercent)
    : null;

  // ── Loading / Error ──
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl overflow-x-hidden">
        <div className="space-y-8">
          <Skeleton className="h-12 w-64 bg-white/10" />
          <div className="grid gap-6 md:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
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
      {/* Header with Year Selector */}
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
            <Wallet className="h-4 w-4" /> Track spending, budgets, and financial health
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedYear === 'all' ? 'all' : String(selectedYear)}
            onValueChange={(val) => setSelectedYear(val === 'all' ? 'all' : parseInt(val))}
          >
            <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={fetchAllData}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white flex-shrink-0"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards (including Personal Usage) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 md:grid-cols-3 lg:grid-cols-7 mb-12 w-full max-w-full"
      >
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(totalProfit)}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Pending Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{formatCurrency(pendingInvoices)}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{activePlans}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Expenses This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{formatCurrency(expensesThisMonth)}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Revenue This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(revenueThisMonth)}</div>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Profit This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitThisMonth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(profitThisMonth)}
            </div>
          </CardContent>
        </Card>
        {/* Personal Usage KPI Card */}
        <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Personal Usage (All-time)</CardTitle>
          </CardHeader>
          <CardContent>
            {personalUsageTotal ? (
              <>
                <div className={`text-2xl font-bold ${personalUsageTotal.personalUsagePercent <= 30 ? 'text-emerald-400' : personalUsageTotal.personalUsagePercent <= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {personalUsageTotal.personalUsagePercent.toFixed(1)}%
                </div>
                <StatusBadge percent={personalUsageTotal.personalUsagePercent} />
              </>
            ) : (
              <div className="text-gray-400">No data</div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Profit Margin Summary (global) */}
      {profitMargin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6 md:grid-cols-4 mb-12 w-full max-w-full"
        >
          <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{formatCurrency(profitMargin.totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{formatCurrency(profitMargin.totalExpenses)}</div>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Net Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{formatCurrency(profitMargin.netProfit)}</div>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Profit Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${profitMargin.profitMargin > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {profitMargin.profitMargin.toFixed(1)}%
              </div>
              <p className="text-xs text-slate-500">Expense Ratio: {profitMargin.expenseRatio.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="mb-8 w-full max-w-full">
        <TabsList className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-1 rounded-xl w-full max-w-full overflow-x-auto flex-nowrap">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-lg text-slate-300 flex-shrink-0"
          >
            <BarChart3 className="mr-2 h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger
            value="budgeting"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg text-slate-300 flex-shrink-0"
          >
            <Target className="mr-2 h-4 w-4" /> Budgeting
          </TabsTrigger>
          <TabsTrigger
            value="cashflow"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white rounded-lg text-slate-300 flex-shrink-0"
          >
            <Wallet className="mr-2 h-4 w-4" /> Cash Flow
          </TabsTrigger>
          <TabsTrigger
            value="category"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg text-slate-300 flex-shrink-0"
          >
            <PieChart className="mr-2 h-4 w-4" /> Category
          </TabsTrigger>
          <TabsTrigger
            value="personal-vs-business"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-red-500 data-[state=active]:text-white rounded-lg text-slate-300 flex-shrink-0"
          >
            <User className="mr-2 h-4 w-4" /> Personal vs Biz
          </TabsTrigger>
          <TabsTrigger
            value="heatmap"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-lg text-slate-300 flex-shrink-0"
          >
            <CalendarIcon className="mr-2 h-4 w-4" /> Heatmap
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-fuchsia-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg text-slate-300 flex-shrink-0"
          >
            <TrendingUp className="mr-2 h-4 w-4" /> Advanced
          </TabsTrigger>
          {/* New Personal Usage Tab */}
          <TabsTrigger
            value="personal-usage"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white rounded-lg text-slate-300 flex-shrink-0"
          >
            <User className="mr-2 h-4 w-4" /> Personal Usage
          </TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ── */}
        <TabsContent value="overview" className="mt-6 space-y-8 w-full max-w-full">
          <div className="grid gap-8 lg:grid-cols-2 w-full max-w-full">
            <ChartWithControls
              title="Monthly Trend"
              data={transformMonthlyTrend(monthlyTrend)}
              availableKeys={[
                { key: 'revenue', label: 'Revenue', color: '#10B981' },
                { key: 'totalCost', label: 'Total Cost', color: '#EF4444' },
                { key: 'netProfit', label: 'Net Profit', color: '#8B5CF6' },
              ]}
              defaultVisibleKeys={['revenue', 'totalCost', 'netProfit']}
              defaultChartType="line"
              storageKey="expense_monthly_trend"
              xAxisTickFormatter={(v) => v}
            />

            <ChartWithControls
              title="Expense Breakdown by Reference Type"
              data={transformExpenseBreakdown(expenseBreakdown)}
              availableKeys={[
                { key: 'stock', label: 'Stock', color: '#3B82F6' },
                { key: 'personal', label: 'Personal', color: '#EC4899' },
                { key: 'recurring', label: 'Recurring', color: '#F59E0B' },
                { key: 'general', label: 'General', color: '#10B981' },
                { key: 'plan', label: 'Plan', color: '#8B5CF6' },
              ]}
              defaultVisibleKeys={['stock', 'recurring', 'general', 'personal', 'plan']}
              defaultChartType="stacked"
              storageKey="expense_breakdown"
              xAxisTickFormatter={(v) => v}
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-2 w-full max-w-full">
            <ChartWithControls
              title="Burn Rate (Fixed vs Variable)"
              data={transformBurnRate(burnRate)}
              availableKeys={[
                { key: 'fixed', label: 'Fixed (Recurring)', color: '#EF4444' },
                { key: 'variable', label: 'Variable', color: '#3B82F6' },
              ]}
              defaultVisibleKeys={['fixed', 'variable']}
              defaultChartType="area"
              storageKey="expense_burn_rate"
              xAxisTickFormatter={(v) => v}
            />

            <ChartWithControls
              title="Runway Projection (Next 3 Months)"
              data={runway?.projection?.map((p: any) => ({
                month: formatMonthLabel(p.month),
                projectedBalance: parseSafeNumber(p.projectedBalance),
              })) || []}
              availableKeys={[{ key: 'projectedBalance', label: 'Projected Balance', color: '#10B981' }]}
              defaultVisibleKeys={['projectedBalance']}
              defaultChartType="area"
              storageKey="expense_runway"
              xAxisTickFormatter={(v) => v}
            />
          </div>
        </TabsContent>

        {/* ── BUDGETING TAB ── */}
        <TabsContent value="budgeting" className="mt-6 w-full max-w-full">
          <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-400" /> Active Budget Plans Progress
            </h3>
            <BudgetProgress data={budgetProgress} />
          </Card>
        </TabsContent>

        {/* ── CASH FLOW TAB ── */}
        <TabsContent value="cashflow" className="mt-6 space-y-8 w-full max-w-full">
          <div className="grid gap-8 lg:grid-cols-2 w-full max-w-full">
            <ChartWithControls
              title="Cash Flow (Paid vs Pending)"
              data={transformCashFlow(cashFlow)}
              availableKeys={[
                { key: 'paid', label: 'Paid', color: '#10B981' },
                { key: 'pending', label: 'Pending', color: '#F59E0B' },
              ]}
              defaultVisibleKeys={['paid', 'pending']}
              defaultChartType="bar"
              storageKey="expense_cash_flow"
              xAxisTickFormatter={(v) => v}
            />

            <ChartWithControls
              title="Payment Type Distribution"
              data={paymentType}
              availableKeys={[{ key: 'value', label: 'Amount', color: '#3B82F6' }]}
              defaultVisibleKeys={['value']}
              defaultChartType="pie"
              storageKey="expense_payment_type"
              tooltipLabelFormatter={(label) => {
                const item = paymentType.find((d) => d.name === label);
                return item ? `${label}: ${formatCurrency(item.value)}` : label;
              }}
            />
          </div>
        </TabsContent>

        {/* ── CATEGORY TAB ── */}
        <TabsContent value="category" className="mt-6 space-y-8 w-full max-w-full">
          <div className="grid gap-8 lg:grid-cols-2 w-full max-w-full">
            <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-400" /> Expense Category Treemap
              </h3>
              <ExpenseTreemap data={categoryTreemap} />
            </Card>

            <ChartWithControls
              title="Category Spending (Flat)"
              data={transformCategorySpending(categorySpending)}
              availableKeys={[{ key: 'value', label: 'Spent', color: '#8B5CF6' }]}
              defaultVisibleKeys={['value']}
              defaultChartType="bar"
              storageKey="expense_category_spending"
              tooltipLabelFormatter={(label) => {
                const item = categorySpending.find((d) => d.categoryName === label);
                return item ? `${label}: ${formatCurrency(item.total)}` : label;
              }}
            />
          </div>
        </TabsContent>

        {/* ── PERSONAL VS BUSINESS TAB ── */}
        <TabsContent value="personal-vs-business" className="mt-6 w-full max-w-full">
          <div className="grid gap-8 lg:grid-cols-1 w-full max-w-full">
            <ChartWithControls
              title="Personal vs Business Expenses"
              data={transformPersonalVsBusiness(personalVsBusiness)}
              availableKeys={[
                { key: 'personal', label: 'Personal (Owner Draw)', color: '#EC4899' },
                { key: 'business', label: 'Business', color: '#3B82F6' },
              ]}
              defaultVisibleKeys={['personal', 'business']}
              defaultChartType="bar"
              storageKey="expense_personal_vs_business"
              xAxisTickFormatter={(v) => v}
            />
          </div>
        </TabsContent>

        {/* ── HEATMAP TAB ── */}
        <TabsContent value="heatmap" className="mt-6 space-y-8 w-full max-w-full">
          <div className="grid gap-8 lg:grid-cols-2 w-full max-w-full">
            <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-indigo-400" /> Monthly Expense Heatmap
              </h3>
              <CalendarHeatmap data={heatmap} />
            </Card>

            <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-cyan-400" /> Yearly Expense Heatmap (GitHub Style)
              </h3>
              <YearlyHeatmap data={yearlyHeatmap} />
            </Card>
          </div>
        </TabsContent>

        {/* ── ADVANCED TAB ── */}
        <TabsContent value="advanced" className="mt-6 space-y-8 w-full max-w-full">
          <div className="grid gap-8 lg:grid-cols-2 w-full max-w-full">
            <ChartWithControls
              title="Daily Net Profit"
              data={transformDailyNetProfit(dailyNetProfit)}
              availableKeys={[
                { key: 'revenue', label: 'Revenue', color: '#10B981' },
                { key: 'expenses', label: 'Expenses', color: '#EF4444' },
                { key: 'netProfit', label: 'Net Profit', color: '#8B5CF6' },
              ]}
              defaultVisibleKeys={['revenue', 'expenses', 'netProfit']}
              defaultChartType="line"
              storageKey="expense_daily_net_profit"
              xAxisTickFormatter={(v) => v}
              tooltipLabelFormatter={(label) => {
                const item = dailyNetProfit.find((d) => formatDateLabel(d.day) === label);
                return item ? `📅 ${formatDateTooltip(item.day)}\nRevenue: ${formatCurrency(item.revenue)}\nExpenses: ${formatCurrency(item.expenses)}\nNet: ${formatCurrency(item.netProfit)}` : label;
              }}
            />

            <ChartWithControls
              title="Cumulative Profit"
              data={transformCumulativeProfit(cumulativeProfit)}
              availableKeys={[{ key: 'cumulativeProfit', label: 'Cumulative Profit', color: '#10B981' }]}
              defaultVisibleKeys={['cumulativeProfit']}
              defaultChartType="area"
              storageKey="expense_cumulative_profit"
              xAxisTickFormatter={(v) => v}
              tooltipLabelFormatter={(label) => {
                const item = cumulativeProfit.find((d) => formatDateLabel(d.day) === label);
                return item ? `📅 ${formatDateTooltip(item.day)}\nCumulative: ${formatCurrency(item.cumulativeProfit)}` : label;
              }}
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-2 w-full max-w-full">
            <ChartWithControls
              title="Weekly Aggregates (Revenue, Expenses, Net Profit)"
              data={transformWeeklyAggregates(weeklyAggregates)}
              availableKeys={[
                { key: 'revenue', label: 'Revenue', color: '#10B981' },
                { key: 'expenses', label: 'Expenses', color: '#EF4444' },
                { key: 'netProfit', label: 'Net Profit', color: '#8B5CF6' },
                { key: 'expenseRatio', label: 'Expense Ratio %', color: '#F59E0B' },
              ]}
              defaultVisibleKeys={['revenue', 'expenses', 'netProfit']}
              defaultChartType="bar"
              storageKey="expense_weekly_aggregates"
              xAxisTickFormatter={(v) => v}
            />

            <ChartWithControls
              title="Reference Type Summary"
              data={transformReferenceTypeSummary(referenceTypeSummary)}
              availableKeys={[{ key: 'value', label: 'Amount', color: '#8B5CF6' }]}
              defaultVisibleKeys={['value']}
              defaultChartType="pie"
              storageKey="expense_reference_type_summary"
              tooltipLabelFormatter={(label) => {
                const item = referenceTypeSummary.find((d) => d.name === label);
                return item ? `${label}: ${formatCurrency(item.value)}` : label;
              }}
            />
          </div>
        </TabsContent>

        {/* ── PERSONAL USAGE TAB ── */}
        <TabsContent value="personal-usage" className="mt-6 w-full max-w-full">
          <div className="space-y-8 w-full max-w-full">
            {/* Summary Cards */}
            {personalUsageTotal && (
              <div className="grid gap-6 md:grid-cols-5 w-full max-w-full">
                <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(personalUsageTotal.totalRevenue)}</div>
                  </CardContent>
                </Card>
                <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Business Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-400">{formatCurrency(personalUsageTotal.businessExpenses)}</div>
                  </CardContent>
                </Card>
                <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Personal Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-400">{formatCurrency(personalUsageTotal.personalExpenses)}</div>
                  </CardContent>
                </Card>
                <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Net Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-400">{formatCurrency(personalUsageTotal.profit)}</div>
                  </CardContent>
                </Card>
                <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 w-full max-w-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Personal Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${personalUsageTotal.personalUsagePercent <= 30 ? 'text-emerald-400' : personalUsageTotal.personalUsagePercent <= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {personalUsageTotal.personalUsagePercent.toFixed(1)}%
                    </div>
                    <StatusBadge percent={personalUsageTotal.personalUsagePercent} />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Monthly Table and Chart */}
            <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 p-6 w-full max-w-full">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-cyan-400" /> Monthly Personal Usage Breakdown
              </h3>
              {personalUsageSummary.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-slate-300">Month</TableHead>
                          <TableHead className="text-slate-300 text-right">Revenue</TableHead>
                          <TableHead className="text-slate-300 text-right">Business Expenses</TableHead>
                          <TableHead className="text-slate-300 text-right">Personal Expenses</TableHead>
                          <TableHead className="text-slate-300 text-right">Profit</TableHead>
                          <TableHead className="text-slate-300 text-right">Personal Usage %</TableHead>
                          <TableHead className="text-slate-300 text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {personalUsageSummary.map((row) => (
                          <TableRow key={row.month} className="border-slate-700/50 hover:bg-white/5">
                            <TableCell className="font-medium text-white">{formatMonthLabel(row.month)}</TableCell>
                            <TableCell className="text-right text-emerald-400">{formatCurrency(row.revenue)}</TableCell>
                            <TableCell className="text-right text-red-400">{formatCurrency(row.businessExpenses)}</TableCell>
                            <TableCell className="text-right text-yellow-400">{formatCurrency(row.personalExpenses)}</TableCell>
                            <TableCell className="text-right text-emerald-400">{formatCurrency(row.profit)}</TableCell>
                            <TableCell className={`text-right font-bold ${row.personalUsagePercent <= 30 ? 'text-emerald-400' : row.personalUsagePercent <= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {row.personalUsagePercent.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-center">
                              <StatusBadge percent={row.personalUsagePercent} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Chart: Personal Usage % over months */}
                  <div className="mt-8">
                    <ChartWithControls
                      title="Personal Usage % Trend"
                      data={personalUsageSummary.map((row) => ({
                        month: formatMonthLabel(row.month),
                        personalUsagePercent: parseSafeNumber(row.personalUsagePercent),
                      }))}
                      availableKeys={[
                        { key: 'personalUsagePercent', label: 'Personal Usage %', color: '#8B5CF6' },
                      ]}
                      defaultVisibleKeys={['personalUsagePercent']}
                      defaultChartType="bar"
                      storageKey="expense_personal_usage_trend"
                      xAxisTickFormatter={(v) => v}
                      tooltipLabelFormatter={(label) => {
                        const item = personalUsageSummary.find((d) => formatMonthLabel(d.month) === label);
                        return item ? `${label}\nUsage: ${item.personalUsagePercent.toFixed(1)}%` : label;
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-gray-400">
                  No personal usage data available
                </div>
              )}
            </Card>

            {/* Legend / Info */}
            <Card className="backdrop-blur-xl bg-slate-900/40 border-slate-800 p-6">
              <h4 className="text-white font-semibold mb-2">Status Legend</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Green (0-30%)</div>
                    <div className="text-xs text-gray-400">Healthy – business is growing</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-yellow-400">
                  <AlertCircle className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Yellow (31-50%)</div>
                    <div className="text-xs text-gray-400">Caution – monitor spending</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-red-400">
                  <Circle className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Red (&gt;50%)</div>
                    <div className="text-xs text-gray-400">Warning – too much withdrawn</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}