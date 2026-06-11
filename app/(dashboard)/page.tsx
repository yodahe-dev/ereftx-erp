"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package2, RefreshCw, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { BarChartComponent } from "@/components/charts/BarChartComponent";
import { StackedBarChartComponent } from "@/components/charts/StackedBarChartComponent";

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

// ==================== MAIN COMPONENT ====================
export default function StockAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"frequency" | "quantity">("frequency");
  const [frequencyData, setFrequencyData] = useState<CategoryFrequency[]>([]);
  const [quantityData, setQuantityData] = useState<CategoryQuantity[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [freqRes, quantRes] = await Promise.all([
        api.get("/analytics/stock/restock-frequency"),
        api.get("/analytics/stock/restock-quantity-details"),
      ]);
      setFrequencyData(freqRes.data.data);
      setQuantityData(quantRes.data.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeData = activeView === "frequency" ? frequencyData : quantityData;
  const totalCategories = activeData.length;
  const totalProducts = activeData.reduce((sum, cat) => sum + cat.products.length, 0);
  const totalValue =
    activeView === "frequency"
      ? frequencyData.reduce((sum, cat) => sum + cat.products.reduce((s, p) => s + p.value, 0), 0)
      : quantityData.reduce(
          (sum, cat) =>
            sum +
            cat.products.reduce((s, p) => s + p.totalBoxesRestocked + p.totalSinglesRestocked, 0),
          0
        );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-12 w-64 bg-white/10" />
          <Skeleton className="h-[400px] w-full rounded-2xl bg-white/10" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-80 rounded-2xl bg-white/10" />
            <Skeleton className="h-80 rounded-2xl bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-4 items-center justify-between"
        >
          <div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-amber-400 via-rose-400 to-emerald-400 bg-clip-text text-transparent">
              Stock Analytics
            </h1>
            <p className="text-gray-400 mt-2 flex items-center gap-2">
              <Package2 className="h-4 w-4" /> Real restock data • Box vs Bottle
            </p>
          </div>
          <div className="flex gap-3">
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "frequency" | "quantity")}>
              <TabsList className="bg-white/10 backdrop-blur-md border border-white/20">
                <TabsTrigger value="frequency" className="data-[state=active]:bg-amber-500/20">
                  📈 Frequency
                </TabsTrigger>
                <TabsTrigger value="quantity" className="data-[state=active]:bg-rose-500/20">
                  📦 Quantity
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={fetchData} className="border-white/20 hover:bg-white/10">
              <RefreshCw className="mr-2 h-4 w-4" /> Sync
            </Button>
          </div>
        </motion.div>

        {/* KPI Cards with vibrant gradients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-3"
        >
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-amber-300">Categories</p>
              <p className="text-3xl font-bold text-amber-400">{totalCategories}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-rose-300">Active Products</p>
              <p className="text-3xl font-bold text-rose-400">{totalProducts}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/30 backdrop-blur-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-emerald-300">
                Total {activeView === "frequency" ? "Restocks" : "Units"}
              </p>
              <p className="text-3xl font-bold text-emerald-400">{totalValue.toLocaleString()}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Per‑Category Charts Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="h-5 w-5 text-amber-400" />
            <h2 className="text-2xl font-semibold">Category Breakdown</h2>
            <Badge variant="outline" className="bg-white/5 border-white/20">
              {activeData.length} categories
            </Badge>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            {activeData.map((category, idx) => {
              if (activeView === "frequency") {
                const freqCategory = category as CategoryFrequency;
                const freqData = freqCategory.products.map((p) => ({
                  name:
                    p.productName.length > 18 ? p.productName.slice(0, 18) + "…" : p.productName,
                  fullName: p.productName,
                  value: p.value,
                }));
                // Cycle gradient colors: amber, rose, emerald, cyan, violet
                const gradients = [
                  { start: "#f59e0b", end: "#fbbf24" }, // amber
                  { start: "#f43f5e", end: "#fda4af" }, // rose
                  { start: "#10b981", end: "#34d399" }, // emerald
                  { start: "#06b6d4", end: "#67e8f9" }, // cyan
                  { start: "#8b5cf6", end: "#c084fc" }, // violet
                ];
                const { start, end } = gradients[idx % gradients.length];
                return (
                  <BarChartComponent
                    key={category.categoryId}
                    title={category.categoryName}
                    data={freqData}
                    dataKey="value"
                    colorStart={start}
                    colorEnd={end}
                  />
                );
              } else {
                const quantCategory = category as CategoryQuantity;
                const quantData = quantCategory.products.map((p) => ({
                  name:
                    p.productName.length > 18 ? p.productName.slice(0, 18) + "…" : p.productName,
                  fullName: p.productName,
                  Boxes: p.totalBoxesRestocked,
                  Bottles: p.totalSinglesRestocked,
                }));
                return (
                  <StackedBarChartComponent
                    key={quantCategory.categoryId}
                    title={quantCategory.categoryName}
                    data={quantData}
                  />
                );
              }
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}