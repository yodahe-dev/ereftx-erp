'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Package,
  Box,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Zap,
  Save,
  RotateCcw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ReusableChart } from '@/components/charts/ReusableChart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ==================== STRICT TYPES ====================
interface ActionFrequency {
  restock: number;
  sale: number;
  adjust: number;
  exchange: number;
  initial: number;
}

interface TimelineEntry {
  date: string;
  boxChange: number;
  singleChange: number;
  boxCumulative: number;
  singleCumulative: number;
}

interface SalesSummary {
  totalBoxesSold: number;
  totalSinglesSold: number;
}

interface RestockDetail {
  date: string;
  boxChange: number;
  singleChange: number;
  cumulativeBoxes: number;
  cumulativeSingles: number;
}

interface SalesVelocityDay {
  date: string;
  boxesSold: number;
  singlesSold: number;
  totalUnits: number;
}

interface SalesVelocity {
  data: SalesVelocityDay[];
  average: number;
  fastDays: string[];
  slowDays: string[];
  fastCount: number;
  slowCount: number;
}

interface CurrentStock {
  boxQuantity: number;
  singleQuantity: number;
  containerType: string | null;
}

interface StockLevelEntry {
  date: string;
  boxes: number;
  singles: number;
}

interface FullProductAnalytics {
  productId: string;
  productName: string | null;
  frequency: ActionFrequency;
  timeline: TimelineEntry[];
  sales: SalesSummary;
  restockDetails: RestockDetail[];
  salesVelocity: SalesVelocity;
  currentStock: CurrentStock;
  stockLevelHistory: StockLevelEntry[];
}

type ChartType = 'bar' | 'line' | 'area' | 'stacked' | 'pie';
type ViewMode = 'boxes' | 'singles' | 'both';

// ==================== ROBUST DATE FORMATTERS ====================
function parseDateSafe(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateLabel(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Unknown';
  const d = parseDateSafe(dateStr);
  if (!d) return dateStr; // fallback to the original string if it's not a valid date
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateTooltip(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Unknown date';
  const d = parseDateSafe(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateFull(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Unknown';
  const d = parseDateSafe(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// ==================== CUSTOM HOOK FOR CHART TYPE ====================
function useChartType(storageKey: string, defaultType: ChartType = 'bar') {
  const [chartType, setChartType] = useState<ChartType>(defaultType);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved && ['bar', 'line', 'area', 'stacked', 'pie'].includes(saved)) {
      setChartType(saved as ChartType);
      setIsDefault(true);
    }
  }, [storageKey]);

  const updateChartType = (newType: ChartType) => {
    setChartType(newType);
    localStorage.setItem(storageKey, newType);
    setIsDefault(true);
  };

  const setAsDefault = () => {
    localStorage.setItem(storageKey, chartType);
    setIsDefault(true);
    toast.success('Chart type saved as default');
  };

  const resetToDefault = () => {
    localStorage.removeItem(storageKey);
    setChartType(defaultType);
    setIsDefault(false);
    toast.info('Reset to default chart type');
  };

  return { chartType, updateChartType, setAsDefault, resetToDefault, isDefault };
}

// ==================== CUSTOM HOOK FOR VIEW MODE ====================
function useViewMode(storageKey: string, defaultMode: ViewMode = 'both') {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultMode);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved && ['boxes', 'singles', 'both'].includes(saved)) {
      setViewMode(saved as ViewMode);
    }
  }, [storageKey]);

  const updateViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(storageKey, mode);
  };

  return { viewMode, updateViewMode };
}

