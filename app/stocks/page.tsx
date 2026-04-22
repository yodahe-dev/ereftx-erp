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
  ChevronDown,
  ChevronRight,
  Box,
  RefreshCw,
  Pin,
  PinOff,
  ArrowLeftRight,
  Calculator,
  Settings,
  TrendingUp,
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
  AlertTriangle,
  Gift,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

// ==================== TYPES ====================
interface ProductPrice {
  id: string;
  productId: string;
  buyPricePerBox: number;
  sellPricePerBox: number;
  sellPricePerUnit: number;
  startAt: string;
  endAt: string | null;
  allowLoss: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  unitsPerBox: number;
  categoryId: string;
  brandId: string;
  packagingId: string;
  prices?: ProductPrice[];
  buyPricePerBox?: number;
  sellPricePerBox?: number;
  sellPricePerUnit?: number;
  allowLoss?: boolean;
  currentPriceId?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

interface Packaging {
  id: string;
  type: string;
}

interface Stock {
  id: string;
  productId: string;
  boxQuantity: number;
  singleQuantity: number;
  containerType: ContainerType;
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

enum ContainerType {
  BOX = "box",
  SINGLE = "single",
}

interface ProductsResponse {
  data: Product[];
  page: number;
  hasMore: boolean;
  total: number;
}

interface ExchangeForm {
  sourceProductId: string;
  targetProductId: string;
  exchangeType: "box" | "single";
  sourceQuantity: number;
  notes: string;
}

interface ProductFormData {
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  packagingId: string;
  unitsPerBox: number;
  buyPricePerBox: string;
  sellPricePerBox: string;
  sellPricePerUnit: string;
  allowLoss: boolean;
}

interface StockHistoryRecord {
  id: string;
  productId: string;
  actionType: "initial" | "restock" | "adjust" | "exchange";
  boxQuantityBefore: number;
  singleQuantityBefore: number;
  boxQuantityAfter: number;
  singleQuantityAfter: number;
  boxQuantityChange: number;
  singleQuantityChange: number;
  notes: string | null;
  isFree: boolean;
  createdAt: string;
}

type AdjustmentMode = "add" | "subtract" | "set";
type FilterType = "all" | "box" | "single";

// ==================== CONSTANTS ====================
const STORAGE_FILTER_KEY = "stock-filter-preference";
const STORAGE_PINNED_FILTER_KEY = "stock-pinned-filter";
const PRODUCTS_PAGE_LIMIT = 1000;
const DEFAULT_UNITS_PER_BOX = 24;
const CURRENCY = "ETB";
const LOW_STOCK_BOX_THRESHOLD = 2;
const UNDO_TIMEOUT_SECONDS = 5;

export default function StockPage(): JSX.Element {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [isFilterPinned, setIsFilterPinned] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    boxQuantity: "",
    singleQuantity: "",
    containerType: ContainerType.BOX as ContainerType,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [restockStock, setRestockStock] = useState<Stock | null>(null);
  const [restockBoxes, setRestockBoxes] = useState(0);
  const [restockSingles, setRestockSingles] = useState(0);
  const [restockNotes, setRestockNotes] = useState("");
  const [restockNewBuyPrice, setRestockNewBuyPrice] = useState("");
  const [restockIsFree, setRestockIsFree] = useState(false);

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustStock, setAdjustStock] = useState<Stock | null>(null);
  const [adjustMode, setAdjustMode] = useState<AdjustmentMode>("set");
  const [adjustBoxes, setAdjustBoxes] = useState(0);
  const [adjustSingles, setAdjustSingles] = useState(0);
  const [adjustExactBoxes, setAdjustExactBoxes] = useState(0);
  const [adjustExactSingles, setAdjustExactSingles] = useState(0);

  const [exchangeDialogOpen, setExchangeDialogOpen] = useState(false);
  const [exchangeForm, setExchangeForm] = useState<ExchangeForm>({
    sourceProductId: "",
    targetProductId: "",
    exchangeType: "box",
    sourceQuantity: 1,
    notes: "",
  });
  const [exchangeLoading, setExchangeLoading] = useState(false);

  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [activeEntityTab, setActiveEntityTab] = useState<
    "products" | "category" | "brand" | "packaging"
  >("products");
  const [entitySearch, setEntitySearch] = useState("");

  const [productForm, setProductForm] = useState<ProductFormData>({
    name: "",
    description: "",
    categoryId: "",
    brandId: "",
    packagingId: "",
    unitsPerBox: DEFAULT_UNITS_PER_BOX,
    buyPricePerBox: "",
    sellPricePerBox: "",
    sellPricePerUnit: "",
    allowLoss: false,
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [priceHistoryDialogOpen, setPriceHistoryDialogOpen] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] =
    useState<Product | null>(null);

  const [stockHistoryDialogOpen, setStockHistoryDialogOpen] = useState(false);
  const [selectedStockForHistory, setSelectedStockForHistory] = useState<Stock | null>(null);
  const [stockHistoryRecords, setStockHistoryRecords] = useState<StockHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [entityForm, setEntityForm] = useState({ name: "", type: "" });
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalBoxes: 0,
    totalSingles: 0,
    lowStockItems: 0,
    totalProfitPotential: 0,
    totalInventoryValue: 0,
  });

  // Delete state removed; we'll use sonner toast with undo

