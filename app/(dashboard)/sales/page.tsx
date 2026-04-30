"use client";

import React, { JSX, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
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
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Plus,
  AlertCircle,
  Search,
  ChevronRight,
  TrendingUp,
  Clock,
  X,
  Calendar,
  Sparkles,
  ShoppingCart,
  Banknote,
  Receipt,
  ArrowLeftRight,
  Edit3,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

// ==================== TYPES ====================
interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  priceId: string;
  unitType: "box" | "single";
  quantity: number;
  totalUnits: number;
  productName: string;
  unitPrice: number;
  costPrice: number;
  totalPrice: number;
  totalCost: number;
}

interface Sale {
  id: string;
  customerName: string;
  description?: string | null;
  totalAmount: number;
  totalCost: number;
  profit: number;
  paymentType: "cash" | "credit";
  paymentStatus: "paid" | "pending";
  createdAt: string;
  updatedAt: string;
  items?: SaleItem[];
}

interface Product {
  id: string;
  name: string;
  unitsPerBox: number;
  prices?: Array<{
    id: string;
    buyPricePerBox: number;
    sellPricePerBox: number;
    sellPricePerUnit?: number;          // optional stored single unit price
    allowLoss: boolean;
  }>;
}

interface Stock {
  id: string;
  productId: string;
  boxQuantity: number;
  singleQuantity: number;
  containerType: "box" | "single";
}

interface NewSaleItemForm {
  productId: string;
  unitType: "box" | "single";
  quantity: number;
  customUnitPrice: string;
}

// ==================== CONSTANTS ====================
const CURRENCY = "ETB";
const UNDO_TIMEOUT_SECONDS = 5;

type DatePreset = "today" | "7d" | "30d" | "90d" | "6m" | "12m" | "all";
const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: "Today", value: "today" },
  { label: "Last Week", value: "7d" },
  { label: "Last Month", value: "30d" },
  { label: "Last 3 Months", value: "90d" },
  { label: "Last 6 Months", value: "6m" },
  { label: "Last Year", value: "12m" },
  { label: "All Time", value: "all" },
];

// Safe numeric conversion
const toNum = (val: any): number => {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

// ==================== REUSABLE FORM DIALOG ====================
interface SaleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  customerName: string;
  onCustomerNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  paymentType: "cash" | "credit";
  onPaymentTypeChange: (value: "cash" | "credit") => void;
  paymentStatus: "paid" | "pending";
  onPaymentStatusChange: (value: "paid" | "pending") => void;
  items: NewSaleItemForm[];
  setItems: React.Dispatch<React.SetStateAction<NewSaleItemForm[]>>;
  products: Product[];
  stocks: Stock[];
  getSingleStockInfo: (productId: string, neededSingles: number) => {
    possible: boolean;
    boxesNeeded: number;
  };
  quickPicks: { productId: string; name: string }[];
  onSubmit: () => void;
  submitLabel: string;
  loading: boolean;
  onCancel: () => void;
}

