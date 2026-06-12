'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package2, RefreshCw, Beer } from 'lucide-react';
import { toast } from 'sonner';
import { ReusableChart } from '@/components/charts/ReusableChart';

// ==================== TYPES ====================
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

// ==================== DASHBOARD – ONLY ALCOHOL (የአልኮል) ====================
export default function DashboardHomePage() {
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [alcoholCategory, setAlcoholCategory] = useState<CategoryQuantity | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/stock/restock-quantity-details');
      const allData: CategoryQuantity[] = res.data.data;

      // Find the alcohol category by ID (exact) OR by name containing "alcohol" or "የአልኮል" (case-insensitive)
      const found = allData.find(
        cat => 
          cat.categoryId === '1986acd7-c2af-4381-b1f0-5c19da7b99e3' ||
          cat.categoryName.toLowerCase().includes('alcohol') ||
          cat.categoryName.includes('የአልኮል')
      );
      
      if (found) {
        setAlcoholCategory(found);
        toast.success(`Found category: ${found.categoryName}`);
      } else {
        toast.error('Alcohol category not found. Check category name or ID.');
        setAlcoholCategory(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load alcohol quantity data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <Skeleton className="h-12 w-64 bg-white/10" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl bg-white/10" />)}
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl bg-white/10" />
      </div>
    );
  }

  if (!alcoholCategory) {
    return (
      <div className="text-center py-20">
        <Beer className="h-16 w-16 mx-auto text-gray-500 mb-4" />
        <p className="text-gray-400">የአልኮል ምድብ አልተገኘም</p>
        <p className="text-sm text-gray-500 mt-2">Alcohol category not found in the data.</p>
        <Button variant="outline" onClick={fetchData} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" /> ዳግም ሞክር
        </Button>
      </div>
    );
  }

  // Prepare product data for the chart
  const chartData = alcoholCategory.products.map(p => ({
    name: p.productName.length > 18 ? p.productName.slice(0, 18) + '…' : p.productName,
    fullName: p.productName,
    Boxes: p.totalBoxesRestocked,
    Bottles: p.totalSinglesRestocked,
  }));

  const totalProducts = alcoholCategory.products.length;
  const totalBoxes = chartData.reduce((sum, p) => sum + p.Boxes, 0);
  const totalBottles = chartData.reduce((sum, p) => sum + p.Bottles, 0);

  return (
    <div className="relative w-full space-y-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-4 items-center justify-between"
      >
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-amber-400 to-red-400 bg-clip-text text-transparent">
            {alcoholCategory.categoryName} • የአልኮል ትንተና
          </h1>
          <p className="text-gray-400 mt-2 flex items-center gap-2">
            <Package2 className="h-4 w-4" /> Quantity only • Boxes vs Bottles
          </p>
        </div>
        <div className="flex gap-3 items-center">
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
          <Button variant="outline" onClick={fetchData} className="border-white/20 hover:bg-white/10 text-white">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards for Alcohol only */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <KpiCard label="የምርቶች ብዛት • Products" value={totalProducts} color="#F59E0B" />
        <KpiCard label="ጠቅላላ ሳጥኖች • Boxes" value={totalBoxes} color="#EF4444" />
        <KpiCard label="ጠቅላላ ጠርሙሶች • Bottles" value={totalBottles} color="#10B981" />
      </motion.div>

      {/* Single Chart for the Alcohol Category */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <Beer className="h-5 w-5 text-amber-400" />
        <h2 className="text-2xl font-semibold text-white">
          {alcoholCategory.categoryName} – ምርቶች ስብራት (Products Breakdown)
        </h2>
      </motion.div>

      <div className="w-full">
        {chartType === 'stacked' ? (
          <ReusableChart
            title=""
            data={chartData}
            dataKey="Boxes"
            secondaryDataKey="Bottles"
            chartType="stacked"
            colorStart="#F59E0B"
            colorEnd="#EF4444"
            height={450}
          />
        ) : chartType === 'pie' ? (
          <ReusableChart
            title=""
            data={[
              { name: 'Boxes', value: totalBoxes, color: '#F59E0B' },
              { name: 'Bottles', value: totalBottles, color: '#EF4444' },
            ]}
            dataKey="value"
            chartType="pie"
            colorStart="#F59E0B"
            colorEnd="#EF4444"
            height={400}
          />
        ) : (
          <ReusableChart
            title=""
            data={chartData}
            dataKey="Boxes"
            secondaryDataKey="Bottles"
            chartType={chartType}
            colorStart="#F59E0B"
            colorEnd="#EF4444"
            height={450}
          />
        )}
      </div>
    </div>
  );
}