  // ==================== LOCALSTORAGE SYNC ====================
  useEffect(() => {
    setIsClient(true);
    const pinned = localStorage.getItem(STORAGE_PINNED_FILTER_KEY);
    if (pinned === "all" || pinned === "box" || pinned === "single") {
      setFilterType(pinned as FilterType);
      setIsFilterPinned(true);
    } else {
      const saved = localStorage.getItem(STORAGE_FILTER_KEY);
      if (saved === "all" || saved === "box" || saved === "single") {
        setFilterType(saved as FilterType);
      }
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem(STORAGE_FILTER_KEY, filterType);
    if (isFilterPinned) {
      localStorage.setItem(STORAGE_PINNED_FILTER_KEY, filterType);
    } else {
      localStorage.removeItem(STORAGE_PINNED_FILTER_KEY);
    }
  }, [filterType, isFilterPinned, isClient]);

  // ==================== FETCH ALL PRODUCTS (paginated) ====================
  const fetchAllProducts = async (): Promise<Product[]> => {
    try {
      let allProducts: Product[] = [];
      let currentPage = 1;
      let hasMore = true;
      while (hasMore) {
        const response = await api.get<ProductsResponse>(
          `/products?page=${currentPage}&limit=${PRODUCTS_PAGE_LIMIT}`
        );
        const { data, hasMore: more } = response.data;
        const productsWithPrice = data.map((product) => {
          const latestPrice = product.prices?.[0];
          return {
            ...product,
            buyPricePerBox: latestPrice?.buyPricePerBox ?? 0,
            sellPricePerBox: latestPrice?.sellPricePerBox ?? 0,
            sellPricePerUnit: latestPrice?.sellPricePerUnit ?? 0,
            allowLoss: latestPrice?.allowLoss ?? false,
            currentPriceId: latestPrice?.id,
          };
        });
        allProducts = [...allProducts, ...productsWithPrice];
        hasMore = more;
        currentPage++;
      }
      return allProducts;
    } catch (error) {
      console.error("Failed to fetch products:", error);
      return [];
    }
  };

  // ==================== FETCH ALL DATA ====================
  const fetchAll = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const [stocksRes, productsData, c, b, pkg] = await Promise.all([
        api.get<Stock[]>("/stocks"),
        fetchAllProducts(),
        api.get<Category[]>("/categories"),
        api.get<Brand[]>("/brands"),
        api.get<Packaging[]>("/packagings"),
      ]);
      const stocksWithProducts = stocksRes.data.map((stock) => ({
        ...stock,
        product: productsData.find((prod) => prod.id === stock.productId),
      }));
      setStocks(stocksWithProducts);
      setProducts(productsData);
      setCategories(c.data);
      setBrands(b.data);
      setPackagings(pkg.data);

      const totalBoxes = stocksWithProducts.reduce((sum, s) => sum + s.boxQuantity, 0);
      const totalSingles = stocksWithProducts.reduce((sum, s) => sum + s.singleQuantity, 0);
      const lowStockItems = stocksWithProducts.filter(
        (s) => s.boxQuantity === 0 && s.singleQuantity === 0
      ).length;
      let totalProfit = 0;
      let totalValue = 0;
      stocksWithProducts.forEach((stock) => {
        const p = stock.product;
        if (p && p.buyPricePerBox) {
          const totalUnits = stock.boxQuantity * p.unitsPerBox + stock.singleQuantity;
          const costPerUnit = p.buyPricePerBox / p.unitsPerBox;
          totalValue += totalUnits * costPerUnit;
          if (p.sellPricePerUnit) {
            const profitPerUnit = p.sellPricePerUnit - costPerUnit;
            totalProfit += totalUnits * profitPerUnit;
          }
        }
      });
      setStats({
        totalProducts: productsData.length,
        totalBoxes,
        totalSingles,
        lowStockItems,
        totalProfitPotential: totalProfit,
        totalInventoryValue: totalValue,
      });
    } catch (e) {
      const message = (e as any)?.response?.data?.message || "Failed to load data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ==================== FILTERED STOCKS ====================
  const filteredStocks = useMemo(() => {
    let filtered = stocks;
    filtered = filtered.filter((s) =>
      s.product?.name.toLowerCase().includes(search.toLowerCase())
    );
    if (filterType === "box") {
      filtered = filtered.filter((s) => s.containerType === ContainerType.BOX);
    } else if (filterType === "single") {
      filtered = filtered.filter((s) => s.containerType === ContainerType.SINGLE);
    }
    return filtered;
  }, [stocks, search, filterType]);

  // ==================== HELPERS ====================
  const getCategoryName = (id: string): string =>
    categories.find((c) => c.id === id)?.name ?? "—";
  const getBrandName = (id: string): string =>
    brands.find((b) => b.id === id)?.name ?? "—";
  const getPackagingType = (id: string): string =>
    packagings.find((p) => p.id === id)?.type ?? "—";

  const calculateStockProfit = (stock: Stock) => {
    const product = stock.product;
    if (
      !product ||
      !product.buyPricePerBox ||
      !product.sellPricePerBox ||
      !product.sellPricePerUnit
    ) {
      return {
        boxProfit: 0,
        singleProfit: 0,
        costPerUnit: 0,
        unitProfit: 0,
        totalCost: 0,
        totalRevenue: 0,
        totalProfit: 0,
      };
    }
    const costPerUnit = product.buyPricePerBox / product.unitsPerBox;
    const unitProfit = product.sellPricePerUnit - costPerUnit;
    const boxProfitPerBox = product.sellPricePerBox - product.buyPricePerBox;
    const totalUnits = stock.boxQuantity * product.unitsPerBox + stock.singleQuantity;
    const totalCost =
      stock.boxQuantity * product.buyPricePerBox + stock.singleQuantity * costPerUnit;
    const totalRevenue =
      stock.boxQuantity * product.sellPricePerBox +
      stock.singleQuantity * product.sellPricePerUnit;
    const totalProfit = totalRevenue - totalCost;
    const boxProfit = stock.boxQuantity * boxProfitPerBox;
    const singleProfit = stock.singleQuantity * unitProfit;
    return {
      boxProfit,
      singleProfit,
      costPerUnit,
      unitProfit,
      totalCost,
      totalRevenue,
      totalProfit,
    };
  };

  // ==================== STOCK HISTORY ====================
  const fetchStockHistory = async (productId: string) => {
    try {
      setHistoryLoading(true);
      const response = await api.get<StockHistoryRecord[]>(`/stocks/history/${productId}`);
      setStockHistoryRecords(response.data);
    } catch (e) {
      toast.error("Failed to load stock history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openStockHistory = (stock: Stock) => {
    setSelectedStockForHistory(stock);
    fetchStockHistory(stock.productId);
    setStockHistoryDialogOpen(true);
  };

  // ==================== STOCK CRUD ====================
  const resetStockForm = () => {
    setForm({
      productId: "",
      boxQuantity: "",
      singleQuantity: "",
      containerType: ContainerType.BOX,
    });
    setEditingId(null);
  };

  const openStockForm = (stock?: Stock) => {
    if (stock) {
      setForm({
        productId: stock.productId,
        boxQuantity: String(stock.boxQuantity),
        singleQuantity: String(stock.singleQuantity),
        containerType: stock.containerType,
      });
      setEditingId(stock.id);
    } else {
      resetStockForm();
    }
    setFormDialogOpen(true);
  };

  const handleStockQuantityChange = (
    field: "boxQuantity" | "singleQuantity",
    value: string
  ) => {
    const num = Number(value) || 0;
    const product = products.find((p) => p.id === form.productId);
    const unitsPerBox = product?.unitsPerBox || 1;
    if (field === "boxQuantity") {
      setForm((prev) => ({
        ...prev,
        boxQuantity: value,
        singleQuantity:
          prev.containerType === ContainerType.BOX
            ? String(num * unitsPerBox)
            : prev.singleQuantity,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        singleQuantity: value,
        boxQuantity:
          prev.containerType === ContainerType.SINGLE
            ? String(Math.floor(num / unitsPerBox))
            : prev.boxQuantity,
      }));
    }
  };

  const handleStockContainerTypeChange = (type: ContainerType) => {
    const product = products.find((p) => p.id === form.productId);
    const unitsPerBox = product?.unitsPerBox || 1;
    const boxNum = Number(form.boxQuantity) || 0;
    const singleNum = Number(form.singleQuantity) || 0;
    if (type === ContainerType.BOX) {
      setForm((prev) => ({
        ...prev,
        containerType: type,
        singleQuantity: String(boxNum * unitsPerBox),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        containerType: type,
        boxQuantity: String(Math.floor(singleNum / unitsPerBox)),
      }));
    }
  };

  const handleStockProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setForm((prev) => ({ ...prev, productId, boxQuantity: "0", singleQuantity: "0" }));
  };

  const handleStockSubmit = async () => {
    if (!form.productId) {
      toast.error("Please select a product");
      return;
    }

    let payload: any = {
      productId: form.productId,
      containerType: form.containerType,
    };

    if (form.containerType === ContainerType.BOX) {
      payload.boxQuantity = Number(form.boxQuantity) || 0;
      payload.singleQuantity = 0;
    } else {
      payload.singleQuantity = Number(form.singleQuantity) || 0;
      payload.boxQuantity = 0;
    }

    try {
      setLoading(true);
      if (editingId) {
        await api.put(`/stocks/${editingId}`, payload);
        toast.success("Stock updated");
      } else {
        await api.post("/stocks", payload);
        toast.success("Stock created");
      }
      setFormDialogOpen(false);
      resetStockForm();
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to save stock");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStock = (id: string) => {
    // Use sonner toast with undo
    toast("Stock will be deleted", {
      description: "You have 5 seconds to undo this action.",
      duration: UNDO_TIMEOUT_SECONDS * 1000,
      action: {
        label: "Undo",
        onClick: () => {
          // User clicked undo, cancel deletion
          // Nothing to do, toast will close
        },
      },
      onAutoClose: async () => {
        // Toast closed automatically after timeout (no undo clicked)
        try {
          await api.delete(`/stocks/${id}`);
          toast.success("Stock deleted");
          await fetchAll();
        } catch (e) {
          toast.error("Failed to delete stock");
        }
      },
    });
  };

  // ==================== RESTOCK ====================
  const openRestockDialog = (stock: Stock) => {
    setRestockStock(stock);
    setRestockBoxes(0);
    setRestockSingles(0);
    setRestockNotes("");
    setRestockNewBuyPrice("");
    setRestockIsFree(false);
    setRestockDialogOpen(true);
  };

  const handleRestock = async () => {
    if (!restockStock) return;
    if (restockBoxes === 0 && restockSingles === 0) {
      toast.error("Please add at least one box or single");
      return;
    }
    try {
      setLoading(true);
      const payload: any = {
        addBoxes: restockBoxes,
        addSingles: restockSingles,
        notes: restockNotes || "Manual restock",
        isFree: restockIsFree,
      };
      if (restockNewBuyPrice && Number(restockNewBuyPrice) > 0) {
        payload.newBuyPricePerBox = Number(restockNewBuyPrice);
      }
      await api.post(`/stocks/${restockStock.id}/restock`, payload);
      toast.success(`Restocked ${restockBoxes} boxes and ${restockSingles} singles`);
      setRestockDialogOpen(false);
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Restock failed");
    } finally {
      setLoading(false);
    }
  };

  // ==================== ADJUSTMENT ====================
  const openAdjustDialog = (stock: Stock) => {
    setAdjustStock(stock);
    setAdjustMode("set");
    setAdjustBoxes(0);
    setAdjustSingles(0);
    setAdjustExactBoxes(stock.boxQuantity);
    setAdjustExactSingles(stock.singleQuantity);
    setAdjustDialogOpen(true);
  };

  const handleAdjustSubmit = async () => {
    if (!adjustStock) return;
    let newBoxes = adjustStock.boxQuantity;
    let newSingles = adjustStock.singleQuantity;
    if (adjustMode === "add") {
      newBoxes += adjustBoxes;
      newSingles += adjustSingles;
    } else if (adjustMode === "subtract") {
      newBoxes -= adjustBoxes;
      newSingles -= adjustSingles;
      if (newBoxes < 0) newBoxes = 0;
      if (newSingles < 0) newSingles = 0;
    } else {
      newBoxes = adjustExactBoxes;
      newSingles = adjustExactSingles;
    }
    const product = products.find((p) => p.id === adjustStock.productId);
    const unitsPerBox = product?.unitsPerBox || 1;
    const extraBoxes = Math.floor(newSingles / unitsPerBox);
    newBoxes += extraBoxes;
    newSingles = newSingles % unitsPerBox;

    try {
      setLoading(true);
      await api.put(`/stocks/${adjustStock.id}`, {
        boxQuantity: newBoxes,
        singleQuantity: newSingles,
      });
      toast.success("Stock adjusted successfully");
      setAdjustDialogOpen(false);
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Adjustment failed");
    } finally {
      setLoading(false);
    }
  };

  // ==================== EXCHANGE ====================
  const handleExchange = async () => {
    if (!exchangeForm.sourceProductId || !exchangeForm.targetProductId) {
      toast.error("Please select both products");
      return;
    }
    if (exchangeForm.sourceProductId === exchangeForm.targetProductId) {
      toast.error("Cannot exchange a product with itself");
      return;
    }
    if (exchangeForm.sourceQuantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    try {
      setExchangeLoading(true);
      const response = await api.post("/stocks/exchange", {
        sourceProductId: exchangeForm.sourceProductId,
        targetProductId: exchangeForm.targetProductId,
        exchangeType: exchangeForm.exchangeType,
        sourceQuantity: exchangeForm.sourceQuantity,
        notes: exchangeForm.notes,
      });
      toast.success(response.data.message);
      setExchangeDialogOpen(false);
      setExchangeForm({
        sourceProductId: "",
        targetProductId: "",
        exchangeType: "box",
        sourceQuantity: 1,
        notes: "",
      });
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Exchange failed");
    } finally {
      setExchangeLoading(false);
    }
  };

  // ==================== PRODUCT CRUD ====================
  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      categoryId: "",
      brandId: "",
      packagingId: "",
      unitsPerBox: DEFAULT_UNITS_PER_BOX,
      buyPricePerBox: "",
      sellPricePerBox: "",
      sellPricePerUnit: "",
      allowLoss: false,
    });
    setEditingProductId(null);
  };

  const openProductForm = (product?: Product) => {
    if (product) {
      setProductForm({
        name: product.name,
        description: product.description || "",
        categoryId: product.categoryId,
        brandId: product.brandId,
        packagingId: product.packagingId,
        unitsPerBox: product.unitsPerBox,
        buyPricePerBox: String(product.buyPricePerBox || 0),
        sellPricePerBox: String(product.sellPricePerBox || 0),
        sellPricePerUnit: String(product.sellPricePerUnit || 0),
        allowLoss: product.allowLoss || false,
      });
      setEditingProductId(product.id);
    } else {
      resetProductForm();
    }
  };

  const handleProductSubmit = async () => {
    if (
      !productForm.name ||
      !productForm.categoryId ||
      !productForm.brandId ||
      !productForm.packagingId
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    const basicPayload = {
      name: productForm.name,
      description: productForm.description || undefined,
      categoryId: productForm.categoryId,
      brandId: productForm.brandId,
      packagingId: productForm.packagingId,
      unitsPerBox: Number(productForm.unitsPerBox) || DEFAULT_UNITS_PER_BOX,
    };
    const pricePayload = {
      buyPricePerBox: Number(productForm.buyPricePerBox) || 0,
      sellPricePerBox: Number(productForm.sellPricePerBox) || 0,
      sellPricePerUnit: Number(productForm.sellPricePerUnit) || 0,
      allowLoss: productForm.allowLoss,
    };
    try {
      setLoading(true);
      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, basicPayload);
        const currentProduct = products.find((p) => p.id === editingProductId);
        if (
          currentProduct &&
          (currentProduct.buyPricePerBox !== pricePayload.buyPricePerBox ||
            currentProduct.sellPricePerBox !== pricePayload.sellPricePerBox ||
            currentProduct.sellPricePerUnit !== pricePayload.sellPricePerUnit ||
            currentProduct.allowLoss !== pricePayload.allowLoss)
        ) {
          await api.post(`/products/${editingProductId}/prices`, pricePayload);
        }
        toast.success("Product updated");
      } else {
        await api.post("/products", { ...basicPayload, ...pricePayload });
        toast.success("Product created");
      }
      resetProductForm();
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const handleProductDelete = async (id: string) => {
    if (!confirm("Delete this product? This will also delete its stock record.")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to delete product");
    }
  };

  const openPriceHistory = (product: Product) => {
    setSelectedProductForHistory(product);
    setPriceHistoryDialogOpen(true);
  };

  // ==================== ENTITY CRUD ====================
  const getEntityEndpoint = (): string => {
    switch (activeEntityTab) {
      case "category":
        return "/categories";
      case "brand":
        return "/brands";
      case "packaging":
        return "/packagings";
      default:
        return "";
    }
  };

  const handleEntitySubmit = async () => {
    const endpoint = getEntityEndpoint();
    if (!endpoint) return;
    const payload =
      activeEntityTab === "packaging"
        ? { type: entityForm.type }
        : { name: entityForm.name };
    if (
      (activeEntityTab !== "packaging" && !entityForm.name) ||
      (activeEntityTab === "packaging" && !entityForm.type)
    ) {
      toast.error("Name / type is required");
      return;
    }
    try {
      setLoading(true);
      if (editingEntityId) {
        await api.put(`${endpoint}/${editingEntityId}`, payload);
        toast.success(`${activeEntityTab} updated`);
      } else {
        await api.post(endpoint, payload);
        toast.success(`${activeEntityTab} created`);
      }
      setEntityForm({ name: "", type: "" });
      setEditingEntityId(null);
      await fetchAll();
    } catch (e) {
      toast.error(`Failed to save ${activeEntityTab}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEntity = (item: Category | Brand | Packaging) => {
    setEditingEntityId(item.id);
    if (activeEntityTab === "packaging") {
      setEntityForm({ name: "", type: (item as Packaging).type });
    } else {
      setEntityForm({ name: (item as Category | Brand).name, type: "" });
    }
  };

  const handleDeleteEntity = async (id: string) => {
    if (!confirm(`Delete this ${activeEntityTab}?`)) return;
    try {
      await api.delete(`${getEntityEndpoint()}/${id}`);
      toast.success(`${activeEntityTab} deleted`);
      await fetchAll();
    } catch (e) {
      toast.error(`Failed to delete ${activeEntityTab}`);
    }
  };

  const filteredProducts = useMemo(() => {
    const lower = entitySearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(lower));
  }, [products, entitySearch]);

  const filteredCategories = useMemo(() => {
    const lower = entitySearch.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(lower));
  }, [categories, entitySearch]);

  const filteredBrands = useMemo(() => {
    const lower = entitySearch.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(lower));
  }, [brands, entitySearch]);

  const filteredPackagings = useMemo(() => {
    const lower = entitySearch.toLowerCase();
    return packagings.filter((p) => p.type.toLowerCase().includes(lower));
  }, [packagings, entitySearch]);

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const productHasStock = (productId: string) =>
    stocks.some((s) => s.productId === productId);

  // ==================== RENDER ====================
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Stock Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Track inventory, manage exchanges, restock, and analyze profit
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEntityDialogOpen(true)}
                className="shadow-sm border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950"
              >
                <Settings className="mr-2 h-4 w-4" /> Manage
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExchangeDialogOpen(true)}
                className="shadow-sm border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950"
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" /> Exchange
              </Button>
              <Button
                onClick={() => openStockForm()}
                className="shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Stock
              </Button>
            </div>
          </motion.div>

          {loading && !stocks.length ? (
            <div className="grid gap-4 md:grid-cols-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="grid gap-4 md:grid-cols-6"
            >
              <Card className="border-l-4 border-l-emerald-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      {stats.totalProducts}
                    </p>
                    <Package className="h-8 w-8 text-emerald-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Boxes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      {stats.totalBoxes}
                    </p>
                    <Box className="h-8 w-8 text-blue-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Singles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                      {stats.totalSingles}
                    </p>
                    <Layers className="h-8 w-8 text-purple-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Out of Stock
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                      {stats.lowStockItems}
                    </p>
                    {stats.lowStockItems > 0 ? (
                      <TrendingDown className="h-8 w-8 text-amber-500 opacity-80" />
                    ) : (
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 opacity-80" />
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-rose-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Profit Potential
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                      {stats.totalProfitPotential.toFixed(0)} {CURRENCY}
                    </p>
                    <DollarSign className="h-8 w-8 text-rose-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-indigo-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Inventory Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                      {stats.totalInventoryValue.toFixed(0)} {CURRENCY}
                    </p>
                    <Archive className="h-8 w-8 text-indigo-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-1 shadow-sm">
                <Button
                  variant={filterType === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                  className={cn(
                    filterType === "all" &&
                      "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                  )}
                >
                  All
                </Button>
                <Button
                  variant={filterType === "box" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("box")}
                  className={cn(
                    filterType === "box" &&
                      "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                  )}
                >
                  Box
                </Button>
                <Button
                  variant={filterType === "single" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("single")}
                  className={cn(
                    filterType === "single" &&
                      "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                  )}
                >
                  Single
                </Button>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsFilterPinned(!isFilterPinned)}
                  >
                    {isFilterPinned ? (
                      <Pin className="h-4 w-4 text-indigo-500" />
                    ) : (
                      <PinOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFilterPinned
                    ? "Unpin default filter"
                    : "Pin current filter as default"}
                </TooltipContent>
              </Tooltip>
              <Badge
                variant="secondary"
                className="h-8 px-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700"
              >
                {filteredStocks.length} items
              </Badge>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive backdrop-blur-sm"
              >
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="overflow-hidden border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-b-2 border-slate-300 dark:border-slate-600">
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Boxes</TableHead>
                  <TableHead>Loose Singles</TableHead>
                  <TableHead>Total Units</TableHead>
                  <TableHead>Box Profit</TableHead>
                  <TableHead>Single Profit</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-52"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && !filteredStocks.length ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}>
                        <Skeleton className="h-12 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredStocks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-12 w-12 text-muted-foreground/50" />
                        <p className="text-muted-foreground">
                          No stock entries found.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStocks.map((stock) => {
                    const isExpanded = expandedRows.has(stock.id);
                    const product = stock.product;
                    const unitsPerBox = product?.unitsPerBox || 1;
                    const totalUnits =
                      stock.boxQuantity * unitsPerBox + stock.singleQuantity;
                    const looseSingles = stock.singleQuantity % unitsPerBox;
                    const expectedSingles = stock.boxQuantity * unitsPerBox;
                    const expectedBoxes = Math.floor(
                      stock.singleQuantity / unitsPerBox
                    );
                    const isMismatch =
                      stock.containerType === ContainerType.BOX
                        ? stock.singleQuantity !== expectedSingles
                        : stock.boxQuantity !== expectedBoxes;
                    const isLowStock = stock.boxQuantity < LOW_STOCK_BOX_THRESHOLD;
                    const profitData = calculateStockProfit(stock);
                    return (
                      <React.Fragment key={stock.id}>
                        <TableRow
                          className={cn(
                            "group cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 dark:hover:from-indigo-950/30 dark:hover:to-purple-950/30",
                            isMismatch && "bg-rose-50/50 dark:bg-rose-950/20",
                            isLowStock &&
                              !isMismatch &&
                              "border-l-4 border-l-amber-500"
                          )}
                          onClick={() => toggleRowExpanded(stock.id)}
                        >
                          <TableCell>
                            <motion.div
                              animate={{ rotate: isExpanded ? 90 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </motion.div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center">
                                <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <span>{product?.name || "—"}</span>
                              {isLowStock && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="destructive"
                                      className="ml-1 text-xs"
                                    >
                                      <AlertTriangle className="h-3 w-3 mr-0.5" /> Low Stock
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Only {stock.boxQuantity} box
                                    {stock.boxQuantity !== 1 ? "es" : ""} left
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="font-mono bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                            >
                              {stock.boxQuantity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="font-mono bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                            >
                              {looseSingles}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {totalUnits}
                          </TableCell>
                          <TableCell className="font-mono text-emerald-600 dark:text-emerald-400">
                            {profitData.boxProfit.toFixed(2)} {CURRENCY}
                          </TableCell>
                          <TableCell className="font-mono text-emerald-600 dark:text-emerald-400">
                            {profitData.singleProfit.toFixed(2)} {CURRENCY}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(stock.updatedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openRestockDialog(stock);
                                    }}
                                  >
                                    <PlusCircle className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Restock</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openAdjustDialog(stock);
                                    }}
                                  >
                                    <Calculator className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Adjust</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openStockForm(stock);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openStockHistory(stock);
                                    }}
                                  >
                                    <History className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Stock History</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (product) openPriceHistory(product);
                                    }}
                                  >
                                    <Clock className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Price History</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteStock(stock.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={9} className="p-0">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="px-6 py-5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50"
                              >
                                <div className="grid gap-6 md:grid-cols-4">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                                        <Package className="h-4 w-4 text-white" />
                                      </div>
                                      <h4 className="font-semibold text-indigo-700 dark:text-indigo-300">
                                        Product Details
                                      </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-white/50 dark:bg-slate-900/50 rounded-xl p-3 backdrop-blur-sm">
                                      <span className="text-muted-foreground">
                                        Category:
                                      </span>
                                      <span className="font-medium">
                                        {getCategoryName(product?.categoryId || "")}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Brand:
                                      </span>
                                      <span className="font-medium">
                                        {getBrandName(product?.brandId || "")}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Packaging:
                                      </span>
                                      <span className="font-medium capitalize">
                                        {getPackagingType(product?.packagingId || "")}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Units/Box:
                                      </span>
                                      <span className="font-mono font-medium">
                                        {unitsPerBox}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Buy Price/Box:
                                      </span>
                                      <span className="font-mono font-medium text-blue-600">
                                        {product?.buyPricePerBox?.toFixed(2)} {CURRENCY}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Sell Price/Box:
                                      </span>
                                      <span className="font-mono font-medium text-emerald-600">
                                        {product?.sellPricePerBox?.toFixed(2)} {CURRENCY}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Sell Price/Unit:
                                      </span>
                                      <span className="font-mono font-medium text-emerald-600">
                                        {product?.sellPricePerUnit?.toFixed(2)} {CURRENCY}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                        <Calculator className="h-4 w-4 text-white" />
                                      </div>
                                      <h4 className="font-semibold text-amber-700 dark:text-amber-300">
                                        Stock Breakdown
                                      </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-white/50 dark:bg-slate-900/50 rounded-xl p-3 backdrop-blur-sm">
                                      <span className="text-muted-foreground">
                                        Full Boxes:
                                      </span>
                                      <span className="font-mono font-medium">
                                        {stock.boxQuantity}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Loose Singles:
                                      </span>
                                      <span className="font-mono font-medium">
                                        {looseSingles}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Total Units:
                                      </span>
                                      <span className="font-mono font-bold text-lg">
                                        {totalUnits}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Box Equivalent:
                                      </span>
                                      <span className="font-mono font-medium">
                                        {(totalUnits / unitsPerBox).toFixed(1)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                        <DollarSign className="h-4 w-4 text-white" />
                                      </div>
                                      <h4 className="font-semibold text-emerald-700 dark:text-emerald-300">
                                        Financial Summary
                                      </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-white/50 dark:bg-slate-900/50 rounded-xl p-3 backdrop-blur-sm">
                                      <span className="text-muted-foreground">
                                        Cost per Unit:
                                      </span>
                                      <span className="font-mono font-medium text-blue-600">
                                        {profitData.costPerUnit.toFixed(2)} {CURRENCY}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Unit Profit:
                                      </span>
                                      <span className="font-mono font-medium text-emerald-600">
                                        {profitData.unitProfit.toFixed(2)} {CURRENCY}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Total Cost:
                                      </span>
                                      <span className="font-mono font-medium text-rose-600">
                                        {profitData.totalCost.toFixed(2)} {CURRENCY}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Total Revenue:
                                      </span>
                                      <span className="font-mono font-medium text-emerald-600">
                                        {profitData.totalRevenue.toFixed(2)} {CURRENCY}
                                      </span>
                                      <span className="text-muted-foreground font-semibold">
                                        Total Profit:
                                      </span>
                                      <span className="font-mono font-bold text-lg text-emerald-700 dark:text-emerald-300">
                                        {profitData.totalProfit.toFixed(2)} {CURRENCY}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={cn(
                                          "h-8 w-8 rounded-lg flex items-center justify-center",
                                          isMismatch
                                            ? "bg-gradient-to-br from-rose-500 to-pink-500"
                                            : "bg-gradient-to-br from-emerald-500 to-teal-500"
                                        )}
                                      >
                                        {isMismatch ? (
                                          <AlertCircle className="h-4 w-4 text-white" />
                                        ) : (
                                          <CheckCircle2 className="h-4 w-4 text-white" />
                                        )}
                                      </div>
                                      <h4
                                        className={cn(
                                          "font-semibold",
                                          isMismatch
                                            ? "text-rose-700 dark:text-rose-300"
                                            : "text-emerald-700 dark:text-emerald-300"
                                        )}
                                      >
                                        Consistency Check
                                      </h4>
                                    </div>
                                    {isMismatch ? (
                                      <div className="rounded-xl border-2 border-rose-200 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/30 p-4 backdrop-blur-sm">
                                        <p className="text-sm font-medium text-rose-700 dark:text-rose-300 flex items-center gap-1">
                                          <AlertCircle className="h-4 w-4" />
                                          Mismatch detected!
                                        </p>
                                        <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
                                          {stock.containerType === ContainerType.BOX
                                            ? `Expected ${expectedSingles} singles based on ${stock.boxQuantity} boxes.`
                                            : `Expected ${expectedBoxes} boxes based on ${stock.singleQuantity} singles.`}
                                        </p>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="mt-3 border-rose-300 dark:border-rose-700"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openAdjustDialog(stock);
                                          }}
                                        >
                                          <Calculator className="mr-2 h-3 w-3" />
                                          Fix Mismatch
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 p-4 backdrop-blur-sm">
                                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                          <CheckCircle2 className="h-4 w-4" />
                                          Quantities are consistent
                                        </p>
                                        <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                                          The box and single quantities align
                                          perfectly with the product's units per
                                          box.
                                        </p>
                                      </div>
                                    )}
                                  </div>
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

        {/* Stock Form Dialog */}
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogContent className="max-w-md border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {editingId ? "Edit Stock" : "Add Stock"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update stock quantities"
                  : "Add new stock entry (only if product has no stock yet)"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Product *</Label>
                <Select
                  value={form.productId}
                  onValueChange={handleStockProductSelect}
                  disabled={!!editingId}
                >
                  <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .filter((p) => !editingId || p.id === form.productId)
                      .map((p) => {
                        const hasStock = productHasStock(p.id);
                        return (
                          <SelectItem
                            key={p.id}
                            value={p.id}
                            disabled={!editingId && hasStock}
                          >
                            {p.name} ({p.unitsPerBox} per box)
                            {!editingId && hasStock && " (Already has stock)"}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
                {!editingId && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Only products without existing stock are shown. Use "Restock"
                    to add more.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Container Type *</Label>
                <Select
                  value={form.containerType}
                  onValueChange={(v) =>
                    handleStockContainerTypeChange(v as ContainerType)
                  }
                >
                  <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ContainerType.BOX}>
                      Box (primary)
                    </SelectItem>
                    <SelectItem value={ContainerType.SINGLE}>
                      Single (primary)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose which quantity to enter; the other auto‑calculates.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Box Quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.boxQuantity}
                    onChange={(e) =>
                      handleStockQuantityChange("boxQuantity", e.target.value)
                    }
                    disabled={form.containerType === ContainerType.SINGLE}
                    className="font-mono bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Single Quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.singleQuantity}
                    onChange={(e) =>
                      handleStockQuantityChange("singleQuantity", e.target.value)
                    }
                    disabled={form.containerType === ContainerType.BOX}
                    className="font-mono bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setFormDialogOpen(false)}
                className="border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleStockSubmit}
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              >
                {editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restock Dialog */}
        <Dialog open={restockDialogOpen} onOpenChange={setRestockDialogOpen}>
          <DialogContent className="max-w-md border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Restock Product
              </DialogTitle>
              <DialogDescription>
                {restockStock?.product?.name} - Current: {restockStock?.boxQuantity}{" "}
                boxes, {restockStock?.singleQuantity} singles
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Boxes to add</Label>
                  <Input
                    type="number"
                    min={0}
                    value={restockBoxes}
                    onChange={(e) => setRestockBoxes(Number(e.target.value) || 0)}
                    className="font-mono bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Singles to add</Label>
                  <Input
                    type="number"
                    min={0}
                    value={restockSingles}
                    onChange={(e) => setRestockSingles(Number(e.target.value) || 0)}
                    className="font-mono bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>New Buy Price per Box (optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder={`Current: ${restockStock?.product?.buyPricePerBox?.toFixed(
                    2
                  )} ${CURRENCY}`}
                  value={restockNewBuyPrice}
                  onChange={(e) => setRestockNewBuyPrice(e.target.value)}
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to keep current buy price.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={restockIsFree} onCheckedChange={setRestockIsFree} />
                <Label className="flex items-center gap-1">
                  <Gift className="h-4 w-4" /> Free Stock (no cost)
                </Label>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="e.g., Free stock, purchase, etc."
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRestockDialogOpen(false)}
                className="border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRestock}
                disabled={loading}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              >
                Confirm Restock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adjustment Dialog */}
        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent className="max-w-md border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Adjust Stock
              </DialogTitle>
              <DialogDescription>
                {adjustStock?.product?.name} - Current: {adjustStock?.boxQuantity}{" "}
                boxes, {adjustStock?.singleQuantity} singles
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Adjustment Mode</Label>
                <div className="flex gap-2">
                  <Button
                    variant={adjustMode === "add" ? "default" : "outline"}
                    className={cn(
                      "flex-1",
                      adjustMode === "add" &&
                        "bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                    )}
                    onClick={() => setAdjustMode("add")}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                  <Button
                    variant={adjustMode === "subtract" ? "default" : "outline"}
                    className={cn(
                      "flex-1",
                      adjustMode === "subtract" &&
                        "bg-gradient-to-r from-rose-600 to-pink-600 text-white"
                    )}
                    onClick={() => setAdjustMode("subtract")}
                  >
                    <MinusCircle className="mr-2 h-4 w-4" />
                    Subtract
                  </Button>
                  <Button
                    variant={adjustMode === "set" ? "default" : "outline"}
                    className={cn(
                      "flex-1",
                      adjustMode === "set" &&
                        "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                    )}
                    onClick={() => setAdjustMode("set")}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Set Exact
                  </Button>
                </div>
              </div>
              {adjustMode === "add" || adjustMode === "subtract" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Boxes to {adjustMode}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={adjustBoxes}
                      onChange={(e) => setAdjustBoxes(Number(e.target.value) || 0)}
                      className="font-mono bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Singles to {adjustMode}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={adjustSingles}
                      onChange={(e) => setAdjustSingles(Number(e.target.value) || 0)}
                      className="font-mono bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>New Box Quantity</Label>
                    <Input
                      type="number"
                      min={0}
                      value={adjustExactBoxes}
                      onChange={(e) =>
                        setAdjustExactBoxes(Number(e.target.value) || 0)
                      }
                      className="font-mono bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>New Single Quantity</Label>
                    <Input
                      type="number"
                      min={0}
                      value={adjustExactSingles}
                      onChange={(e) =>
                        setAdjustExactSingles(Number(e.target.value) || 0)
                      }
                      className="font-mono bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAdjustDialogOpen(false)}
                className="border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdjustSubmit}
                disabled={loading}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
              >
                Apply Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Exchange Dialog */}
        <Dialog open={exchangeDialogOpen} onOpenChange={setExchangeDialogOpen}>
          <DialogContent className="max-w-lg border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                <Repeat className="h-5 w-5" />
                Product Exchange
              </DialogTitle>
              <DialogDescription>
                Exchange products between inventory.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Source Product (giving away) *</Label>
                <Select
                  value={exchangeForm.sourceProductId}
                  onValueChange={(v) =>
                    setExchangeForm({ ...exchangeForm, sourceProductId: v })
                  }
                >
                  <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <SelectValue placeholder="Select product to give" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => {
                      const stock = stocks.find((s) => s.productId === p.id);
                      const totalUnits = stock
                        ? stock.boxQuantity * p.unitsPerBox + stock.singleQuantity
                        : 0;
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} (Stock: {totalUnits} units)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Product (receiving) *</Label>
                <Select
                  value={exchangeForm.targetProductId}
                  onValueChange={(v) =>
                    setExchangeForm({ ...exchangeForm, targetProductId: v })
                  }
                  disabled={!exchangeForm.sourceProductId}
                >
                  <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <SelectValue placeholder="Select product to receive" />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .filter((p) => p.id !== exchangeForm.sourceProductId)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Exchange Type</Label>
                  <Select
                    value={exchangeForm.exchangeType}
                    onValueChange={(v: "box" | "single") =>
                      setExchangeForm({ ...exchangeForm, exchangeType: v })
                    }
                  >
                    <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="box">Boxes</SelectItem>
                      <SelectItem value="single">Singles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={exchangeForm.sourceQuantity}
                    onChange={(e) =>
                      setExchangeForm({
                        ...exchangeForm,
                        sourceQuantity: Number(e.target.value) || 1,
                      })
                    }
                    className="font-mono bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="Exchange reason"
                  value={exchangeForm.notes}
                  onChange={(e) =>
                    setExchangeForm({ ...exchangeForm, notes: e.target.value })
                  }
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                />
              </div>
              {exchangeForm.sourceProductId && exchangeForm.targetProductId && (
                <div className="rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 p-4 text-sm border border-purple-200 dark:border-purple-800">
                  <p className="font-semibold mb-2 text-purple-700 dark:text-purple-300">
                    Exchange Preview:
                  </p>
                  {(() => {
                    const source = products.find(
                      (p) => p.id === exchangeForm.sourceProductId
                    );
                    const target = products.find(
                      (p) => p.id === exchangeForm.targetProductId
                    );
                    if (!source || !target) return null;
                    const sourceUnits =
                      exchangeForm.exchangeType === "box"
                        ? exchangeForm.sourceQuantity * source.unitsPerBox
                        : exchangeForm.sourceQuantity;
                    const targetBoxes = Math.floor(sourceUnits / target.unitsPerBox);
                    const targetSingles = sourceUnits % target.unitsPerBox;
                    return (
                      <div className="space-y-1 text-muted-foreground">
                        <p>
                          You give:{" "}
                          <span className="font-medium text-foreground">
                            {exchangeForm.sourceQuantity}{" "}
                            {exchangeForm.exchangeType}(s) of {source.name}
                          </span>
                        </p>
                        <p>
                          You receive:{" "}
                          <span className="font-medium text-foreground">
                            {targetBoxes} box(es) and {targetSingles} single(s) of{" "}
                            {target.name}
                          </span>
                        </p>
                        <p className="text-xs">
                          (Based on {source.unitsPerBox} units/box for source and{" "}
                          {target.unitsPerBox} for target)
                        </p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setExchangeDialogOpen(false)}
                className="border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExchange}
                disabled={exchangeLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                {exchangeLoading ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                )}
                Confirm Exchange
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stock History Dialog - IMPROVED SIZE */}
        <Dialog open={stockHistoryDialogOpen} onOpenChange={setStockHistoryDialogOpen}>
          <DialogContent className="min-w-[800px]  max-h-[80vh] border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Stock History
              </DialogTitle>
              <DialogDescription>
                {selectedStockForHistory?.product?.name} - Inventory change log
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto pr-1">
              {historyLoading ? (
                <div className="py-8 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : stockHistoryRecords.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No history records found.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                      <TableHead className="w-[180px]">Date</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                      <TableHead className="w-[120px]">Boxes</TableHead>
                      <TableHead className="w-[120px]">Singles</TableHead>
                      <TableHead className="w-[200px]">Change</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockHistoryRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(record.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {record.actionType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.boxQuantityAfter} (
                          {record.boxQuantityChange >= 0 ? "+" : ""}
                          {record.boxQuantityChange})
                        </TableCell>
                        <TableCell>
                          {record.singleQuantityAfter} (
                          {record.singleQuantityChange >= 0 ? "+" : ""}
                          {record.singleQuantityChange})
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {record.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStockHistoryDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Entity Management Dialog - IMPROVED SIZE */}
        <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
          <DialogContent className="min-w-[800px] max-h-[90vh] overflow-y-auto border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Quick Management
              </DialogTitle>
              <DialogDescription>
                Manage products, categories, brands, and packaging
              </DialogDescription>
            </DialogHeader>
            <Tabs
              value={activeEntityTab}
              onValueChange={(v) => {
                setActiveEntityTab(v as typeof activeEntityTab);
                setEditingProductId(null);
                setEditingEntityId(null);
                setEntityForm({ name: "", type: "" });
                setEntitySearch("");
              }}
            >
              <TabsList className="grid w-full grid-cols-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <TabsTrigger
                  value="products"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white rounded-lg"
                >
                  Products
                </TabsTrigger>
                <TabsTrigger
                  value="category"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white rounded-lg"
                >
                  Categories
                </TabsTrigger>
                <TabsTrigger
                  value="brand"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-lg"
                >
                  Brands
                </TabsTrigger>
                <TabsTrigger
                  value="packaging"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-lg"
                >
                  Packaging
                </TabsTrigger>
              </TabsList>

              {/* Products Tab */}
              <TabsContent value="products" className="space-y-4">
                <div className="border-b pb-4 mb-4">
                  <h4 className="font-semibold mb-3 text-indigo-700 dark:text-indigo-300">
                    {editingProductId ? "Edit Product" : "Add New Product"}
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Name *</Label>
                      <Input
                        value={productForm.name}
                        onChange={(e) =>
                          setProductForm({ ...productForm, name: e.target.value })
                        }
                        placeholder="Product name"
                        className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Units per Box</Label>
                      <Input
                        type="number"
                        min={1}
                        value={productForm.unitsPerBox}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            unitsPerBox: Number(e.target.value) || 1,
                          })
                        }
                        className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <Label>Description</Label>
                      <Input
                        value={productForm.description}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="Optional description"
                        className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Category *</Label>
                      <Select
                        value={productForm.categoryId}
                        onValueChange={(v) =>
                          setProductForm({ ...productForm, categoryId: v })
                        }
                      >
                        <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Brand *</Label>
                      <Select
                        value={productForm.brandId}
                        onValueChange={(v) =>
                          setProductForm({ ...productForm, brandId: v })
                        }
                      >
                        <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Packaging *</Label>
                      <Select
                        value={productForm.packagingId}
                        onValueChange={(v) =>
                          setProductForm({ ...productForm, packagingId: v })
                        }
                      >
                        <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {packagings.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Box Buy Price ({CURRENCY})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={productForm.buyPricePerBox}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            buyPricePerBox: e.target.value,
                          })
                        }
                        className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Box Sell Price ({CURRENCY})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={productForm.sellPricePerBox}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            sellPricePerBox: e.target.value,
                          })
                        }
                        className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Single Sell Price ({CURRENCY})</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={productForm.sellPricePerUnit}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            sellPricePerUnit: e.target.value,
                          })
                        }
                        className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <Switch
                        checked={productForm.allowLoss}
                        onCheckedChange={(c) =>
                          setProductForm({ ...productForm, allowLoss: c })
                        }
                      />
                      <Label>Allow Loss (sell below cost)</Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={resetProductForm}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleProductSubmit}
                      disabled={loading}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
                    >
                      {editingProductId ? "Update Product" : "Create Product"}
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={entitySearch}
                        onChange={(e) => setEntitySearch(e.target.value)}
                        className="pl-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {filteredProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-between rounded-xl border-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-3 hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-indigo-700 dark:text-indigo-300">
                            {product.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getCategoryName(product.categoryId)} |{" "}
                            {getBrandName(product.brandId)} |{" "}
                            {getPackagingType(product.packagingId)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Box: {product.buyPricePerBox?.toFixed(2)} /{" "}
                            {product.sellPricePerBox?.toFixed(2)} {CURRENCY} |
                            Single: {product.sellPricePerUnit?.toFixed(2)}{" "}
                            {CURRENCY}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                            onClick={() => openProductForm(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                            onClick={() => openPriceHistory(product)}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-destructive"
                            onClick={() => handleProductDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        No products found
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Categories Tab */}
              <TabsContent value="category" className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search categories..."
                    value={entitySearch}
                    onChange={(e) => setEntitySearch(e.target.value)}
                    className="pl-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  />
                </div>
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {filteredCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-3 py-2"
                    >
                      <span className="capitalize font-medium">{cat.name}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditEntity(cat)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteEntity(cat.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredCategories.length === 0 && (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      No categories found
                    </div>
                  )}
                </div>
                <div className="border-t pt-4">
                  <Label>{editingEntityId ? "Edit" : "Add"} Category</Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="Name"
                      value={entityForm.name}
                      onChange={(e) =>
                        setEntityForm({ ...entityForm, name: e.target.value })
                      }
                      className="flex-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                    />
                    <Button
                      onClick={handleEntitySubmit}
                      disabled={loading}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                    >
                      {editingEntityId ? "Update" : "Add"}
                    </Button>
                    {editingEntityId && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingEntityId(null);
                          setEntityForm({ name: "", type: "" });
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Brands Tab */}
              <TabsContent value="brand" className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search brands..."
                    value={entitySearch}
                    onChange={(e) => setEntitySearch(e.target.value)}
                    className="pl-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  />
                </div>
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {filteredBrands.map((brand) => (
                    <div
                      key={brand.id}
                      className="flex items-center justify-between rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-3 py-2"
                    >
                      <span className="capitalize font-medium">{brand.name}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditEntity(brand)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteEntity(brand.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredBrands.length === 0 && (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      No brands found
                    </div>
                  )}
                </div>
                <div className="border-t pt-4">
                  <Label>{editingEntityId ? "Edit" : "Add"} Brand</Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="Name"
                      value={entityForm.name}
                      onChange={(e) =>
                        setEntityForm({ ...entityForm, name: e.target.value })
                      }
                      className="flex-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                    />
                    <Button
                      onClick={handleEntitySubmit}
                      disabled={loading}
                      className="bg-gradient-to-r from-amber-600 to-orange-600 text-white"
                    >
                      {editingEntityId ? "Update" : "Add"}
                    </Button>
                    {editingEntityId && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingEntityId(null);
                          setEntityForm({ name: "", type: "" });
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Packaging Tab */}
              <TabsContent value="packaging" className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search packaging..."
                    value={entitySearch}
                    onChange={(e) => setEntitySearch(e.target.value)}
                    className="pl-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  />
                </div>
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {filteredPackagings.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="flex items-center justify-between rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-3 py-2"
                    >
                      <span className="capitalize font-medium">{pkg.type}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditEntity(pkg)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteEntity(pkg.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredPackagings.length === 0 && (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      No packaging types found
                    </div>
                  )}
                </div>
                <div className="border-t pt-4">
                  <Label>{editingEntityId ? "Edit" : "Add"} Packaging</Label>
                  <div className="mt-2 flex gap-2">
                    <Select
                      value={entityForm.type}
                      onValueChange={(v) =>
                        setEntityForm({ ...entityForm, type: v })
                      }
                    >
                      <SelectTrigger className="flex-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottle">Bottle</SelectItem>
                        <SelectItem value="can">Can</SelectItem>
                        <SelectItem value="plastic">Plastic</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleEntitySubmit}
                      disabled={loading}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                    >
                      {editingEntityId ? "Update" : "Add"}
                    </Button>
                    {editingEntityId && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingEntityId(null);
                          setEntityForm({ name: "", type: "" });
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Price History Dialog - IMPROVED SIZE */}
        <Dialog
          open={priceHistoryDialogOpen}
          onOpenChange={setPriceHistoryDialogOpen}
        >
          <DialogContent className="min-w-[600px] max-h-[70vh] border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Price History
              </DialogTitle>
              <DialogDescription>
                {selectedProductForHistory?.name} - Historical pricing records
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto pr-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Buy/Box</TableHead>
                    <TableHead>Sell/Box</TableHead>
                    <TableHead>Sell/Unit</TableHead>
                    <TableHead>Allow Loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedProductForHistory?.prices?.map((price) => (
                    <TableRow key={price.id}>
                      <TableCell>
                        {new Date(price.startAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {price.endAt
                          ? new Date(price.endAt).toLocaleDateString()
                          : "Current"}
                      </TableCell>
                      <TableCell>
                        {price.buyPricePerBox.toFixed(2)} {CURRENCY}
                      </TableCell>
                      <TableCell>
                        {price.sellPricePerBox.toFixed(2)} {CURRENCY}
                      </TableCell>
                      <TableCell>
                        {price.sellPricePerUnit.toFixed(2)} {CURRENCY}
                      </TableCell>
                      <TableCell>
                        {price.allowLoss ? (
                          <Badge className="bg-rose-500 text-white">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!selectedProductForHistory?.prices?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No price history available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPriceHistoryDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}