function SaleFormDialog({
  open,
  onOpenChange,
  title,
  customerName,
  onCustomerNameChange,
  description,
  onDescriptionChange,
  paymentType,
  onPaymentTypeChange,
  paymentStatus,
  onPaymentStatusChange,
  items,
  setItems,
  products,
  stocks,
  getSingleStockInfo,
  quickPicks,
  onSubmit,
  submitLabel,
  loading,
  onCancel,
}: SaleFormDialogProps) {
  const addItem = () =>
    setItems([
      ...items,
      { productId: "", unitType: "single", quantity: 1, customUnitPrice: "" },
    ]);

  const removeItem = (idx: number) =>
    setItems(items.filter((_, i) => i !== idx));

  const updateItem = (
    idx: number,
    field: keyof NewSaleItemForm,
    value: string | number
  ) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  // Pricing derivatives
  const getPricingInfo = (item: NewSaleItemForm) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product || !product.prices?.[0])
      return { boxBuyPrice: 0, boxSellPrice: 0, costPerUnit: 0, computedUnitSell: 0, storedSingleSell: undefined as number | undefined };
    const price = product.prices[0];
    const boxBuyPrice = toNum(price.buyPricePerBox);
    const boxSellPrice = toNum(price.sellPricePerBox);
    const unitsPerBox = product.unitsPerBox || 1;
    const costPerUnit = boxBuyPrice / unitsPerBox;
    const computedUnitSell = boxSellPrice / unitsPerBox;
    const storedSingleSell = price.sellPricePerUnit && price.sellPricePerUnit > 0
      ? toNum(price.sellPricePerUnit)
      : undefined;
    return { boxBuyPrice, boxSellPrice, costPerUnit, computedUnitSell, storedSingleSell };
  };

  // Effective unit price for display/calculation
  const getEffectiveUnitPrice = (item: NewSaleItemForm) => {
    const { boxSellPrice, computedUnitSell, storedSingleSell } = getPricingInfo(item);
    if (item.customUnitPrice.trim() !== "")
      return toNum(item.customUnitPrice);
    if (item.unitType === "box")
      return boxSellPrice;
    // For singles: use explicitly stored single price if available, else computed
    return storedSingleSell ?? computedUnitSell;
  };

  const preview = useMemo(() => {
    let amount = 0;
    let cost = 0;
    items.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return;
      const price = product.prices?.[0];
      if (!price) return;
      const boxBuyPrice = toNum(price.buyPricePerBox);
      const boxSellPrice = toNum(price.sellPricePerBox);
      const unitsPerBox = product.unitsPerBox || 1;
      const costPerUnit = boxBuyPrice / unitsPerBox;
      const computedUnitSell = boxSellPrice / unitsPerBox;
      const storedSingleSell = price.sellPricePerUnit && price.sellPricePerUnit > 0
        ? toNum(price.sellPricePerUnit)
        : undefined;

      const effectiveUnitPrice = getEffectiveUnitPrice(item);
      const costPrice = item.unitType === "box" ? boxBuyPrice : costPerUnit;
      amount += effectiveUnitPrice * item.quantity;
      cost += costPrice * item.quantity;
    });
    return { amount, cost, profit: amount - cost };
  }, [items, products]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            {title}
          </DialogTitle>
          <DialogDescription>
            {title === "New Sale"
              ? "Add items, set payment, and optionally override prices."
              : "Modify sale details and items."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Customer Name + Description */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                placeholder="Auto-generated if left empty"
                className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="e.g., Walk-in customer"
                className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
              />
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select value={paymentType} onValueChange={onPaymentTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select
                value={paymentStatus}
                onValueChange={onPaymentStatusChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Picks */}
          {quickPicks.length > 0 && (
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                📌 Quick Picks (most sold)
              </Label>
              <div className="flex flex-wrap gap-2">
                {quickPicks.map((qp) => (
                  <Badge
                    key={qp.productId}
                    variant="outline"
                    className="cursor-pointer bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100"
                    onClick={() => {
                      const existing = items.find(
                        (i) => i.productId === qp.productId
                      );
                      if (existing) {
                        setItems(
                          items.map((i) =>
                            i.productId === qp.productId
                              ? { ...i, quantity: i.quantity + 1 }
                              : i
                          )
                        );
                      } else {
                        setItems([
                          ...items,
                          {
                            productId: qp.productId,
                            unitType: "single",
                            quantity: 1,
                            customUnitPrice: "",
                          },
                        ]);
                      }
                    }}
                  >
                    + {qp.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Items</Label>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {items.map((item, idx) => {
                const product = products.find((p) => p.id === item.productId);
                const pricing = getPricingInfo(item);
                const effectiveUnitPrice = getEffectiveUnitPrice(item);

                const customEnabled = item.customUnitPrice.trim() !== "";
                // The displayed default unit price for the "Custom" checkbox placeholder
                const defaultDisplayUnit =
                  item.unitType === "box"
                    ? pricing.boxSellPrice
                    : (pricing.storedSingleSell ?? pricing.computedUnitSell);

                const singleInfo =
                  item.unitType === "single"
                    ? getSingleStockInfo(item.productId, item.quantity)
                    : null;

                return (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border"
                  >
                    <Select
                      value={item.productId}
                      onValueChange={(v) => updateItem(idx, "productId", v)}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={item.unitType}
                      onValueChange={(v) => updateItem(idx, "unitType", v)}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="box">Box</SelectItem>
                        <SelectItem value="single">Single</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(
                          idx,
                          "quantity",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-20"
                    />
                    {/* Custom price toggle and input */}
                    <div className="flex items-center gap-1 ml-2">
                      <Checkbox
                        id={`custom-${idx}`}
                        checked={customEnabled}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            updateItem(
                              idx,
                              "customUnitPrice",
                              defaultDisplayUnit.toFixed(2)
                            );
                          } else {
                            updateItem(idx, "customUnitPrice", "");
                          }
                        }}
                      />
                      <Label
                        htmlFor={`custom-${idx}`}
                        className="text-xs cursor-pointer"
                      >
                        Custom
                      </Label>
                      {customEnabled && (
                        <Input
                          type="number"
                          step="0.01"
                          value={item.customUnitPrice}
                          onChange={(e) =>
                            updateItem(idx, "customUnitPrice", e.target.value)
                          }
                          className="w-24 text-xs"
                          placeholder={defaultDisplayUnit.toFixed(2)}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm ml-auto">
                      <span className="text-muted-foreground">
                        {effectiveUnitPrice.toFixed(2)} {CURRENCY} × {item.quantity}
                      </span>
                      <Badge variant="outline" className="font-mono">
                        {(effectiveUnitPrice * item.quantity).toFixed(2)} {CURRENCY}
                      </Badge>
                    </div>
                    {/* Price Breakdown */}
                    {product && (
                      <div className="w-full grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-1">
                        <div>
                          Buy: {pricing.boxBuyPrice.toFixed(2)}/box · {pricing.costPerUnit.toFixed(3)}/unit
                        </div>
                        <div>
                          Sell: {pricing.boxSellPrice.toFixed(2)}/box · {pricing.computedUnitSell.toFixed(3)}/unit
                          {pricing.storedSingleSell !== undefined && (
                            <span className="block">
                              Single price: {pricing.storedSingleSell.toFixed(3)}/unit
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Stock warning when breaking boxes */}
                    {singleInfo && singleInfo.boxesNeeded > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full text-xs text-amber-600 flex items-center gap-1 mt-1">
                            <ArrowLeftRight className="h-3 w-3" /> Breaks{" "}
                            {singleInfo.boxesNeeded} box(es)
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          Not enough singles – a box will be broken automatically.
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeItem(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              {items.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Add your first item.
                </p>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-4 border border-emerald-200">
            <div className="flex justify-between text-sm">
              <span>Total Cost:</span>
              <span className="font-mono">
                {preview.cost.toFixed(2)} {CURRENCY}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Amount:</span>
              <span className="font-mono font-bold text-emerald-700">
                {preview.amount.toFixed(2)} {CURRENCY}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold mt-1">
              <span>Profit:</span>
              <span
                className={cn(
                  "font-mono",
                  preview.profit >= 0 ? "text-emerald-600" : "text-rose-600"
                )}
              >
                {preview.profit.toFixed(2)} {CURRENCY}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={loading || items.length === 0}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
          >
            {loading ? "Processing..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== MAIN PAGE COMPONENT ====================
export default function SalesPage(): JSX.Element {
  // ---------- STATE ----------
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterPaymentType, setFilterPaymentType] = useState<"all" | "cash" | "credit">("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<"all" | "paid" | "pending">("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [saleDescription, setSaleDescription] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">("paid");
  const [saleItems, setSaleItems] = useState<NewSaleItemForm[]>([]);

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ totalSales: 0, totalRevenue: 0, totalProfit: 0, pendingPayments: 0 });

  // ---------- DATA FETCHING ----------
  const fetchSales = async () => {
    try {
      const res = await api.get<{ success: boolean; data: Sale[] }>("/sales");
      const raw = res.data.data || [];
      const normalized = raw.map((s) => ({
        ...s,
        totalAmount: toNum(s.totalAmount),
        totalCost: toNum(s.totalCost),
        profit: toNum(s.profit),
        items: (s.items || []).map((i) => ({
          ...i,
          unitPrice: toNum(i.unitPrice),
          costPrice: toNum(i.costPrice),
          totalPrice: toNum(i.totalPrice),
          totalCost: toNum(i.totalCost),
        })),
      }));
      setSales(normalized);
    } catch {
      toast.error("Failed to load sales");
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get<{ data: Product[] }>("/products?limit=1000");
      const raw = res.data.data || [];
      const normalized = raw.map((p) => ({
        ...p,
        prices:
          p.prices?.map((pr) => ({
            ...pr,
            buyPricePerBox: toNum(pr.buyPricePerBox),
            sellPricePerBox: toNum(pr.sellPricePerBox),
            sellPricePerUnit: pr.sellPricePerUnit != null ? toNum(pr.sellPricePerUnit) : undefined,
          })) || [],
      }));
      setProducts(normalized);
    } catch {
      toast.error("Failed to load products");
    }
  };

  const fetchStocks = async () => {
    try {
      const res = await api.get<Stock[]>("/stocks");
      setStocks(res.data || []);
    } catch {
      // non-critical
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchSales(), fetchProducts(), fetchStocks()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Stats
  useEffect(() => {
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
    const pendingPayments = sales.filter((s) => s.paymentStatus === "pending").length;
    setStats({ totalSales, totalRevenue, totalProfit, pendingPayments });
  }, [sales]);

  // Quick picks
  const quickPicks = useMemo(() => {
    const counts: Record<string, { count: number; name: string }> = {};
    sales.forEach((sale) =>
      sale.items?.forEach((item) => {
        if (!counts[item.productId])
          counts[item.productId] = { count: 0, name: item.productName };
        counts[item.productId].count += item.quantity;
      })
    );
    return Object.entries(counts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([productId, data]) => ({ productId, name: data.name }));
  }, [sales]);

  // Date filter
  const isWithinDatePreset = (dateStr: string, preset: DatePreset) => {
    if (preset === "all") return true;
    const d = new Date(dateStr);
    const now = new Date();
    switch (preset) {
      case "today": return d.toDateString() === now.toDateString();
      case "7d": return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      case "30d": return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      case "90d": return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
      case "6m": return d >= new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      case "12m": return d >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      default: return true;
    }
  };

  const filteredSales = useMemo(() => {
    let f = sales;
    if (search) {
      f = f.filter(
        (s) =>
          s.customerName.toLowerCase().includes(search.toLowerCase()) ||
          s.items?.some((i) => i.productName.toLowerCase().includes(search.toLowerCase()))
      );
    }
    if (filterPaymentType !== "all") f = f.filter((s) => s.paymentType === filterPaymentType);
    if (filterPaymentStatus !== "all") f = f.filter((s) => s.paymentStatus === filterPaymentStatus);
    f = f.filter((s) => isWithinDatePreset(s.createdAt, datePreset));
    return f;
  }, [sales, search, filterPaymentType, filterPaymentStatus, datePreset]);

  // Stock helpers
  const getStockForProduct = (pid: string) => stocks.find((s) => s.productId === pid);
  const getSingleStockInfo = (pid: string, needed: number) => {
    const stock = getStockForProduct(pid);
    const product = products.find((p) => p.id === pid);
    if (!stock || !product) return { possible: false, boxesNeeded: 0 };
    if (stock.singleQuantity >= needed) return { possible: true, boxesNeeded: 0 };
    const missing = needed - stock.singleQuantity;
    const boxes = Math.ceil(missing / product.unitsPerBox);
    return { possible: stock.boxQuantity >= boxes, boxesNeeded: boxes };
  };

  const validateItems = (items: NewSaleItemForm[]) => {
    for (const item of items) {
      if (!item.productId || item.quantity <= 0) return false;
      const stock = getStockForProduct(item.productId);
      const product = products.find((p) => p.id === item.productId);
      if (!stock || !product) return false;
      if (item.unitType === "box" && stock.boxQuantity < item.quantity) return false;
      if (item.unitType === "single") {
        const { possible } = getSingleStockInfo(item.productId, item.quantity);
        if (!possible) return false;
      }
    }
    return true;
  };

  const buildPayload = () => {
    const finalCustomerName =
      customerName.trim() ||
      `Walk-in ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return {
      customerName: finalCustomerName,
      description: saleDescription || undefined,
      paymentType,
      paymentStatus,
      items: saleItems.map((item) => {
        const obj: {
          productId: string;
          quantity: number;
          unitType: "box" | "single";
          customUnitPrice?: number;
        } = {
          productId: item.productId,
          quantity: item.quantity,
          unitType: item.unitType,
        };
        if (item.customUnitPrice.trim() !== "")
          obj.customUnitPrice = toNum(item.customUnitPrice);
        return obj;
      }),
    };
  };

  const handleCreateSale = async () => {
    if (!validateItems(saleItems)) return toast.error("Invalid or insufficient stock");
    try {
      setLoading(true);
      await api.post("/sales", buildPayload());
      toast.success("Sale created");
      setCreateDialogOpen(false);
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to create sale");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSale = async () => {
    if (!editingSale) return;
    if (!validateItems(saleItems)) return toast.error("Invalid or insufficient stock");
    try {
      setLoading(true);
      await api.put(`/sales/${editingSale.id}`, buildPayload());
      toast.success("Sale updated");
      setEditDialogOpen(false);
      setEditingSale(null);
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update sale");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSale = (id: string) => {
    toast("Sale will be deleted", {
      duration: UNDO_TIMEOUT_SECONDS * 1000,
      action: { label: "Undo", onClick: () => {} },
      onAutoClose: async () => {
        try {
          await api.delete(`/sales/${id}`);
          toast.success("Sale deleted");
          await fetchAll();
        } catch {
          toast.error("Failed to delete sale");
        }
      },
    });
  };

  const openCreateDialog = () => {
    setCustomerName("");
    setSaleDescription("");
    setPaymentType("cash");
    setPaymentStatus("paid");
    setSaleItems([]);
    setCreateDialogOpen(true);
  };

  const openEditDialog = (sale: Sale) => {
    setEditingSale(sale);
    setCustomerName(sale.customerName);
    setSaleDescription(sale.description || "");
    setPaymentType(sale.paymentType);
    setPaymentStatus(sale.paymentStatus);
    setSaleItems(
      sale.items?.map((i) => {
        const product = products.find((p) => p.id === i.productId);
        const price = product?.prices?.[0];
        const boxSellPrice = toNum(price?.sellPricePerBox);
        const unitsPerBox = product?.unitsPerBox ?? 1;
        const computedUnitSell = boxSellPrice / unitsPerBox;
        const storedSingleSell = price?.sellPricePerUnit && price.sellPricePerUnit > 0
          ? toNum(price.sellPricePerUnit)
          : undefined;

        const defaultSinglePrice = storedSingleSell ?? computedUnitSell;
        const defaultUnit = i.unitType === "box" ? boxSellPrice : defaultSinglePrice;

        return {
          productId: i.productId,
          unitType: i.unitType,
          quantity: i.quantity,
          customUnitPrice:
            Math.abs(i.unitPrice - defaultUnit) > 0.001
              ? i.unitPrice.toFixed(2)
              : "",
        };
      }) || []
    );
    setEditDialogOpen(true);
  };

  const toggleRowExpanded = (id: string) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openFullItemDetail = (sale: Sale) => {
    setSelectedSale(sale);
    setDetailsDialogOpen(true);
  };

  // ==================== RENDER ====================
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                Sales Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                <Sparkles className="h-3 w-3 inline text-amber-500" /> Smart pricing & edit capabilities
              </p>
            </div>
            <Button onClick={openCreateDialog} className="shadow-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0">
              <Plus className="mr-2 h-4 w-4" /> New Sale
            </Button>
          </motion.div>

          {/* Stats Cards */}
          {loading && !sales.length ? (
            <div className="grid gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid gap-4 md:grid-cols-4">
              <Card className="border-l-4 border-l-emerald-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{stats.totalSales}</p>
                    <ShoppingCart className="h-8 w-8 text-emerald-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{stats.totalRevenue.toFixed(2)} {CURRENCY}</p>
                    <Banknote className="h-8 w-8 text-blue-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-rose-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">{stats.totalProfit.toFixed(2)} {CURRENCY}</p>
                    <TrendingUp className="h-8 w-8 text-rose-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{stats.pendingPayments}</p>
                    <Clock className="h-8 w-8 text-amber-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Filters & Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterPaymentType} onValueChange={(v) => setFilterPaymentType(v as typeof filterPaymentType)}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPaymentStatus} onValueChange={(v) => setFilterPaymentStatus(v as typeof filterPaymentStatus)}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                <SelectTrigger className="w-[150px]"><Calendar className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="h-8 px-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                {filteredSales.length} sales
              </Badge>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sale / product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sales Table */}
          <Card className="overflow-hidden border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-b-2 border-slate-300 dark:border-slate-600">
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !filteredSales.length ? (
                  [...Array(5)].map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)
                ) : filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <Receipt className="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-muted-foreground">No sales found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => {
                    const isExpanded = expandedRows.has(sale.id);
                    const itemCount = sale.items?.length || 0;
                    return (
                      <React.Fragment key={sale.id}>
                        <TableRow className="group cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30" onClick={() => toggleRowExpanded(sale.id)}>
                          <TableCell>
                            <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                              <ChevronRight className="h-4 w-4" />
                            </motion.div>
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate flex items-center gap-1">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {sale.customerName}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {new Date(sale.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={sale.paymentType === "cash" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                              {sale.paymentType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={sale.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"}>
                              {sale.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>{itemCount} items</TableCell>
                          <TableCell className="font-mono">
                            {sale.totalAmount.toFixed(2)} {CURRENCY}
                          </TableCell>
                          <TableCell className={cn("font-mono", sale.profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                            {sale.profit >= 0 ? "+" : ""}{sale.profit.toFixed(2)} {CURRENCY}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEditDialog(sale); }}>
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteSale(sale.id); }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && sale.items && (
                          <TableRow>
                            <TableCell colSpan={9} className="p-0">
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="px-6 py-5 bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex justify-between mb-3">
                                  <h4 className="font-semibold">Items ({itemCount})</h4>
                                  {itemCount > 5 && (
                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openFullItemDetail(sale); }}>
                                      View All
                                    </Button>
                                  )}
                                </div>
                                <Table className="min-w-[600px]">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Product</TableHead>
                                      <TableHead>Unit</TableHead>
                                      <TableHead>Qty</TableHead>
                                      <TableHead>Unit Price</TableHead>
                                      <TableHead>Total</TableHead>
                                      <TableHead>Cost</TableHead>
                                      <TableHead>Buy (Box/Unit)</TableHead>
                                      <TableHead>Sell (Box/Unit)</TableHead>
                                      <TableHead>Single Price</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {sale.items.slice(0, 5).map((item) => {
                                      const product = products.find((p) => p.id === item.productId);
                                      const price = product?.prices?.[0];
                                      const boxBuyPrice = toNum(price?.buyPricePerBox);
                                      const boxSellPrice = toNum(price?.sellPricePerBox);
                                      const unitsPerBox = product?.unitsPerBox ?? 1;
                                      const costPerUnit = boxBuyPrice / unitsPerBox;
                                      const computedUnitSell = boxSellPrice / unitsPerBox;
                                      const storedSingleSell = price?.sellPricePerUnit && price.sellPricePerUnit > 0
                                        ? toNum(price.sellPricePerUnit)
                                        : undefined;
                                      return (
                                        <TableRow key={item.id}>
                                          <TableCell className="font-medium">{item.productName}</TableCell>
                                          <TableCell className="capitalize">{item.unitType}</TableCell>
                                          <TableCell>{item.quantity}</TableCell>
                                          <TableCell className="font-mono">{item.unitPrice.toFixed(2)} {CURRENCY}</TableCell>
                                          <TableCell className="font-mono">{item.totalPrice.toFixed(2)} {CURRENCY}</TableCell>
                                          <TableCell className="font-mono">{item.totalCost.toFixed(2)} {CURRENCY}</TableCell>
                                          <TableCell className="text-xs">{boxBuyPrice.toFixed(2)} / {costPerUnit.toFixed(3)}</TableCell>
                                          <TableCell className="text-xs">{boxSellPrice.toFixed(2)} / {computedUnitSell.toFixed(3)}</TableCell>
                                          <TableCell className="text-xs">{storedSingleSell != null ? storedSingleSell.toFixed(3) : "—"}</TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                                <div className="flex justify-end gap-8 text-sm border-t pt-4 mt-2">
                                  <div><span className="text-muted-foreground">Total Cost:</span> <span className="font-mono">{sale.totalCost.toFixed(2)} {CURRENCY}</span></div>
                                  <div><span className="text-muted-foreground">Total Amount:</span> <span className="font-mono">{sale.totalAmount.toFixed(2)} {CURRENCY}</span></div>
                                  <div><span className="text-muted-foreground">Profit:</span> <span className="font-mono font-bold text-emerald-600">{sale.profit.toFixed(2)} {CURRENCY}</span></div>
                                </div>
                              </motion.div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Create Dialog */}
        <SaleFormDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          title="New Sale"
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          description={saleDescription}
          onDescriptionChange={setSaleDescription}
          paymentType={paymentType}
          onPaymentTypeChange={setPaymentType}
          paymentStatus={paymentStatus}
          onPaymentStatusChange={setPaymentStatus}
          items={saleItems}
          setItems={setSaleItems}
          products={products}
          stocks={stocks}
          getSingleStockInfo={getSingleStockInfo}
          quickPicks={quickPicks}
          onSubmit={handleCreateSale}
          submitLabel="Complete Sale"
          loading={loading}
          onCancel={() => setCreateDialogOpen(false)}
        />

        {/* Edit Dialog */}
        <SaleFormDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          title="Edit Sale"
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          description={saleDescription}
          onDescriptionChange={setSaleDescription}
          paymentType={paymentType}
          onPaymentTypeChange={setPaymentType}
          paymentStatus={paymentStatus}
          onPaymentStatusChange={setPaymentStatus}
          items={saleItems}
          setItems={setSaleItems}
          products={products}
          stocks={stocks}
          getSingleStockInfo={getSingleStockInfo}
          quickPicks={quickPicks}
          onSubmit={handleUpdateSale}
          submitLabel="Update Sale"
          loading={loading}
          onCancel={() => setEditDialogOpen(false)}
        />

        {/* Fullscreen Detail Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Sale Items – {selectedSale?.customerName}</DialogTitle>
              <DialogDescription>
                {selectedSale?.items?.length} items · {new Date(selectedSale?.createdAt || "").toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            {selectedSale && (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Buy (Box/Unit)</TableHead>
                      <TableHead>Sell (Box/Unit)</TableHead>
                      <TableHead>Single Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items?.map((item) => {
                      const product = products.find((p) => p.id === item.productId);
                      const price = product?.prices?.[0];
                      const boxBuyPrice = toNum(price?.buyPricePerBox);
                      const boxSellPrice = toNum(price?.sellPricePerBox);
                      const unitsPerBox = product?.unitsPerBox ?? 1;
                      const costPerUnit = boxBuyPrice / unitsPerBox;
                      const computedUnitSell = boxSellPrice / unitsPerBox;
                      const storedSingleSell = price?.sellPricePerUnit && price.sellPricePerUnit > 0
                        ? toNum(price.sellPricePerUnit)
                        : undefined;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="capitalize">{item.unitType}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className="font-mono">{item.unitPrice.toFixed(2)} {CURRENCY}</TableCell>
                          <TableCell className="font-mono">{item.totalPrice.toFixed(2)} {CURRENCY}</TableCell>
                          <TableCell className="font-mono">{item.totalCost.toFixed(2)} {CURRENCY}</TableCell>
                          <TableCell className="text-xs">{boxBuyPrice.toFixed(2)} / {costPerUnit.toFixed(3)}</TableCell>
                          <TableCell className="text-xs">{boxSellPrice.toFixed(2)} / {computedUnitSell.toFixed(3)}</TableCell>
                          <TableCell className="text-xs">{storedSingleSell != null ? storedSingleSell.toFixed(3) : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="flex justify-end gap-8 text-sm border-t pt-4">
                  <div><span className="text-muted-foreground">Total Cost:</span> <span className="font-mono font-medium">{selectedSale.totalCost.toFixed(2)} {CURRENCY}</span></div>
                  <div><span className="text-muted-foreground">Total Amount:</span> <span className="font-mono font-medium">{selectedSale.totalAmount.toFixed(2)} {CURRENCY}</span></div>
                  <div><span className="text-muted-foreground">Profit:</span> <span className="font-mono font-bold text-emerald-600">{selectedSale.profit.toFixed(2)} {CURRENCY}</span></div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}