// ==================== CUSTOM HOOK FOR FULLSCREEN ====================
function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [height, setHeight] = useState(400);
  const ref = useRef<HTMLDivElement>(null);

  const toggleFullscreen = async () => {
    if (!ref.current) return;
    if (!document.fullscreenElement) {
      await ref.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (fs) {
        setHeight(window.innerHeight - 160);
      } else {
        setHeight(400);
      }
    };
    const handleResize = () => {
      if (isFullscreen) {
        setHeight(window.innerHeight - 160);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [isFullscreen]);

  return { ref, isFullscreen, height, toggleFullscreen };
}

// ==================== SKELETON ====================
function ProductDetailSkeleton() {
  return (
    <div className="w-full space-y-8">
      <Skeleton className="h-10 w-40 bg-white/10" />
      <div className="grid gap-6 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl bg-white/10" />
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="h-[400px] rounded-2xl bg-white/10" />
        <Skeleton className="h-[400px] rounded-2xl bg-white/10" />
      </div>
      <Skeleton className="h-64 rounded-2xl bg-white/10" />
      <div className="grid gap-8 lg:grid-cols-2">
        <Skeleton className="h-[400px] rounded-2xl bg-white/10" />
        <Skeleton className="h-[400px] rounded-2xl bg-white/10" />
      </div>
    </div>
  );
}

// ==================== KPI CARD ====================
function KpiCard({
  label,
  value,
  icon,
  color,
  prefix = '',
  suffix = '',
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  prefix?: string;
  suffix?: string;
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
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300" />
      <div className="relative backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-5 hover:border-white/20 transition-all duration-300">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">{label}</p>
            <p className="text-3xl font-bold" style={{ color }}>
              {prefix}
              {count.toLocaleString()}
              {suffix}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-white/5" style={{ color }}>
            {icon}
          </div>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ color }}
        />
      </div>
    </motion.div>
  );
}

