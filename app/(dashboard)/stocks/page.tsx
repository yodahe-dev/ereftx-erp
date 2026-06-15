"use client";

import React, { JSX, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Pencil,
  Plus,
  Package,
  AlertCircle,
  Search,
  ChevronRight,
  Box,
  RefreshCw,
  ArrowLeftRight,
  Calculator,
  Settings,
  TrendingDown,
  CheckCircle2,
  Repeat,
  PlusCircle,
  MinusCircle,
  Save,
  DollarSign,
  History,
  Layers,
  Archive,
  Sparkles,
  Gift,
  Clock,
  Pin,
  PinOff,
  MoreHorizontal,
  Zap,
  Info,
  Eye,
  ChevronDown,
  ChevronUp,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useStockData, CURRENCY, PriceLayer, ProductPrice, StockHistoryRecord } from "@/hooks/useStockData";
import { api } from "@/lib/api";

export default function StockPage(): JSX.Element {
  const {
    stocks,
    products,
    categories,
    brands,
    packagings,
    loading,
    error,
    search,
    setSearch,
    filterType,
    setFilterType,
    isFilterPinned,
    setIsFilterPinned,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filteredStocks,
    totalPages,
    paginatedStocks,
    stats,
    formDialogOpen,
    setFormDialogOpen,
    form,
    editingId,
    restockDialogOpen,
    setRestockDialogOpen,
    restockStock,
    restockBoxes,
    setRestockBoxes,
    restockSingles,
    setRestockSingles,
    restockNotes,
    setRestockNotes,
    restockPriceOption,
    setRestockPriceOption,
    restockExistingPriceId,
    setRestockExistingPriceId,
    restockIsFree,
    setRestockIsFree,
    availablePrices,
    loadingPrices,
    adjustDialogOpen,
    setAdjustDialogOpen,
    adjustStock,
    adjustMode,
    setAdjustMode,
    adjustBoxes,
    setAdjustBoxes,
    adjustSingles,
    setAdjustSingles,
    adjustExactBoxes,
    setAdjustExactBoxes,
    adjustExactSingles,
    setAdjustExactSingles,
    exchangeDialogOpen,
    setExchangeDialogOpen,
    exchangeForm,
    setExchangeForm,
    exchangeLoading,
    entityDialogOpen,
    setEntityDialogOpen,
    activeEntityTab,
    setActiveEntityTab,
    entitySearch,
    setEntitySearch,
    priceListData,
    priceListLoading,
    activatingPriceId,
    productForm,
    setProductForm,
    editingProductId,
    stockHistoryDialogOpen,
    setStockHistoryDialogOpen,
    selectedStockForHistory,
    stockHistoryRecords,
    historyLoading,
    entityForm,
    setEntityForm,
    editingEntityId,
    expandedRows,
    deleteAlertOpen,
    setDeleteAlertOpen,
    deleteStock,
    priceLayers,
    filteredProducts,
    filteredCategories,
    filteredBrands,
    filteredPackagings,
    priceFormOpen,
    setPriceFormOpen,
    priceForm,
    setPriceForm,
    editingPrice,
    openCreatePriceDialog,
    openEditPriceDialog,
    handlePriceSubmit,
    handleDeletePrice,
    getCategoryName,
    getBrandName,
    getPackagingName,
    calculateStockProfit,
    handleStockQuantityChange,
    handleStockContainerTypeChange,
    handleStockProductSelect,
    handleStockSubmit,
    confirmDelete,
    performDelete,
    openRestockDialog,
    getProfitImpact,
    handleRestock,
    openAdjustDialog,
    handleAdjustSubmit,
    handleExchange,
    openProductForm,
    handleProductSubmit,
    handleProductDelete,
    handleEntitySubmit,
    handleEditEntity,
    handleDeleteEntity,
    toggleRowExpanded,
    productHasStock,
    openStockHistory,
    handleActivatePrice,
    resetProductForm,
    openStockForm,
    setEditingProductId,
    setEditingEntityId,
    fetchPriceList,
    fetchAll,
    fetchPriceLayers,
    updateHistoryPrice,
    fetchPriceOptionsForHistory,
    priceOptionsForHistory,
    loadingPriceOptions,
    updatingHistoryPriceId,
    assignPriceToStock,
  } = useStockData();

  // Local state
  const [showDetailedLayers, setShowDetailedLayers] = useState<Record<string, boolean>>({});
  const [restockSetActive, setRestockSetActive] = useState(false);
  const [selectedPriceProductId, setSelectedPriceProductId] = useState<string>("");
  const [editHistoryPriceDialogOpen, setEditHistoryPriceDialogOpen] = useState(false);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<any>(null);
  const [selectedHistoryPriceId, setSelectedHistoryPriceId] = useState("");
  // Price History Dialog (popover)
  const [priceHistoryDialogOpen, setPriceHistoryDialogOpen] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<any>(null);
  const [priceHistoryList, setPriceHistoryList] = useState<any[]>([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
  // Price summary aggregates (total stocked & remaining per price)
  const [priceSummaryMap, setPriceSummaryMap] = useState<Record<string, { totalUnits: number; remainingUnits: number }>>({});
  // Assign price to stock
  const [assignPriceDialogOpen, setAssignPriceDialogOpen] = useState(false);
  const [assignPriceStock, setAssignPriceStock] = useState<typeof stocks[0] | null>(null);
  const [assignPriceId, setAssignPriceId] = useState("");
  const [assignPriceLoading, setAssignPriceLoading] = useState(false);

  // Helper functions
  const formatNumber = (value: number | string | undefined): string => {
    if (value === undefined || value === null) return "0";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0";
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatInteger = (value: number | string | undefined): string => {
    if (value === undefined || value === null) return "0";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "0";
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const formatDate = (date: string | Date): string => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
  };

  const statsCards = [
    { title: "Total Products", value: formatInteger(stats.totalProducts), icon: Package, gradient: "from-emerald-500 to-teal-500", border: "border-l-emerald-500" },
    { title: "Total Boxes", value: formatInteger(stats.totalBoxes), icon: Box, gradient: "from-blue-500 to-cyan-500", border: "border-l-blue-500" },
    { title: "Total Singles", value: formatInteger(stats.totalSingles), icon: Layers, gradient: "from-purple-500 to-violet-500", border: "border-l-purple-500" },
    { title: "Out of Stock", value: formatInteger(stats.lowStockItems), icon: stats.lowStockItems > 0 ? TrendingDown : CheckCircle2, gradient: stats.lowStockItems > 0 ? "from-amber-500 to-orange-500" : "from-emerald-500 to-teal-500", border: stats.lowStockItems > 0 ? "border-l-amber-500" : "border-l-emerald-500" },
    { title: "Profit Potential", value: formatNumber(stats.totalProfitPotential), icon: DollarSign, gradient: "from-rose-500 to-pink-500", border: "border-l-rose-500", suffix: CURRENCY },
    { title: "Inventory Value", value: formatNumber(stats.totalInventoryValue), icon: Archive, gradient: "from-indigo-500 to-blue-500", border: "border-l-indigo-500", suffix: CURRENCY },
  ];

  useEffect(() => {
    if (pageSize !== 50) setPageSize(50);
  }, []);

  const toggleDetailedLayers = (stockId: string) => {
    setShowDetailedLayers(prev => ({ ...prev, [stockId]: !prev[stockId] }));
  };

  // Fetch price history using the api client
  const fetchPriceHistoryForProduct = async (productId: string) => {
    try {
      setPriceHistoryLoading(true);
      const response = await api.get<ProductPrice[]>(`/price-history/product/${productId}`);
      setPriceHistoryList(response.data);
      // Build price summary: total units ever stocked & remaining units for each price
      await computePriceSummaryForProduct(productId);
    } catch (error) {
      console.error("Failed to fetch price history", error);
      toast.error("Could not load price history");
      setPriceHistoryList([]);
    } finally {
      setPriceHistoryLoading(false);
    }
  };

  // Compute total stocked and remaining units per price for a product
  const computePriceSummaryForProduct = async (productId: string) => {
    // Get all stock entries for this product
    const productStocks = stocks.filter(s => s.productId === productId);
    if (productStocks.length === 0) {
      setPriceSummaryMap({});
      return;
    }
    // Fetch price layers for each stock and aggregate
    const layersByPrice: Record<string, { totalUnits: number; remainingUnits: number }> = {};
    for (const stock of productStocks) {
      try {
        const layersRes = await api.get<PriceLayer[]>(`/stocks/${stock.id}/price-layers`);
        for (const layer of layersRes.data) {
          if (!layersByPrice[layer.priceId]) {
            layersByPrice[layer.priceId] = { totalUnits: 0, remainingUnits: 0 };
          }
          // Each layer's totalUnits is the amount currently remaining for that price in this stock
          layersByPrice[layer.priceId].remainingUnits += layer.totalUnits;
          // We need total ever stocked. That's not directly in layers. We could sum from stock history.
          // For simplicity, we can approximate totalUnits as remainingUnits + sold units? Or we can fetch from history.
          // Better: we'll fetch stock history for the product and sum by priceId.
        }
      } catch (e) {
        console.error("Failed to fetch layers for stock", stock.id);
      }
    }
    // Enhance with total stocked from stock history (optional but good)
    // For now, we set totalUnits = remainingUnits (if we can't get historical). But let's do it properly:
    try {
      const historyRes = await api.get<StockHistoryRecord[]>(`/stocks/history/${productId}`);
      const historyByPrice: Record<string, number> = {};
      for (const record of historyRes.data) {
        if (record.priceId) {
          // For restock/adjust actions, the quantity change indicates added stock
          const addedUnits = record.boxQuantityChange * (products.find(p => p.id === productId)?.unitsPerBox || 1) + record.singleQuantityChange;
          if (addedUnits > 0) {
            historyByPrice[record.priceId] = (historyByPrice[record.priceId] || 0) + addedUnits;
          }
        }
      }
      for (const priceId in layersByPrice) {
        layersByPrice[priceId].totalUnits = historyByPrice[priceId] || layersByPrice[priceId].remainingUnits;
      }
    } catch (e) {
      console.error("Failed to fetch history for total stocked", e);
      // fallback: set totalUnits = remainingUnits
      for (const priceId in layersByPrice) {
        layersByPrice[priceId].totalUnits = layersByPrice[priceId].remainingUnits;
      }
    }
    setPriceSummaryMap(layersByPrice);
  };

  const openPriceHistoryDialog = async (product: any) => {
    setSelectedProductForHistory(product);
    await fetchPriceHistoryForProduct(product.id);
    setPriceHistoryDialogOpen(true);
  };

  const openAssignPriceDialog = (stock: typeof stocks[0]) => {
    setAssignPriceStock(stock);
    setAssignPriceId("");
    setAssignPriceDialogOpen(true);
    fetchPriceOptionsForHistory(stock.productId);
  };

  const handleAssignPrice = async () => {
    if (!assignPriceStock || !assignPriceId) {
      toast.error("Please select a price");
      return;
    }
    try {
      setAssignPriceLoading(true);
      await assignPriceToStock(assignPriceStock.id, assignPriceId);
      setAssignPriceDialogOpen(false);
      setAssignPriceStock(null);
      setAssignPriceId("");
    } catch (error) {
      // handled in hook
    } finally {
      setAssignPriceLoading(false);
    }
  };

  // Helper to get price details from priceId
  const getPriceDetails = (priceId: string | null | undefined) => {
    if (!priceId) return null;
    const fromOptions = priceOptionsForHistory.find(p => p.id === priceId);
    if (fromOptions) return fromOptions;
    const allPrices = products.flatMap(p => p.prices || []);
    return allPrices.find(p => p.id === priceId) || null;
  };

  return (
    <TooltipProvider>
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="p-6 md:p-8 lg:p-10 space-y-8">
          {/* Header */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Stock Management
              </h1>
              <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Real‑time inventory intelligence & profit analytics
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="default"
                onClick={() => setEntityDialogOpen(true)}
                className="border-slate-700 bg-slate-800/50 backdrop-blur-md hover:bg-slate-700/50 text-slate-200 shadow-lg transition-all duration-300"
              >
                <Settings className="mr-2 h-4 w-4" /> Manage
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() => setExchangeDialogOpen(true)}
                className="border-amber-700/50 bg-amber-900/20 backdrop-blur-md hover:bg-amber-800/30 text-amber-300 shadow-lg"
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" /> Exchange
              </Button>
              <Button
                onClick={() => openStockForm()}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-xl shadow-indigo-500/20 transition-all duration-300"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Stock
              </Button>
            </div>
          </motion.div>

          {/* KPI Stats Matrix */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ delay: 0.05 }}
            className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
          >
            {loading && !stocks.length
              ? [...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl bg-slate-800/50" />
                ))
              : statsCards.map((card, idx) => (
                  <Card
                    key={idx}
                    className={cn(
                      "relative overflow-hidden backdrop-blur-md bg-slate-900/40 border-slate-800 shadow-xl transition-all duration-300 hover:shadow-2xl group",
                      card.border,
                      "border-l-4"
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {card.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <p
                          className={cn(
                            "text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                            card.gradient
                          )}
                        >
                          {card.value}
                          {card.suffix && ` ${card.suffix}`}
                        </p>
                        <card.icon className="h-6 w-6 text-slate-500 group-hover:text-slate-300 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
          </motion.div>

          {/* Dynamic Command & Quick-Filter Strip */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-1 shadow-inner">
                {(["all", "box", "single"] as const).map((type) => (
                  <Button
                    key={type}
                    variant={filterType === type ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilterType(type)}
                    className={cn(
                      "capitalize rounded-lg px-4 transition-all duration-200",
                      filterType === type &&
                        "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                    )}
                  >
                    {type}
                  </Button>
                ))}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-slate-800/50 backdrop-blur-md hover:bg-slate-700/70 transition-all"
                    onClick={() => setIsFilterPinned(!isFilterPinned)}
                  >
                    {isFilterPinned ? (
                      <Pin className="h-4 w-4 text-indigo-400" />
                    ) : (
                      <PinOff className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isFilterPinned ? "Unpin default filter" : "Pin current filter"}
                </TooltipContent>
              </Tooltip>
              <Badge
                variant="secondary"
                className="h-8 px-4 bg-slate-800/70 text-slate-300 rounded-full backdrop-blur-sm border border-slate-700"
              >
                {formatInteger(filteredStocks.length)} items
              </Badge>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 bg-slate-900/70 backdrop-blur-md border-slate-700 focus:ring-2 focus:ring-indigo-500/50 rounded-xl py-6 text-slate-200 placeholder:text-slate-500"
              />
            </div>
          </motion.div>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-950/30 backdrop-blur-md p-4 text-rose-300"
              >
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stock Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-800 bg-slate-900/80">
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="min-w-[200px] text-slate-300 font-semibold">Product</TableHead>
                    <TableHead className="min-w-[100px] text-slate-300 font-semibold">Boxes</TableHead>
                    <TableHead className="min-w-[110px] text-slate-300 font-semibold">Loose Singles</TableHead>
                    <TableHead className="min-w-[100px] text-slate-300 font-semibold">Total Units</TableHead>
                    <TableHead className="min-w-[120px] text-slate-300 font-semibold">Box Profit</TableHead>
                    <TableHead className="min-w-[120px] text-slate-300 font-semibold">Single Profit</TableHead>
                    <TableHead className="min-w-[130px] text-slate-300 font-semibold">Last Updated</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && !paginatedStocks.length
                    ? [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={9}>
                            <Skeleton className="h-16 w-full bg-slate-800/50" />
                          </TableCell>
                        </TableRow>
                      ))
                    : paginatedStocks.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={9} className="h-64 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <Package className="h-16 w-16 text-slate-600" />
                              <p className="text-slate-400">No stock entries found.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    : paginatedStocks.map((stock) => {
                        const isExpanded = expandedRows.has(stock.id);
                        const product = stock.product;
                        const unitsPerBox = product?.unitsPerBox || 1;
                        const totalUnits = stock.boxQuantity * unitsPerBox + stock.singleQuantity;
                        const looseSingles = stock.singleQuantity % unitsPerBox;
                        const expectedSingles = stock.boxQuantity * unitsPerBox;
                        const expectedBoxes = Math.floor(stock.singleQuantity / unitsPerBox);
                        const isMismatch = stock.containerType === "box"
                          ? stock.singleQuantity !== expectedSingles
                          : stock.boxQuantity !== expectedBoxes;
                        const isLowStock = stock.boxQuantity < 2;
                        const profitData = calculateStockProfit(stock);

                        return (
                          <React.Fragment key={stock.id}>
                            <TableRow
                              className={cn(
                                "group cursor-pointer transition-all duration-200 hover:bg-slate-800/50",
                                isMismatch && "bg-slate-800/30",
                                isLowStock && !isMismatch && "bg-slate-800/20"
                              )}
                              onClick={() => toggleRowExpanded(stock.id)}
                            >
                              <TableCell className="w-8">
                                <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", isExpanded && "rotate-90")} />
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                                    <Package className="h-4 w-4 text-indigo-400" />
                                  </div>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="max-w-[200px] truncate block text-slate-200">{product?.name || "—"}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{product?.name}</TooltipContent>
                                  </Tooltip>
                                  {product?.currentPriceId && (
                                    <Badge variant="outline" className="ml-2 text-[10px] bg-emerald-950/40 border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                                      <Zap className="h-2.5 w-2.5" /> Active Price
                                    </Badge>
                                  )}
                                  {isLowStock && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="outline" className="ml-2 text-xs bg-slate-700/50 text-slate-400 border-slate-600">Low Stock</Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>Only {stock.boxQuantity} box{stock.boxQuantity !== 1 ? "es" : ""} left</TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono bg-slate-800/60 border-slate-700 text-slate-300">{formatInteger(stock.boxQuantity)}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono bg-slate-800/60 border-slate-700 text-slate-300">{formatInteger(looseSingles)}</Badge>
                              </TableCell>
                              <TableCell className="font-mono font-semibold text-slate-200">{formatInteger(totalUnits)}</TableCell>
                              <TableCell className="font-mono text-emerald-400">{formatNumber(profitData.boxProfit)} {CURRENCY}</TableCell>
                              <TableCell className="font-mono text-emerald-400">{formatNumber(profitData.singleProfit)} {CURRENCY}</TableCell>
                              <TableCell className="text-sm text-slate-400 whitespace-nowrap">{new Date(stock.updatedAt).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700/50" onClick={(e) => e.stopPropagation()}>
                                      <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openRestockDialog(stock); }} className="text-slate-200 focus:bg-slate-700">
                                      <PlusCircle className="mr-2 h-4 w-4" /> Restock
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openAdjustDialog(stock); }} className="text-slate-200 focus:bg-slate-700">
                                      <Calculator className="mr-2 h-4 w-4" /> Adjust
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openAssignPriceDialog(stock); }} className="text-slate-200 focus:bg-slate-700">
                                      <Tag className="mr-2 h-4 w-4" /> Change Price
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openStockForm(stock); }} className="text-slate-200 focus:bg-slate-700">
                                      <Pencil className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-700" />
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openStockHistory(stock); }} className="text-slate-200 focus:bg-slate-700">
                                      <History className="mr-2 h-4 w-4" /> Stock History
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if (product) openPriceHistoryDialog(product); }} className="text-slate-200 focus:bg-slate-700">
                                      <Clock className="mr-2 h-4 w-4" /> Price History
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { window.location.href = `/stocks/${stock.id}`; }} className="text-slate-200 focus:bg-slate-700">
                                      <Eye className="mr-2 h-4 w-4" /> Detailed View
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-slate-700" />
                                    <DropdownMenuItem className="text-rose-400 focus:bg-slate-700 focus:text-rose-300" onClick={(e) => { e.stopPropagation(); confirmDelete(stock); }}>
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={9} className="p-0">
                                  <div className="px-8 py-6 bg-slate-900/70 backdrop-blur-sm border-t border-slate-800">
                                    <div className="grid gap-6 md:grid-cols-3">
                                      {/* Product Details */}
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md"><Package className="h-4 w-4 text-white" /></div>
                                          <h4 className="font-semibold text-indigo-300">Product Details</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                                          <span className="text-slate-400">Category:</span><span className="font-medium text-slate-200">{getCategoryName(product?.categoryId || "")}</span>
                                          <span className="text-slate-400">Brand:</span><span className="font-medium text-slate-200">{getBrandName(product?.brandId || "")}</span>
                                          <span className="text-slate-400">Packaging:</span><span className="font-medium text-slate-200 capitalize">{getPackagingName(product?.packagingId || "")}</span>
                                          <span className="text-slate-400">Units/Box:</span><span className="font-mono font-medium text-slate-200">{unitsPerBox}</span>
                                          <span className="text-slate-400">Buy Price/Box:</span><span className="font-mono font-medium text-blue-400">{formatNumber(product?.buyPricePerBox || 0)} {CURRENCY}</span>
                                          <span className="text-slate-400">Sell Price/Box:</span><span className="font-mono font-medium text-emerald-400">{formatNumber(product?.sellPricePerBox || 0)} {CURRENCY}</span>
                                          <span className="text-slate-400">Sell Price/Unit:</span><span className="font-mono font-medium text-emerald-400">{formatNumber(product?.sellPricePerUnit || 0)} {CURRENCY}</span>
                                        </div>
                                      </div>
                                      {/* Stock Breakdown */}
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md"><Calculator className="h-4 w-4 text-white" /></div>
                                          <h4 className="font-semibold text-amber-300">Stock Breakdown</h4>
                                        </div>
                                        <div className="space-y-3 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                                          <div className="grid grid-cols-2 gap-2 text-sm">
                                            <span className="text-slate-400">Full Boxes:</span><span className="font-mono font-medium text-slate-200">{formatInteger(stock.boxQuantity)}</span>
                                            <span className="text-slate-400">Loose Singles:</span><span className="font-mono font-medium text-slate-200">{formatInteger(looseSingles)}</span>
                                            <span className="text-slate-400">Total Units:</span><span className="font-mono font-bold text-slate-100">{formatInteger(totalUnits)}</span>
                                            <span className="text-slate-400">Box Equivalent:</span><span className="font-mono font-medium text-slate-200">{(totalUnits / unitsPerBox).toFixed(1)}</span>
                                          </div>
                                          <Separator className="my-2 bg-slate-700" />
                                          <div className="space-y-1">
                                            <div className="flex justify-between text-sm"><span className="text-slate-400">Current Sell Price (Box):</span><span className="font-mono font-medium text-emerald-400">{formatNumber(product?.sellPricePerBox || 0)} {CURRENCY}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-slate-400">Current Sell Price (Unit):</span><span className="font-mono font-medium text-emerald-400">{formatNumber(product?.sellPricePerUnit || 0)} {CURRENCY}</span></div>
                                            <div className="flex justify-between text-sm font-semibold pt-1"><span className="text-slate-300">Total Revenue (at current price):</span><span className="font-mono font-bold text-emerald-300">{formatNumber(profitData.totalRevenue)} {CURRENCY}</span></div>
                                            <div className="flex justify-between text-sm font-semibold"><span className="text-slate-300">Total Profit (at current price):</span><span className="font-mono font-bold text-emerald-300">{formatNumber(profitData.totalProfit)} {CURRENCY}</span></div>
                                          </div>
                                        </div>
                                      </div>
                                      {/* Financial Health */}
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md"><DollarSign className="h-4 w-4 text-white" /></div>
                                          <h4 className="font-semibold text-emerald-300">Financial Health</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                                          <span className="text-slate-400">Cost per Unit:</span><span className="font-mono font-medium text-blue-400">{formatNumber(profitData.costPerUnit)} {CURRENCY}</span>
                                          <span className="text-slate-400">Unit Profit:</span><span className="font-mono font-medium text-emerald-400">{formatNumber(profitData.unitProfit)} {CURRENCY}</span>
                                          <span className="text-slate-400">Total Cost:</span><span className="font-mono font-medium text-rose-400">{formatNumber(profitData.totalCost)} {CURRENCY}</span>
                                          <span className="text-slate-400">Total Revenue:</span><span className="font-mono font-medium text-emerald-400">{formatNumber(profitData.totalRevenue)} {CURRENCY}</span>
                                          <span className="text-slate-400 font-semibold">Total Profit:</span><span className="font-mono font-bold text-lg text-emerald-300">{formatNumber(profitData.totalProfit)} {CURRENCY}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {isMismatch && (
                                      <div className="mt-4 rounded-xl border border-slate-600/50 bg-slate-800/30 p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2"><Info className="h-4 w-4 text-slate-400" /><p className="text-sm text-slate-400">{stock.containerType === "box" ? `Expected ${formatInteger(expectedSingles)} singles based on ${formatInteger(stock.boxQuantity)} boxes.` : `Expected ${formatInteger(expectedBoxes)} boxes based on ${formatInteger(stock.singleQuantity)} singles.`}</p></div>
                                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-300" onClick={(e) => { e.stopPropagation(); openAdjustDialog(stock); }}><Calculator className="mr-2 h-3 w-3" /> Fix</Button>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 border-t border-slate-800 bg-slate-900/30">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Rows per page:</span>
                <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-20 h-9 bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="5">5</SelectItem><SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem><SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem><PaginationPrevious onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} className={cn(currentPage === 1 && "pointer-events-none opacity-50", "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700")} /></PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).filter(page => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)).map((page, idx, arr) => (
                      <React.Fragment key={page}>
                        {idx > 0 && page - arr[idx - 1] > 1 && <PaginationItem><span className="px-2 py-1 text-slate-400">...</span></PaginationItem>}
                        <PaginationItem><PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className={cn(currentPage === page && "bg-indigo-600 text-white border-indigo-500", "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700")}>{page}</PaginationLink></PaginationItem>
                      </React.Fragment>
                    ))}
                    <PaginationItem><PaginationNext onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} className={cn(currentPage === totalPages && "pointer-events-none opacity-50", "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700")} /></PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
              <div className="text-sm text-slate-400">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredStocks.length)} of {filteredStocks.length}</div>
            </div>
          </div>

          {/* ========== DIALOGS ========== */}

          {/* Delete Confirmation */}
          <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
            <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-200">
              <AlertDialogHeader><AlertDialogTitle>Delete Stock Entry</AlertDialogTitle><AlertDialogDescription className="text-slate-400">Are you sure you want to delete stock for <strong className="text-rose-400">{deleteStock?.product?.name}</strong>?<br />You will have 10 seconds to undo this action.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">Cancel</AlertDialogCancel><AlertDialogAction onClick={performDelete} className="bg-rose-600 hover:bg-rose-700 text-white">Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Stock Form Dialog */}
          <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
            <DialogContent className="max-w-md border-0 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl rounded-2xl">
              <DialogHeader><DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">{editingId ? "Edit Stock" : "Add Stock"}</DialogTitle><DialogDescription className="text-slate-400">{editingId ? "Update stock quantities" : "Add new stock entry (only if product has no stock yet)"}</DialogDescription></DialogHeader>
              <div className="space-y-5 py-4">
                <div className="space-y-2"><Label className="text-sm font-medium text-slate-300">Product *</Label><Select value={form.productId} onValueChange={handleStockProductSelect} disabled={!!editingId}><SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue placeholder="Select a product" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700">{products.filter((p) => !editingId || p.id === form.productId).map((p) => { const hasStock = productHasStock(p.id); return (<SelectItem key={p.id} value={p.id} disabled={!editingId && hasStock} className="text-slate-200">{p.name} ({p.unitsPerBox} per box){!editingId && hasStock && " (Already has stock)"}</SelectItem>); })}</SelectContent></Select>{!editingId && <p className="text-xs text-amber-400">Only products without existing stock are shown. Use "Restock" to add more.</p>}</div>
                <div className="space-y-2"><Label className="text-sm font-medium text-slate-300">Container Type *</Label><Select value={form.containerType} onValueChange={(v) => handleStockContainerTypeChange(v as "box" | "single")}><SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="box">Box (primary)</SelectItem><SelectItem value="single">Single (primary)</SelectItem></SelectContent></Select><p className="text-xs text-slate-400">Choose which quantity to enter; the other auto‑calculates.</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-sm font-medium text-slate-300">Box Quantity</Label><Input type="number" min={0} inputMode="numeric" pattern="[0-9]*" value={form.boxQuantity} onChange={(e) => handleStockQuantityChange("boxQuantity", e.target.value)} disabled={form.containerType === "single"} className="bg-slate-800/50 border-slate-700 text-slate-200 font-mono" /></div>
                  <div className="space-y-2"><Label className="text-sm font-medium text-slate-300">Single Quantity</Label><Input type="number" min={0} inputMode="numeric" pattern="[0-9]*" value={form.singleQuantity} onChange={(e) => handleStockQuantityChange("singleQuantity", e.target.value)} disabled={form.containerType === "box"} className="bg-slate-800/50 border-slate-700 text-slate-200 font-mono" /></div>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setFormDialogOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button><Button onClick={handleStockSubmit} disabled={loading} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white">{editingId ? "Update" : "Create"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Restock Dialog */}
          <Dialog open={restockDialogOpen} onOpenChange={setRestockDialogOpen}>
            <DialogContent className="max-w-lg border-0 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl rounded-2xl">
              <DialogHeader><DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Restock Product</DialogTitle><DialogDescription className="text-slate-400">{restockStock?.product?.name} - Current: {formatInteger(restockStock?.boxQuantity || 0)} boxes, {formatInteger(restockStock?.singleQuantity || 0)} singles</DialogDescription></DialogHeader>
              <div className="space-y-5 py-4">
                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-sm font-medium text-slate-300">Boxes to add</Label><Input type="number" min={0} inputMode="numeric" pattern="[0-9]*" value={restockBoxes} onChange={(e) => setRestockBoxes(Number(e.target.value) || 0)} className="bg-slate-800/50 border-slate-700 text-slate-200 font-mono" /></div><div className="space-y-2"><Label className="text-sm font-medium text-slate-300">Singles to add</Label><Input type="number" min={0} inputMode="numeric" pattern="[0-9]*" value={restockSingles} onChange={(e) => setRestockSingles(Number(e.target.value) || 0)} className="bg-slate-800/50 border-slate-700 text-slate-200 font-mono" /></div></div>
                <div className="space-y-3 border-t border-slate-800 pt-3">
                  <Label className="text-sm font-medium text-slate-300">Price for this restock</Label>
                  <RadioGroup value={restockPriceOption} onValueChange={(v) => setRestockPriceOption(v as any)} className="space-y-2">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="keep" id="keep" /><Label htmlFor="keep" className="cursor-pointer text-slate-300">Keep current buy price ({formatNumber(restockStock?.product?.buyPricePerBox || 0)} {CURRENCY}/box)</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="existing" id="existing" /><Label htmlFor="existing" className="cursor-pointer text-slate-300">Use an existing price from history</Label></div>
                    {restockPriceOption === "existing" && (<div className="ml-6"><Select value={restockExistingPriceId} onValueChange={setRestockExistingPriceId} disabled={loadingPrices}><SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue placeholder="Select a price record" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700">{availablePrices.map((price) => (<SelectItem key={price.id} value={price.id} className="text-slate-200">{new Date(price.startAt).toLocaleDateString()} - Buy: {formatNumber(price.buyPricePerBox)} {CURRENCY}{price.endAt ? " (ended)" : " (active)"}</SelectItem>))}{availablePrices.length === 0 && !loadingPrices && (<SelectItem value="no-price" disabled>No price history found</SelectItem>)}</SelectContent></Select></div>)}
                  </RadioGroup>
                  <p className="text-xs text-slate-400">Prices must be created first in the Price List tab. You cannot create a new price during restock.</p>
                </div>
                {restockPriceOption === "existing" && restockExistingPriceId && (
                  <div className="rounded-xl bg-slate-800/50 border border-blue-800/50 p-4">
                    <div className="flex items-center gap-2 mb-2"><Info className="h-4 w-4 text-blue-400" /><p className="text-sm font-semibold text-blue-300">Profit Impact Preview</p></div>
                    {(() => { const impact = getProfitImpact(); if (!impact) return null; return (<div className="space-y-1 text-sm"><div className="flex justify-between"><span className="text-slate-400">Old cost per unit:</span><span className="font-mono text-slate-200">{formatNumber(impact.oldCostPerUnit)} {CURRENCY}</span></div><div className="flex justify-between"><span className="text-slate-400">New cost per unit:</span><span className={cn("font-mono", impact.isHigher ? "text-rose-400" : "text-emerald-400")}>{formatNumber(impact.newCostPerUnit)} {CURRENCY}</span></div><Separator className="my-1 bg-slate-700" /><div className="flex justify-between"><span className="text-slate-400">Added units:</span><span className="font-mono font-medium text-slate-200">{formatInteger(impact.addedUnits)}</span></div><div className="flex justify-between"><span className="text-slate-400">Cost difference:</span><span className={cn("font-mono font-bold", impact.costDifference > 0 ? "text-rose-400" : "text-emerald-400")}>{impact.costDifference > 0 ? "+" : ""}{formatNumber(impact.costDifference)} {CURRENCY}</span></div><p className="text-xs text-slate-400 mt-2">{impact.costDifference > 0 ? "⚠️ Your cost basis increases, reducing future profit per unit." : "✓ Your cost basis decreases, improving future profit per unit."}</p></div>); })()}
                  </div>
                )}
                <div className="flex items-center gap-3"><Switch checked={restockIsFree} onCheckedChange={setRestockIsFree} /><Label className="flex items-center gap-1 text-slate-300"><Gift className="h-4 w-4" /> Free Stock (no cost)</Label></div>
                <div className="space-y-2"><Label className="text-slate-300">Notes (optional)</Label><Input placeholder="e.g., Free stock, purchase, etc." value={restockNotes} onChange={(e) => setRestockNotes(e.target.value)} className="bg-slate-800/50 border-slate-700 text-slate-200" /></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setRestockDialogOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button><Button onClick={handleRestock} disabled={loading || (restockPriceOption === "existing" && !restockExistingPriceId)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white">Confirm Restock</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Adjustment Dialog */}
          <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
            <DialogContent className="max-w-md border-0 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl rounded-2xl">
              <DialogHeader><DialogTitle className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Adjust Stock</DialogTitle><DialogDescription className="text-slate-400">{adjustStock?.product?.name} - Current: {formatInteger(adjustStock?.boxQuantity || 0)} boxes, {formatInteger(adjustStock?.singleQuantity || 0)} singles</DialogDescription></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label className="text-slate-300">Adjustment Mode</Label><div className="flex gap-2"><Button variant={adjustMode === "add" ? "default" : "outline"} className={cn("flex-1", adjustMode === "add" && "bg-gradient-to-r from-emerald-600 to-teal-600 text-white")} onClick={() => setAdjustMode("add")}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button><Button variant={adjustMode === "subtract" ? "default" : "outline"} className={cn("flex-1", adjustMode === "subtract" && "bg-gradient-to-r from-rose-600 to-pink-600 text-white")} onClick={() => setAdjustMode("subtract")}><MinusCircle className="mr-2 h-4 w-4" /> Subtract</Button><Button variant={adjustMode === "set" ? "default" : "outline"} className={cn("flex-1", adjustMode === "set" && "bg-gradient-to-r from-blue-600 to-cyan-600 text-white")} onClick={() => setAdjustMode("set")}><Save className="mr-2 h-4 w-4" /> Set Exact</Button></div></div>
                {adjustMode === "add" || adjustMode === "subtract" ? (<div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-slate-300">Boxes to {adjustMode}</Label><Input type="number" min={0} inputMode="numeric" pattern="[0-9]*" value={adjustBoxes} onChange={(e) => setAdjustBoxes(Number(e.target.value) || 0)} className="bg-slate-800/50 border-slate-700 text-slate-200 font-mono" /></div><div className="space-y-2"><Label className="text-slate-300">Singles to {adjustMode}</Label><Input type="number" min={0} inputMode="numeric" pattern="[0-9]*" value={adjustSingles} onChange={(e) => setAdjustSingles(Number(e.target.value) || 0)} className="bg-slate-800/50 border-slate-700 text-slate-200 font-mono" /></div></div>) : (<div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-slate-300">New Box Quantity</Label><Input type="number" min={0} inputMode="numeric" pattern="[0-9]*" value={adjustExactBoxes} onChange={(e) => setAdjustExactBoxes(Number(e.target.value) || 0)} className="bg-slate-800/50 border-slate-700 text-slate-200 font-mono" /></div><div className="space-y-2"><Label className="text-slate-300">New Single Quantity</Label><Input type="number" min={0} inputMode="numeric" pattern="[0-9]*" value={adjustExactSingles} onChange={(e) => setAdjustExactSingles(Number(e.target.value) || 0)} className="bg-slate-800/50 border-slate-700 text-slate-200 font-mono" /></div></div>)}
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setAdjustDialogOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button><Button onClick={handleAdjustSubmit} disabled={loading} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white">Apply Adjustment</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Exchange Dialog */}
          <Dialog open={exchangeDialogOpen} onOpenChange={setExchangeDialogOpen}>
            <DialogContent className="max-w-lg border-0 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl rounded-2xl">
              <DialogHeader><DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2"><Repeat className="h-5 w-5" /> Product Exchange</DialogTitle><DialogDescription className="text-slate-400">Exchange products between inventory.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label className="text-slate-300">Source Product (giving away) *</Label><Select value={exchangeForm.sourceProductId} onValueChange={(v) => setExchangeForm({ ...exchangeForm, sourceProductId: v })}><SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue placeholder="Select product to give" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700">{products.map((p) => { const stock = stocks.find((s) => s.productId === p.id); const totalUnits = stock ? stock.boxQuantity * p.unitsPerBox + stock.singleQuantity : 0; return (<SelectItem key={p.id} value={p.id}>{p.name} (Stock: {formatInteger(totalUnits)} units)</SelectItem>); })}</SelectContent></Select></div>
                <div className="space-y-2"><Label className="text-slate-300">Target Product (receiving) *</Label><Select value={exchangeForm.targetProductId} onValueChange={(v) => setExchangeForm({ ...exchangeForm, targetProductId: v })} disabled={!exchangeForm.sourceProductId}><SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue placeholder="Select product to receive" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700">{products.filter((p) => p.id !== exchangeForm.sourceProductId).map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="text-slate-300">Exchange Type</Label><Select value={exchangeForm.exchangeType} onValueChange={(v: "box" | "single") => setExchangeForm({ ...exchangeForm, exchangeType: v })}><SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="box">Boxes</SelectItem><SelectItem value="single">Singles</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label className="text-slate-300">Quantity</Label><Input type="number" min={1} inputMode="numeric" pattern="[0-9]*" value={exchangeForm.sourceQuantity} onChange={(e) => setExchangeForm({ ...exchangeForm, sourceQuantity: Number(e.target.value) || 1 })} className="bg-slate-800/50 border-slate-700 text-slate-200 font-mono" /></div></div>
                <div className="space-y-2"><Label className="text-slate-300">Notes (optional)</Label><Input placeholder="Exchange reason" value={exchangeForm.notes} onChange={(e) => setExchangeForm({ ...exchangeForm, notes: e.target.value })} className="bg-slate-800/50 border-slate-700 text-slate-200" /></div>
                {exchangeForm.sourceProductId && exchangeForm.targetProductId && (<div className="rounded-xl bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-4 text-sm border border-purple-800/50"><p className="font-semibold mb-2 text-purple-300">Exchange Preview:</p>{(() => { const source = products.find(p => p.id === exchangeForm.sourceProductId); const target = products.find(p => p.id === exchangeForm.targetProductId); if (!source || !target) return null; const sourceUnits = exchangeForm.exchangeType === "box" ? exchangeForm.sourceQuantity * source.unitsPerBox : exchangeForm.sourceQuantity; const targetBoxes = Math.floor(sourceUnits / target.unitsPerBox); const targetSingles = sourceUnits % target.unitsPerBox; return (<div className="space-y-1 text-slate-300"><p>You give: <span className="font-medium text-white">{exchangeForm.sourceQuantity} {exchangeForm.exchangeType}(s) of {source.name}</span></p><p>You receive: <span className="font-medium text-white">{targetBoxes} box(es) and {targetSingles} single(s) of {target.name}</span></p><p className="text-xs text-slate-400">(Based on {source.unitsPerBox} units/box for source and {target.unitsPerBox} for target)</p></div>); })()}</div>)}
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setExchangeDialogOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button><Button onClick={handleExchange} disabled={exchangeLoading} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white">{exchangeLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeftRight className="mr-2 h-4 w-4" />}Confirm Exchange</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Stock History Dialog with Price Values */}
          <Dialog open={stockHistoryDialogOpen} onOpenChange={setStockHistoryDialogOpen}>
            <DialogContent className="min-w-4xl max-w-6xl border-0 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Stock History</DialogTitle>
                <DialogDescription className="text-slate-400">
                  {selectedStockForHistory?.product?.name} - Inventory change log. Click "Change" to update the price associated with a transaction.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto">
                {historyLoading ? (
                  <div className="py-8 text-center"><RefreshCw className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
                ) : stockHistoryRecords.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">No history records found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300">Date</TableHead>
                        <TableHead className="text-slate-300">Action</TableHead>
                        <TableHead className="text-slate-300">Boxes</TableHead>
                        <TableHead className="text-slate-300">Singles</TableHead>
                        <TableHead className="text-slate-300">Associated Price</TableHead>
                        <TableHead className="text-slate-300">Notes</TableHead>
                        <TableHead className="text-slate-300 w-32">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockHistoryRecords.map((record) => {
                        const priceDetails = getPriceDetails(record.priceId);
                        return (
                          <TableRow key={record.id} className="border-slate-800">
                            <TableCell className="text-slate-300 whitespace-nowrap">{new Date(record.createdAt).toLocaleString()}</TableCell>
                            <TableCell><Badge variant="outline" className="capitalize bg-slate-800/50 text-slate-300 border-slate-700">{record.actionType}</Badge></TableCell>
                            <TableCell className="font-mono text-slate-300">{formatInteger(record.boxQuantityAfter)} ({record.boxQuantityChange >= 0 ? "+" : ""}{formatInteger(record.boxQuantityChange)})</TableCell>
                            <TableCell className="font-mono text-slate-300">{formatInteger(record.singleQuantityAfter)} ({record.singleQuantityChange >= 0 ? "+" : ""}{formatInteger(record.singleQuantityChange)})</TableCell>
                            <TableCell>
                              {priceDetails ? (
                                <div className="text-xs space-y-0.5">
                                  <div className="text-emerald-400">Buy: {formatNumber(priceDetails.buyPricePerBox)} {CURRENCY}/box</div>
                                  <div className="text-blue-400">Sell: {formatNumber(priceDetails.sellPricePerBox)} {CURRENCY}/box</div>
                                  <div className="text-cyan-400">Unit: {formatNumber(priceDetails.sellPricePerUnit)} {CURRENCY}</div>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-sm">No price</span>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-400 max-w-xs truncate">{record.notes || "—"}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  setSelectedHistoryRecord(record);
                                  await fetchPriceOptionsForHistory(record.productId);
                                  setEditHistoryPriceDialogOpen(true);
                                }}
                                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                              >
                                <Tag className="h-3 w-3 mr-1" /> Change
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStockHistoryDialogOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit History Price Dialog */}
          <Dialog open={editHistoryPriceDialogOpen} onOpenChange={setEditHistoryPriceDialogOpen}>
            <DialogContent className="max-w-md border-0 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-cyan-300">Update History Price</DialogTitle>
                <DialogDescription>Select a new price for this stock movement record.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">New Price</Label>
                  <Select
                    value={selectedHistoryPriceId}
                    onValueChange={setSelectedHistoryPriceId}
                    disabled={loadingPriceOptions}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700">
                      <SelectValue placeholder="Choose a price record" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {priceOptionsForHistory.map((price) => (
                        <SelectItem key={price.id} value={price.id}>
                          {formatDate(price.startAt)} - Buy: {formatNumber(price.buyPricePerBox)} {CURRENCY} (Sell: {formatNumber(price.sellPricePerUnit)}/unit)
                          {price.endAt ? " (ended)" : " ✓ active"}
                        </SelectItem>
                      ))}
                      {priceOptionsForHistory.length === 0 && !loadingPriceOptions && (
                        <SelectItem value="none" disabled>No price records found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditHistoryPriceDialogOpen(false)} className="border-slate-700">Cancel</Button>
                <Button
                  onClick={async () => {
                    if (selectedHistoryRecord && selectedHistoryPriceId) {
                      await updateHistoryPrice(selectedHistoryRecord.id, selectedHistoryPriceId);
                      setEditHistoryPriceDialogOpen(false);
                      setSelectedHistoryRecord(null);
                      setSelectedHistoryPriceId("");
                    } else {
                      toast.error("Please select a price");
                    }
                  }}
                  disabled={updatingHistoryPriceId === selectedHistoryRecord?.id}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white"
                >
                  {updatingHistoryPriceId === selectedHistoryRecord?.id ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Update
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Assign Price to Stock Dialog */}
          <Dialog open={assignPriceDialogOpen} onOpenChange={setAssignPriceDialogOpen}>
            <DialogContent className="max-w-md border-0 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-indigo-300">Change Stock Price</DialogTitle>
                <DialogDescription>Assign a different price layer to this stock without restocking.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Product</Label>
                  <Input value={assignPriceStock?.product?.name} disabled className="bg-slate-800/50 border-slate-700 text-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Select Price</Label>
                  <Select value={assignPriceId} onValueChange={setAssignPriceId} disabled={assignPriceLoading}>
                    <SelectTrigger className="bg-slate-800/50 border-slate-700">
                      <SelectValue placeholder="Choose a price" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {priceOptionsForHistory.map((price) => (
                        <SelectItem key={price.id} value={price.id}>
                          {formatDate(price.startAt)} - Buy: {formatNumber(price.buyPricePerBox)} {CURRENCY}
                          {price.endAt ? " (ended)" : " ✓ active"}
                        </SelectItem>
                      ))}
                      {priceOptionsForHistory.length === 0 && !loadingPriceOptions && (
                        <SelectItem value="none" disabled>No price records found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignPriceDialogOpen(false)} className="border-slate-700">Cancel</Button>
                <Button onClick={handleAssignPrice} disabled={assignPriceLoading || !assignPriceId} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                  {assignPriceLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Tag className="h-4 w-4 mr-2" />}
                  Apply
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Entity Management Dialog */}
          <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
            <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto border-0 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl rounded-2xl">
              <DialogHeader><DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Quick Management</DialogTitle><DialogDescription className="text-slate-400">Manage products, price history, categories, brands, and packaging</DialogDescription></DialogHeader>
              <Tabs value={activeEntityTab} onValueChange={(v) => { 
                setActiveEntityTab(v as any); 
                setEditingProductId(null); 
                setEditingEntityId(null); 
                setEntityForm({ name: "", type: "" }); 
                setEntitySearch("");
                if (v === "prices") setSelectedPriceProductId("");
              }}>
                <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 p-1 rounded-xl">
                  <TabsTrigger value="products" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg text-slate-300">Products</TabsTrigger>
                  <TabsTrigger value="prices" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white rounded-lg text-slate-300">Price List</TabsTrigger>
                  <TabsTrigger value="category" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-lg text-slate-300">Categories</TabsTrigger>
                  <TabsTrigger value="brand" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-lg text-slate-300">Brands</TabsTrigger>
                  <TabsTrigger value="packaging" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-lg text-slate-300">Packaging</TabsTrigger>
                </TabsList>

                {/* Products Tab */}
                <TabsContent value="products" className="space-y-4">
                  <div className="border-b border-slate-700 pb-4 mb-4">
                    <h4 className="font-semibold mb-3 text-indigo-300">{editingProductId ? "Edit Product" : "Add New Product"}</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1"><Label className="text-slate-300">Name *</Label><Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Product name" className="bg-slate-800/50 border-slate-700 text-slate-200" /></div>
                      <div className="space-y-1"><Label className="text-slate-300">Units per Box</Label><Input type="number" min={1} inputMode="numeric" pattern="[0-9]*" value={productForm.unitsPerBox} onChange={(e) => setProductForm({ ...productForm, unitsPerBox: Number(e.target.value) || 1 })} className="bg-slate-800/50 border-slate-700 text-slate-200" /></div>
                      <div className="md:col-span-2 space-y-1"><Label className="text-slate-300">Description</Label><Input value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} placeholder="Optional description" className="bg-slate-800/50 border-slate-700 text-slate-200" /></div>
                      <div className="space-y-1"><Label className="text-slate-300">Category *</Label><Select value={productForm.categoryId} onValueChange={(v) => setProductForm({ ...productForm, categoryId: v })}><SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700">{categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select></div>
                      <div className="space-y-1"><Label className="text-slate-300">Brand *</Label><Select value={productForm.brandId} onValueChange={(v) => setProductForm({ ...productForm, brandId: v })}><SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700">{brands.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}</SelectContent></Select></div>
                      <div className="space-y-1"><Label className="text-slate-300">Packaging *</Label><Select value={productForm.packagingId} onValueChange={(v) => setProductForm({ ...productForm, packagingId: v })}><SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700">{packagings.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select></div>
                      <div className="space-y-1"><Label className="text-slate-300">Box Buy Price ({CURRENCY})</Label><Input type="number" step="0.01" inputMode="decimal" value={productForm.buyPricePerBox} onChange={(e) => setProductForm({ ...productForm, buyPricePerBox: e.target.value })} className="bg-slate-800/50 border-slate-700 text-slate-200" /></div>
                      <div className="space-y-1"><Label className="text-slate-300">Box Sell Price ({CURRENCY})</Label><Input type="number" step="0.01" inputMode="decimal" value={productForm.sellPricePerBox} onChange={(e) => setProductForm({ ...productForm, sellPricePerBox: e.target.value })} className="bg-slate-800/50 border-slate-700 text-slate-200" /></div>
                      <div className="space-y-1"><Label className="text-slate-300">Single Sell Price ({CURRENCY})</Label><Input type="number" step="0.01" inputMode="decimal" value={productForm.sellPricePerUnit} onChange={(e) => setProductForm({ ...productForm, sellPricePerUnit: e.target.value })} className="bg-slate-800/50 border-slate-700 text-slate-200" /></div>
                      <div className="flex items-center gap-2 col-span-2"><Switch checked={productForm.allowLoss} onCheckedChange={(c) => setProductForm({ ...productForm, allowLoss: c })} /><Label className="text-slate-300">Allow Loss (sell below cost)</Label></div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={resetProductForm} className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button><Button onClick={handleProductSubmit} disabled={loading} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white">{editingProductId ? "Update Product" : "Create Product"}</Button></div>
                  </div>
                  <div>
                    <div className="flex gap-2 mb-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search products..." value={entitySearch} onChange={(e) => setEntitySearch(e.target.value)} className="pl-8 bg-slate-800/50 border-slate-700 text-slate-200" />
                      </div>
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {filteredProducts.map((product) => (
                        <div key={product.id} className="flex items-center justify-between rounded-xl bg-slate-800/30 backdrop-blur-sm p-3 hover:bg-slate-700/30 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-indigo-300 truncate">{product.name}</div>
                            <div className="text-xs text-slate-400 truncate">{getCategoryName(product.categoryId)} | {getBrandName(product.brandId)} | {getPackagingName(product.packagingId)}</div>
                            <div className="text-xs text-slate-400">Box: {formatNumber(product.buyPricePerBox || 0)} / {formatNumber(product.sellPricePerBox || 0)} {CURRENCY} | Single: {formatNumber(product.sellPricePerUnit || 0)} {CURRENCY}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-indigo-500/20 text-slate-300" onClick={() => openProductForm(product)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-purple-500/20 text-slate-300" onClick={() => openPriceHistoryDialog(product)}>
                              <History className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-rose-500/20 text-rose-400" onClick={() => handleProductDelete(product.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {filteredProducts.length === 0 && <div className="py-4 text-center text-sm text-slate-400">No products found</div>}
                    </div>
                  </div>
                </TabsContent>

                {/* Price List Tab */}
                <TabsContent value="prices" className="space-y-4">
                  <div className="flex gap-2 mb-4">
                    <Select value={selectedPriceProductId} onValueChange={async (val) => {
                      setSelectedPriceProductId(val);
                      if (val) await fetchPriceList(val);
                    }}>
                      <SelectTrigger className="w-64 bg-slate-800/50 border-slate-700 text-slate-200">
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="">-- Select Product --</SelectItem>
                        {products.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => { if (selectedPriceProductId) fetchPriceList(selectedPriceProductId); }} className="border-slate-700 text-slate-300 hover:bg-slate-800"><RefreshCw className="mr-2 h-3 w-3" /> Refresh</Button>
                  </div>
                  {priceListLoading ? (<div className="flex justify-center py-8"><RefreshCw className="h-6 w-6 animate-spin text-slate-400" /></div>) : priceListData.length === 0 ? (<div className="text-center py-8 text-slate-400">Select a product to see its price history.</div>) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700">
                            <TableHead className="min-w-[100px] text-slate-300">Buy/Box</TableHead>
                            <TableHead className="min-w-[100px] text-slate-300">Sell/Box</TableHead>
                            <TableHead className="min-w-[100px] text-slate-300">Sell/Unit</TableHead>
                            <TableHead className="min-w-[120px] text-slate-300">Start Date</TableHead>
                            <TableHead className="min-w-[120px] text-slate-300">End Date</TableHead>
                            <TableHead className="min-w-[90px] text-slate-300">Allow Loss</TableHead>
                            <TableHead className="min-w-[100px] text-slate-300">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {priceListData.map((price) => (
                            <TableRow key={price.id} className="border-slate-800">
                              <TableCell className="font-mono text-slate-300">{formatNumber(price.buyPricePerBox)} {CURRENCY}</TableCell>
                              <TableCell className="font-mono text-slate-300">{formatNumber(price.sellPricePerBox)} {CURRENCY}</TableCell>
                              <TableCell className="font-mono text-slate-300">{formatNumber(price.sellPricePerUnit)} {CURRENCY}</TableCell>
                              <TableCell className="text-slate-300">{new Date(price.startAt).toLocaleDateString()}</TableCell>
                              <TableCell>{price.endAt ? new Date(price.endAt).toLocaleDateString() : <Badge className="bg-emerald-600">Active</Badge>}</TableCell>
                              <TableCell>{price.allowLoss ? <Badge variant="destructive">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {price.endAt !== null && (
                                    <Button size="sm" variant="outline" onClick={() => handleActivatePrice(price.id, price.productId)} disabled={activatingPriceId === price.id} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                                      {activatingPriceId === price.id ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}Activate
                                    </Button>
                                  )}
                                  <Button size="sm" variant="ghost" onClick={() => openEditPriceDialog(price)} className="text-slate-300 hover:bg-slate-800"><Pencil className="h-3 w-3" /></Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDeletePrice(price.id, price.productId)} className="text-rose-400 hover:bg-slate-800"><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <div className="border-t border-slate-700 pt-4 flex justify-end">
                    <Button onClick={() => { if (selectedPriceProductId) openCreatePriceDialog(products.find(p => p.id === selectedPriceProductId)!); else toast.error("Select a product first"); }} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                      <Plus className="mr-2 h-4 w-4" /> Add New Price
                    </Button>
                  </div>
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="category" className="space-y-4"><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Search categories..." value={entitySearch} onChange={(e) => setEntitySearch(e.target.value)} className="pl-8 bg-slate-800/50 border-slate-700 text-slate-200" /></div><div className="max-h-80 space-y-1 overflow-y-auto">{filteredCategories.map((cat) => (<div key={cat.id} className="flex items-center justify-between rounded-xl bg-slate-800/30 backdrop-blur-sm px-3 py-2"><span className="capitalize font-medium text-slate-200">{cat.name}</span><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-amber-500/20 text-slate-300" onClick={() => handleEditEntity(cat)}><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-rose-500/20 text-rose-400" onClick={() => handleDeleteEntity(cat.id)}><Trash2 className="h-3 w-3" /></Button></div></div>))}{filteredCategories.length === 0 && <div className="py-4 text-center text-sm text-slate-400">No categories found</div>}</div><div className="border-t border-slate-700 pt-4"><Label className="text-slate-300">{editingEntityId ? "Edit" : "Add"} Category</Label><div className="mt-2 flex gap-2"><Input placeholder="Name" value={entityForm.name} onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })} className="flex-1 bg-slate-800/50 border-slate-700 text-slate-200" /><Button onClick={handleEntitySubmit} disabled={loading} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white">{editingEntityId ? "Update" : "Add"}</Button>{editingEntityId && (<Button variant="ghost" onClick={() => { setEditingEntityId(null); setEntityForm({ name: "", type: "" }); }} className="text-slate-300 hover:bg-slate-800">Cancel</Button>)}</div></div></TabsContent>

                {/* Brands Tab */}
                <TabsContent value="brand" className="space-y-4"><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Search brands..." value={entitySearch} onChange={(e) => setEntitySearch(e.target.value)} className="pl-8 bg-slate-800/50 border-slate-700 text-slate-200" /></div><div className="max-h-80 space-y-1 overflow-y-auto">{filteredBrands.map((brand) => (<div key={brand.id} className="flex items-center justify-between rounded-xl bg-slate-800/30 backdrop-blur-sm px-3 py-2"><span className="capitalize font-medium text-slate-200">{brand.name}</span><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-amber-500/20 text-slate-300" onClick={() => handleEditEntity(brand)}><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-rose-500/20 text-rose-400" onClick={() => handleDeleteEntity(brand.id)}><Trash2 className="h-3 w-3" /></Button></div></div>))}{filteredBrands.length === 0 && <div className="py-4 text-center text-sm text-slate-400">No brands found</div>}</div><div className="border-t border-slate-700 pt-4"><Label className="text-slate-300">{editingEntityId ? "Edit" : "Add"} Brand</Label><div className="mt-2 flex gap-2"><Input placeholder="Name" value={entityForm.name} onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })} className="flex-1 bg-slate-800/50 border-slate-700 text-slate-200" /><Button onClick={handleEntitySubmit} disabled={loading} className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white">{editingEntityId ? "Update" : "Add"}</Button>{editingEntityId && (<Button variant="ghost" onClick={() => { setEditingEntityId(null); setEntityForm({ name: "", type: "" }); }} className="text-slate-300 hover:bg-slate-800">Cancel</Button>)}</div></div></TabsContent>

                {/* Packaging Tab */}
                <TabsContent value="packaging" className="space-y-4"><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Search packaging..." value={entitySearch} onChange={(e) => setEntitySearch(e.target.value)} className="pl-8 bg-slate-800/50 border-slate-700 text-slate-200" /></div><div className="max-h-80 space-y-1 overflow-y-auto">{filteredPackagings.map((pkg) => (<div key={pkg.id} className="flex items-center justify-between rounded-xl bg-slate-800/30 backdrop-blur-sm px-3 py-2"><span className="capitalize font-medium text-slate-200">{pkg.name}</span><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-blue-500/20 text-slate-300" onClick={() => handleEditEntity(pkg)}><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-rose-500/20 text-rose-400" onClick={() => handleDeleteEntity(pkg.id)}><Trash2 className="h-3 w-3" /></Button></div></div>))}{filteredPackagings.length === 0 && <div className="py-4 text-center text-sm text-slate-400">No packaging types found</div>}</div><div className="border-t border-slate-700 pt-4"><Label className="text-slate-300">{editingEntityId ? "Edit" : "Add"} Packaging</Label><div className="mt-2 flex gap-2"><Select value={entityForm.type} onValueChange={(v) => setEntityForm({ ...entityForm, type: v })}><SelectTrigger className="flex-1 bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700"><SelectItem value="bottle">Bottle</SelectItem><SelectItem value="can">Can</SelectItem><SelectItem value="plastic">Plastic</SelectItem></SelectContent></Select><Button onClick={handleEntitySubmit} disabled={loading} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white">{editingEntityId ? "Update" : "Add"}</Button>{editingEntityId && (<Button variant="ghost" onClick={() => { setEditingEntityId(null); setEntityForm({ name: "", type: "" }); }} className="text-slate-300 hover:bg-slate-800">Cancel</Button>)}</div></div></TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          {/* Price Create/Edit Dialog */}
          <Dialog open={priceFormOpen} onOpenChange={setPriceFormOpen}>
            <DialogContent className="max-w-lg border-0 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl rounded-2xl">
              <DialogHeader><DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{editingPrice ? "Edit Price" : "Create New Price"}</DialogTitle><DialogDescription className="text-slate-400">{editingPrice ? "Update price details" : "Add a new price record for the product"}</DialogDescription></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label className="text-slate-300">Product</Label><Select value={priceForm.productId} onValueChange={(v) => setPriceForm(prev => ({ ...prev, productId: v }))} disabled={!!editingPrice}><SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200"><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent className="bg-slate-800 border-slate-700">{products.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2"><Label className="text-slate-300">Buy Price per Box ({CURRENCY}) *</Label><Input type="number" step="0.01" value={priceForm.buyPricePerBox} onChange={(e) => setPriceForm(prev => ({ ...prev, buyPricePerBox: e.target.value }))} className="bg-slate-800/50 border-slate-700 text-slate-200" required /></div>
                  <div className="space-y-2"><Label className="text-slate-300">Sell Price per Box ({CURRENCY})</Label><Input type="number" step="0.01" value={priceForm.sellPricePerBox} onChange={(e) => setPriceForm(prev => ({ ...prev, sellPricePerBox: e.target.value }))} className="bg-slate-800/50 border-slate-700 text-slate-200" /></div>
                  <div className="space-y-2 md:col-span-2"><Label className="text-slate-300">Sell Price per Unit ({CURRENCY})</Label><Input type="number" step="0.01" value={priceForm.sellPricePerUnit} onChange={(e) => setPriceForm(prev => ({ ...prev, sellPricePerUnit: e.target.value }))} className="bg-slate-800/50 border-slate-700 text-slate-200" /></div>
                  <div className="flex items-center gap-2 md:col-span-2"><Switch checked={priceForm.allowLoss} onCheckedChange={(c) => setPriceForm(prev => ({ ...prev, allowLoss: c }))} /><Label className="text-slate-300">Allow Loss (sell below cost)</Label></div>
                  <div className="space-y-2"><Label className="text-slate-300">Start Date</Label><Input type="datetime-local" value={priceForm.startAt} onChange={(e) => setPriceForm(prev => ({ ...prev, startAt: e.target.value }))} className="bg-slate-800/50 border-slate-700 text-slate-200" /><p className="text-xs text-slate-400">Leave empty to use current time</p></div>
                  <div className="space-y-2"><Label className="text-slate-300">End Date (optional)</Label><Input type="datetime-local" value={priceForm.endAt} onChange={(e) => setPriceForm(prev => ({ ...prev, endAt: e.target.value }))} className="bg-slate-800/50 border-slate-700 text-slate-200" /><p className="text-xs text-slate-400">Leave empty for active price</p></div>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setPriceFormOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button><Button onClick={handlePriceSubmit} disabled={loading || !priceForm.productId || !priceForm.buyPricePerBox} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white">{editingPrice ? "Update" : "Create"} Price</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Price History Popover (CRUD enabled with stock totals) */}
          <Dialog open={priceHistoryDialogOpen} onOpenChange={setPriceHistoryDialogOpen}>
            <DialogContent className="min-w-5xl border-0 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-indigo-300">Price History for {selectedProductForHistory?.name}</DialogTitle>
                <DialogDescription>Create, edit, activate, or delete price records. Shows total stocked and remaining units for each price.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      if (selectedProductForHistory) {
                        openCreatePriceDialog(selectedProductForHistory);
                        setPriceHistoryDialogOpen(false);
                      }
                    }}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add New Price
                  </Button>
                </div>
                {priceHistoryLoading ? (
                  <div className="py-8 text-center"><RefreshCw className="h-8 w-8 animate-spin mx-auto text-slate-400" /></div>
                ) : priceHistoryList.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No price records found for this product.</div>
                ) : (
                  <div className="overflow-x-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-slate-300">Buy/Box</TableHead>
                          <TableHead className="text-slate-300">Sell/Box</TableHead>
                          <TableHead className="text-slate-300">Sell/Unit</TableHead>
                          <TableHead className="text-slate-300">Start Date</TableHead>
                          <TableHead className="text-slate-300">End Date</TableHead>
                          <TableHead className="text-slate-300">Allow Loss</TableHead>
                          <TableHead className="text-slate-300">Total Stocked (units)</TableHead>
                          <TableHead className="text-slate-300">Remaining (units)</TableHead>
                          <TableHead className="text-slate-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {priceHistoryList.map((price) => {
                          const summary = priceSummaryMap[price.id] || { totalUnits: 0, remainingUnits: 0 };
                          return (
                            <TableRow key={price.id} className="border-slate-800">
                              <TableCell className="font-mono text-slate-300">{formatNumber(price.buyPricePerBox)} {CURRENCY}</TableCell>
                              <TableCell className="font-mono text-slate-300">{formatNumber(price.sellPricePerBox)} {CURRENCY}</TableCell>
                              <TableCell className="font-mono text-slate-300">{formatNumber(price.sellPricePerUnit)} {CURRENCY}</TableCell>
                              <TableCell className="text-slate-300">{new Date(price.startAt).toLocaleDateString()}</TableCell>
                              <TableCell>{price.endAt ? new Date(price.endAt).toLocaleDateString() : <Badge className="bg-emerald-600">Active</Badge>}</TableCell>
                              <TableCell>{price.allowLoss ? <Badge variant="destructive">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                              <TableCell className="font-mono text-cyan-300">{formatInteger(summary.totalUnits)}</TableCell>
                              <TableCell className="font-mono text-emerald-300">{formatInteger(summary.remainingUnits)}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {price.endAt !== null && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        await handleActivatePrice(price.id, price.productId);
                                        await fetchPriceHistoryForProduct(price.productId);
                                      }}
                                      disabled={activatingPriceId === price.id}
                                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                                    >
                                      <Zap className="h-3 w-3 mr-1" /> Activate
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      openEditPriceDialog(price);
                                      setPriceHistoryDialogOpen(false);
                                    }}
                                    className="text-slate-300 hover:bg-slate-800"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={async () => {
                                      await handleDeletePrice(price.id, price.productId);
                                      await fetchPriceHistoryForProduct(price.productId);
                                    }}
                                    className="text-rose-400 hover:bg-slate-800"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPriceHistoryDialogOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
}