// ==================== CHART WRAPPER WITH CONTROLS & FULLSCREEN ====================
function ChartWithControls({
  title,
  data,
  dataKey,
  secondaryDataKey,
  defaultChartType,
  storageKeyPrefix,
  colorStart,
  colorEnd,
  height: initialHeight = 350,
  enableViewToggle = false,
}: {
  title: string;
  data: any[];
  dataKey: string;
  secondaryDataKey?: string;
  defaultChartType: ChartType;
  storageKeyPrefix: string;
  colorStart?: string;
  colorEnd?: string;
  height?: number;
  enableViewToggle?: boolean;
}) {
  const { chartType, updateChartType, setAsDefault, resetToDefault, isDefault } = useChartType(
    `${storageKeyPrefix}_${title}`,
    defaultChartType
  );
  const { ref, isFullscreen, height: fsHeight, toggleFullscreen } = useFullscreen();

  const { viewMode, updateViewMode } = useViewMode(
    `${storageKeyPrefix}_${title}_view`,
    'both'
  );

  let effectiveDataKey = dataKey;
  let effectiveSecondaryDataKey = secondaryDataKey;
  if (enableViewToggle) {
    if (viewMode === 'boxes') {
      effectiveDataKey = dataKey;
      effectiveSecondaryDataKey = undefined;
    } else if (viewMode === 'singles') {
      effectiveDataKey = secondaryDataKey || dataKey;
      effectiveSecondaryDataKey = undefined;
    } else {
      effectiveDataKey = dataKey;
      effectiveSecondaryDataKey = secondaryDataKey;
    }
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

  if (!data || data.length === 0) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
        </div>
        <div className="flex items-center justify-center h-[350px] text-gray-400">
          No data available
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ scale: 1.005 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className={`backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 ${
        isFullscreen ? 'fixed inset-0 z-50 bg-black/90 flex items-center justify-center' : ''
      }`}
    >
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {enableViewToggle && (
              <div className="flex bg-white/10 rounded-lg p-0.5 border border-white/10">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateViewMode('boxes')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    viewMode === 'boxes'
                      ? 'bg-blue-500/30 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Boxes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateViewMode('singles')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    viewMode === 'singles'
                      ? 'bg-green-500/30 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Singles
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateViewMode('both')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    viewMode === 'both'
                      ? 'bg-purple-500/30 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Both
                </Button>
              </div>
            )}
            <Select
              value={chartType}
              onValueChange={(v) => updateChartType(v as ChartType)}
            >
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
            <Button
              variant="outline"
              size="sm"
              onClick={setAsDefault}
              className="border-white/20 hover:bg-white/10 text-white"
              title="Save as default chart type"
            >
              <Save className="h-4 w-4" />
            </Button>
            {isDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefault}
                className="border-white/20 hover:bg-white/10 text-white"
                title="Reset to default"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="border-white/20 hover:bg-white/10 text-white"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ReusableChart
            title=""
            data={data}
            dataKey={effectiveDataKey}
            secondaryDataKey={effectiveSecondaryDataKey}
            chartType={chartType}
            colorStart={colorStart || '#3B82F6'}
            colorEnd={colorEnd || '#8B5CF6'}
            height={isFullscreen ? fsHeight : initialHeight}
            xAxisTickFormatter={formatDateLabel}
            tooltipLabelFormatter={formatDateTooltip}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ==================== MAIN PAGE ====================
export default function ProductStockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FullProductAnalytics | null>(null);

  const loadData = async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/analytics/stock/product/${productId}/full`);
      setData(response.data.data);
    } catch (err: any) {
      console.error(err);
      const message = err.response?.data?.message || err.message || 'Failed to load analytics';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [productId]);

  const isValidUUID = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  if (!isValidUUID(productId) && !loading && !error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center overflow-x-hidden">
        <div className="backdrop-blur-xl bg-red-500/10 rounded-2xl border border-red-500/30 p-8 max-w-md mx-auto">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-300 text-lg">Invalid product ID format.</p>
          <Button onClick={() => router.push('/stocks')} className="mt-6">
            Back to Stocks
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl overflow-x-hidden">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center overflow-x-hidden">
        <div className="backdrop-blur-xl bg-red-500/10 rounded-2xl border border-red-500/30 p-8 max-w-md mx-auto">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-300 mb-2">{error}</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button onClick={() => router.push('/stocks')} variant="outline">
              Back to Stocks
            </Button>
            <Button onClick={loadData}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8 text-center overflow-x-hidden">
        <p className="text-gray-400">No data available for this product.</p>
        <Button onClick={() => router.push('/stocks')} className="mt-4">
          Back
        </Button>
      </div>
    );
  }

  const {
    productName,
    frequency = { restock: 0, sale: 0, adjust: 0, exchange: 0, initial: 0 },
    timeline = [],
    sales = { totalBoxesSold: 0, totalSinglesSold: 0 },
    restockDetails = [],
    salesVelocity = { data: [], average: 0, fastDays: [], slowDays: [], fastCount: 0, slowCount: 0 },
    currentStock = { boxQuantity: 0, singleQuantity: 0, containerType: null },
    stockLevelHistory = [],
  } = data;

  // Prepare chart data with formatted dates – using robust formatters
  const frequencyPieData = Object.entries(frequency)
    .filter(([, count]) => count > 0)
    .map(([action, count]) => ({
      name: action.charAt(0).toUpperCase() + action.slice(1),
      value: count,
      color:
        action === 'restock'
          ? '#3B82F6'
          : action === 'sale'
          ? '#10B981'
          : action === 'adjust'
          ? '#F59E0B'
          : action === 'exchange'
          ? '#8B5CF6'
          : '#EC4899',
    }));

  const stockLevelData = stockLevelHistory.map((entry) => ({
    name: formatDateLabel(entry.date),
    fullDate: formatDateFull(entry.date),
    tooltipLabel: formatDateTooltip(entry.date),
    Boxes: entry.boxes,
    Singles: entry.singles,
  }));

  const restockCumulativeData = restockDetails.map((entry) => ({
    name: formatDateLabel(entry.date),
    fullDate: formatDateFull(entry.date),
    tooltipLabel: formatDateTooltip(entry.date),
    Boxes: entry.cumulativeBoxes,
    Singles: entry.cumulativeSingles,
  }));

  const salesVelocityData = salesVelocity.data.map((day) => ({
    name: formatDateLabel(day.date),
    fullDate: formatDateFull(day.date),
    tooltipLabel: formatDateTooltip(day.date),
    Boxes: day.boxesSold,
    Singles: day.singlesSold,
  }));

  const hasSales = sales.totalBoxesSold !== 0 || sales.totalSinglesSold !== 0;
  const totalBoxesSold = Math.abs(sales.totalBoxesSold);
  const totalSinglesSold = Math.abs(sales.totalSinglesSold);
  const totalRestocks = frequency.restock;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={productId}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8 max-w-7xl overflow-x-hidden"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8 flex flex-wrap gap-4 items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {productName || 'Product'}
              </h1>
              <p className="text-gray-400 mt-1">
                Stock history analytics • {timeline.length} recorded events
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={loadData}
            className="border-white/20 hover:bg-white/10 text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-6 md:grid-cols-4 mb-12"
        >
          {[
            { label: 'Restocks', value: totalRestocks, icon: Package, color: '#3B82F6' },
            { label: 'Sales (Boxes)', value: totalBoxesSold, icon: Box, color: '#10B981' },
            { label: 'Sales (Singles)', value: totalSinglesSold, icon: TrendingUp, color: '#8B5CF6' },
            { label: 'Current Boxes', value: currentStock.boxQuantity, icon: Package, color: '#F59E0B' },
          ].map((kpi, idx) => (
            <motion.div key={idx} variants={itemVariants}>
              <KpiCard
                label={kpi.label}
                value={kpi.value}
                icon={<kpi.icon className="h-5 w-5" />}
                color={kpi.color}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Charts with controls */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-8 lg:grid-cols-2"
        >
          <motion.div variants={itemVariants}>
            <ChartWithControls
              title="Action Frequency"
              data={frequencyPieData}
              dataKey="value"
              defaultChartType="pie"
              storageKeyPrefix="product_stock"
              colorStart="#3B82F6"
              colorEnd="#8B5CF6"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <ChartWithControls
              title="Stock Levels Over Time"
              data={stockLevelData}
              dataKey="Boxes"
              secondaryDataKey="Singles"
              defaultChartType="area"
              storageKeyPrefix="product_stock"
              colorStart="#3B82F6"
              colorEnd="#10B981"
              enableViewToggle={true}
            />
          </motion.div>
        </motion.div>

        {/* Cumulative Restocks */}
        {restockCumulativeData.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-12"
          >
            <motion.div variants={itemVariants}>
              <ChartWithControls
                title="Cumulative Restocks"
                data={restockCumulativeData}
                dataKey="Boxes"
                secondaryDataKey="Singles"
                defaultChartType="line"
                storageKeyPrefix="product_stock"
                colorStart="#3B82F6"
                colorEnd="#8B5CF6"
                enableViewToggle={true}
              />
            </motion.div>
          </motion.div>
        )}

        {/* Sales Velocity */}
        {salesVelocityData.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-12 grid gap-8 lg:grid-cols-2"
          >
            <motion.div variants={itemVariants}>
              <ChartWithControls
                title="Daily Sales Volume"
                data={salesVelocityData}
                dataKey="Boxes"
                secondaryDataKey="Singles"
                defaultChartType="bar"
                storageKeyPrefix="product_stock"
                colorStart="#10B981"
                colorEnd="#8B5CF6"
                enableViewToggle={true}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 h-full flex flex-col justify-center">
                <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-400" /> Sales Velocity
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Average daily units</span>
                    <span className="text-white font-bold">{salesVelocity.average.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fast days</span>
                    <span className="text-green-400 font-bold">{salesVelocity.fastCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Slow days</span>
                    <span className="text-red-400 font-bold">{salesVelocity.slowCount}</span>
                  </div>
                  <div className="mt-4 p-3 bg-white/5 rounded-lg">
                    <p className="text-xs text-gray-500">
                      <span className="text-green-400">Fast</span> = days with sales ≥ 80% of average.
                      <br />
                      <span className="text-red-400">Slow</span> = days below that threshold.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Sales Summary Table */}
        {hasSales && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-12 backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 overflow-hidden"
          >
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" /> Sales Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="pb-3 text-gray-400 font-medium">Metric</th>
                    <th className="pb-3 text-gray-400 font-medium text-right">Total Units Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="py-3 text-white">Boxes</td>
                    <td className="py-3 text-right text-emerald-400 font-semibold">
                      {totalBoxesSold.toLocaleString()} boxes
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 text-white">Singles</td>
                    <td className="py-3 text-right text-blue-400 font-semibold">
                      {totalSinglesSold.toLocaleString()} singles
                    </td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="py-3 text-white font-medium">Total Units Equivalent*</td>
                    <td className="py-3 text-right text-purple-400 font-bold">
                      {(totalBoxesSold + totalSinglesSold).toLocaleString()} units
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-3">
                * Assumes 1 box = 1 unit. Adjust if your product has multiple units per box.
              </p>
            </div>
          </motion.div>
        )}

        {/* Action Breakdown Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6"
        >
          <h3 className="text-white font-semibold text-lg mb-4">Action Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(frequency).map(([action, count]) => (
              <motion.div
                key={action}
                whileHover={{ scale: 1.05 }}
                className="bg-white/5 rounded-lg p-4 text-center"
              >
                <p className="text-xs text-gray-400 uppercase tracking-wider">{action}</p>
                <p className="text-2xl font-bold text-white mt-1">{count}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}