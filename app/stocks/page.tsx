"use client";

import React, { JSX, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  BarChart3,
  CheckCircle2,
  Repeat,
  PlusCircle,
  MinusCircle,
  Save,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

// ==================== TYPES ====================
interface Product {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  isActive: boolean;
  bottlesPerBox: number;
  categoryId: string;
  brandId: string;
  packagingId: string;
  boxBuyPrice: number;
  boxSellPrice: number;
  singleSellPrice: number;
  priceStartDate?: string;
  priceEndDate?: string | null;
  allowLoss?: boolean;
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
  sku: string;
  description: string;
  isActive: boolean;
  categoryId: string;
  brandId: string;
  packagingId: string;
  bottlesPerBox: number;
  boxBuyPrice: string;
  boxSellPrice: string;
  singleSellPrice: string;
}

type AdjustmentMode = "add" | "subtract" | "set";
type FilterType = "all" | "box" | "single";

// ==================== CONSTANTS ====================
const STORAGE_FILTER_KEY = "stock-filter-preference";
const STORAGE_PINNED_FILTER_KEY = "stock-pinned-filter";
const PRODUCTS_PAGE_LIMIT = 1000;
const DEFAULT_BOTTLES_PER_BOX = 24;
const CURRENCY = "ETB";

// ==================== MAIN PAGE ====================
export default function StockPage(): JSX.Element {
  // ---------- Data states ----------
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- UI filters ----------
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [isFilterPinned, setIsFilterPinned] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // ---------- Stock form dialog ----------
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    boxQuantity: "",
    singleQuantity: "",
    containerType: ContainerType.BOX as ContainerType,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // ---------- Restock dialog ----------
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [restockStock, setRestockStock] = useState<Stock | null>(null);
  const [restockBoxes, setRestockBoxes] = useState(0);
  const [restockSingles, setRestockSingles] = useState(0);

  // ---------- Adjustment dialog ----------
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustStock, setAdjustStock] = useState<Stock | null>(null);
  const [adjustMode, setAdjustMode] = useState<AdjustmentMode>("add");
  const [adjustBoxes, setAdjustBoxes] = useState(0);
  const [adjustSingles, setAdjustSingles] = useState(0);
  const [adjustExactBoxes, setAdjustExactBoxes] = useState(0);
  const [adjustExactSingles, setAdjustExactSingles] = useState(0);

  // ---------- Exchange dialog ----------
  const [exchangeDialogOpen, setExchangeDialogOpen] = useState(false);
  const [exchangeForm, setExchangeForm] = useState<ExchangeForm>({
    sourceProductId: "",
    targetProductId: "",
    exchangeType: "box",
    sourceQuantity: 1,
    notes: "",
  });
  const [exchangeLoading, setExchangeLoading] = useState(false);

  // ---------- Entity management dialog ----------
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [activeEntityTab, setActiveEntityTab] = useState<"products" | "category" | "brand" | "packaging">("products");
  const [entitySearch, setEntitySearch] = useState("");

  // Product form state
  const [productForm, setProductForm] = useState<ProductFormData>({
    name: "",
    sku: "",
    description: "",
    isActive: true,
    categoryId: "",
    brandId: "",
    packagingId: "",
    bottlesPerBox: DEFAULT_BOTTLES_PER_BOX,
    boxBuyPrice: "",
    boxSellPrice: "",
    singleSellPrice: "",
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Category/Brand/Packaging form state
  const [entityForm, setEntityForm] = useState({ name: "", type: "" });
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);

  // ---------- Expandable rows ----------
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // ---------- Statistics ----------
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalBoxes: 0,
    totalSingles: 0,
    lowStockItems: 0,
    totalProfitPotential: 0,
  });

  // ==================== LOCALSTORAGE SYNC ====================
  useEffect(() => {
    setIsClient(true);
    const pinned = localStorage.getItem(STORAGE_PINNED_FILTER_KEY);
    if (pinned === "all" || pinned === "box" || pinned === "single") {
      setFilterType(pinned);
      setIsFilterPinned(true);
    } else {
      const saved = localStorage.getItem(STORAGE_FILTER_KEY);
      if (saved === "all" || saved === "box" || saved === "single") {
        setFilterType(saved);
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
        allProducts = [...allProducts, ...data];
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

      // Calculate statistics (only active products)
      const activeStocks = stocksWithProducts.filter(s => s.product?.isActive === true);
      const totalBoxes = activeStocks.reduce((sum, s) => sum + s.boxQuantity, 0);
      const totalSingles = activeStocks.reduce((sum, s) => sum + s.singleQuantity, 0);
      const lowStockItems = activeStocks.filter(
        (s) => s.boxQuantity === 0 && s.singleQuantity === 0
      ).length;
      let totalProfit = 0;
      activeStocks.forEach((stock) => {
        const p = stock.product;
        if (p) {
          const totalSinglesCount = stock.boxQuantity * p.bottlesPerBox + stock.singleQuantity;
          const profitPerSingle = p.singleSellPrice - p.boxBuyPrice / p.bottlesPerBox;
          totalProfit += totalSinglesCount * profitPerSingle;
        }
      });
      setStats({
        totalProducts: activeStocks.length,
        totalBoxes,
        totalSingles,
        lowStockItems,
        totalProfitPotential: totalProfit,
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

  // ==================== FILTERED STOCKS (only active products) ====================
  const filteredStocks = useMemo(() => {
    let filtered = stocks.filter((s) => s.product?.isActive === true); // Only active products
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
  const getCategoryName = (id: string): string => categories.find((c) => c.id === id)?.name ?? "—";
  const getBrandName = (id: string): string => brands.find((b) => b.id === id)?.name ?? "—";
  const getPackagingType = (id: string): string => packagings.find((p) => p.id === id)?.type ?? "—";

  // Profit calculation for a product (realized profit from current stock)
  const calculateStockProfit = (stock: Stock) => {
    const product = stock.product;
    if (!product) return { boxProfit: 0, singleProfit: 0, totalProfit: 0 };
    const bottles = product.bottlesPerBox;
    const costPerBottle = product.boxBuyPrice / bottles;

    // Profit from boxes
    const boxProfit = stock.boxQuantity * (product.boxSellPrice - product.boxBuyPrice);
    // Profit from singles
    const singleProfit = stock.singleQuantity * (product.singleSellPrice - costPerBottle);
    return {
      boxProfit,
      singleProfit,
      totalProfit: boxProfit + singleProfit,
    };
  };

  // ==================== STOCK CRUD ====================
  const resetStockForm = () => {
    setForm({ productId: "", boxQuantity: "", singleQuantity: "", containerType: ContainerType.BOX });
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

  const handleStockQuantityChange = (field: "boxQuantity" | "singleQuantity", value: string) => {
    const num = Number(value) || 0;
    const product = products.find((p) => p.id === form.productId);
    const bottlesPerBox = product?.bottlesPerBox || 1;
    if (field === "boxQuantity") {
      setForm((prev) => ({
        ...prev,
        boxQuantity: value,
        singleQuantity: prev.containerType === ContainerType.BOX ? String(num * bottlesPerBox) : prev.singleQuantity,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        singleQuantity: value,
        boxQuantity: prev.containerType === ContainerType.SINGLE ? String(Math.floor(num / bottlesPerBox)) : prev.boxQuantity,
      }));
    }
  };

  const handleStockContainerTypeChange = (type: ContainerType) => {
    const product = products.find((p) => p.id === form.productId);
    const bottlesPerBox = product?.bottlesPerBox || 1;
    const boxNum = Number(form.boxQuantity) || 0;
    const singleNum = Number(form.singleQuantity) || 0;
    if (type === ContainerType.BOX) {
      setForm((prev) => ({ ...prev, containerType: type, singleQuantity: String(boxNum * bottlesPerBox) }));
    } else {
      setForm((prev) => ({ ...prev, containerType: type, boxQuantity: String(Math.floor(singleNum / bottlesPerBox)) }));
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
    const payload = {
      productId: form.productId,
      boxQuantity: Number(form.boxQuantity) || 0,
      singleQuantity: Number(form.singleQuantity) || 0,
      containerType: form.containerType,
    };
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

  const handleStockDelete = async (id: string) => {
    if (!confirm("Delete this stock entry?")) return;
    try {
      await api.delete(`/stocks/${id}`);
      toast.success("Stock deleted");
      await fetchAll();
    } catch (e) {
      toast.error("Failed to delete stock");
    }
  };

  // ==================== RESTOCK ====================
  const openRestockDialog = (stock: Stock) => {
    setRestockStock(stock);
    setRestockBoxes(0);
    setRestockSingles(0);
    setRestockDialogOpen(true);
  };

  const handleRestock = async () => {
    if (!restockStock) return;
    if (restockBoxes === 0 && restockSingles === 0) {
      toast.error("Please add at least one box or single");
      return;
    }
    const newBoxes = restockStock.boxQuantity + restockBoxes;
    let newSingles = restockStock.singleQuantity + restockSingles;
    const product = products.find((p) => p.id === restockStock.productId);
    const bottlesPerBox = product?.bottlesPerBox || 1;
    const extraBoxes = Math.floor(newSingles / bottlesPerBox);
    const finalBoxes = newBoxes + extraBoxes;
    const finalSingles = newSingles % bottlesPerBox;
    try {
      setLoading(true);
      await api.put(`/stocks/${restockStock.id}`, {
        boxQuantity: finalBoxes,
        singleQuantity: finalSingles,
        containerType: restockStock.containerType,
      });
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
    setAdjustMode("add");
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
    const bottlesPerBox = product?.bottlesPerBox || 1;
    const extraBoxes = Math.floor(newSingles / bottlesPerBox);
    newBoxes += extraBoxes;
    newSingles = newSingles % bottlesPerBox;
    try {
      setLoading(true);
      await api.put(`/stocks/${adjustStock.id}`, {
        boxQuantity: newBoxes,
        singleQuantity: newSingles,
        containerType: adjustStock.containerType,
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

  // ==================== NORMALIZE STOCK (convert singles to boxes) ====================
  const handleNormalize = async (stock: Stock) => {
    try {
      setLoading(true);
      await api.post(`/stocks/normalize/${stock.productId}`);
      toast.success("Stock normalized (singles converted to boxes)");
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Normalization failed");
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
      sku: "",
      description: "",
      isActive: true,
      categoryId: "",
      brandId: "",
      packagingId: "",
      bottlesPerBox: DEFAULT_BOTTLES_PER_BOX,
      boxBuyPrice: "",
      boxSellPrice: "",
      singleSellPrice: "",
    });
    setEditingProductId(null);
  };

  const openProductForm = (product?: Product) => {
    if (product) {
      setProductForm({
        name: product.name,
        sku: product.sku || "",
        description: product.description || "",
        isActive: product.isActive,
        categoryId: product.categoryId,
        brandId: product.brandId,
        packagingId: product.packagingId,
        bottlesPerBox: product.bottlesPerBox,
        boxBuyPrice: String(product.boxBuyPrice),
        boxSellPrice: String(product.boxSellPrice),
        singleSellPrice: String(product.singleSellPrice),
      });
      setEditingProductId(product.id);
    } else {
      resetProductForm();
    }
  };

  const generateProductSku = (): string => {
    if (!productForm.categoryId || !productForm.name) {
      return `SKU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    }
    const category = categories.find((c) => c.id === productForm.categoryId);
    const catName = category?.name || "";
    const prodName = productForm.name;
    const catPrefix = catName.split(/\s+/).map(w => w.substring(0,3).toUpperCase()).join("").slice(0,6) || "CAT";
    const prodPrefix = prodName.split(/\s+/).map(w => w.substring(0,3).toUpperCase()).join("").slice(0,6) || "PRD";
    const basePrefix = `${catPrefix}-${prodPrefix}`;
    const existingSkus = products.map(p => p.sku).filter(sku => sku && sku.startsWith(basePrefix));
    if (existingSkus.length === 0) return `${basePrefix}-001`;
    const numbers = existingSkus.map(sku => {
      const parts = sku!.split("-");
      const last = parts[parts.length-1];
      const num = parseInt(last,10);
      return isNaN(num) ? 0 : num;
    }).filter(n => n > 0);
    const maxNum = Math.max(...numbers, 0);
    return `${basePrefix}-${(maxNum+1).toString().padStart(3,"0")}`;
  };

  const handleGenerateSku = () => {
    if (!productForm.categoryId) toast.warning("Select a category first");
    if (!productForm.name) toast.warning("Enter product name");
    const newSku = generateProductSku();
    setProductForm(prev => ({ ...prev, sku: newSku }));
    toast.success("SKU generated", { description: newSku });
  };

  const handleProductSubmit = async () => {
    if (!productForm.name || !productForm.categoryId || !productForm.brandId || !productForm.packagingId) {
      toast.error("Please fill all required fields");
      return;
    }
    const payload = {
      ...productForm,
      boxBuyPrice: Number(productForm.boxBuyPrice) || 0,
      boxSellPrice: Number(productForm.boxSellPrice) || 0,
      singleSellPrice: Number(productForm.singleSellPrice) || 0,
    };
    try {
      setLoading(true);
      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/products", payload);
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

  // ==================== ENTITY CRUD ====================
  const getEntityEndpoint = (): string => {
    switch (activeEntityTab) {
      case "category": return "/categories";
      case "brand": return "/brands";
      case "packaging": return "/packagings";
      default: return "";
    }
  };

  const handleEntitySubmit = async () => {
    const endpoint = getEntityEndpoint();
    if (!endpoint) return;
    const payload = activeEntityTab === "packaging" ? { type: entityForm.type } : { name: entityForm.name };
    if ((activeEntityTab !== "packaging" && !entityForm.name) || (activeEntityTab === "packaging" && !entityForm.type)) {
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
    return products.filter(p => p.name.toLowerCase().includes(lower));
  }, [products, entitySearch]);

  const filteredCategories = useMemo(() => {
    const lower = entitySearch.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(lower));
  }, [categories, entitySearch]);

  const filteredBrands = useMemo(() => {
    const lower = entitySearch.toLowerCase();
    return brands.filter(b => b.name.toLowerCase().includes(lower));
  }, [brands, entitySearch]);

  const filteredPackagings = useMemo(() => {
    const lower = entitySearch.toLowerCase();
    return packagings.filter(p => p.type.toLowerCase().includes(lower));
  }, [packagings, entitySearch]);

  const toggleRowExpanded = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ==================== RENDER ====================
  return (
    <TooltipProvider>
      <div className="min-h-screen p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Stock Management</h1>
              <p className="text-sm text-muted-foreground">Track inventory, manage exchanges, restock, and analyze profit</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEntityDialogOpen(true)}><Settings className="mr-2 h-4 w-4" />Manage</Button>
              <Button variant="outline" size="sm" onClick={() => setExchangeDialogOpen(true)}><ArrowLeftRight className="mr-2 h-4 w-4" />Exchange</Button>
              <Button onClick={() => openStockForm()}><Plus className="mr-2 h-4 w-4" />Add Stock</Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="border-l-4 border-l-emerald-500 p-4 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active Products</p><p className="text-2xl font-bold">{stats.totalProducts}</p></div><Package className="h-8 w-8 text-emerald-500" /></div></Card>
            <Card className="border-l-4 border-l-blue-500 p-4 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Boxes</p><p className="text-2xl font-bold">{stats.totalBoxes}</p></div><Box className="h-8 w-8 text-blue-500" /></div></Card>
            <Card className="border-l-4 border-l-purple-500 p-4 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Singles</p><p className="text-2xl font-bold">{stats.totalSingles}</p></div><BarChart3 className="h-8 w-8 text-purple-500" /></div></Card>
            <Card className="border-l-4 border-l-amber-500 p-4 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Out of Stock</p><p className="text-2xl font-bold">{stats.lowStockItems}</p></div>{stats.lowStockItems > 0 ? <TrendingDown className="h-8 w-8 text-amber-500" /> : <CheckCircle2 className="h-8 w-8 text-emerald-500" />}</div></Card>
            <Card className="border-l-4 border-l-rose-500 p-4 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Profit Potential</p><p className="text-2xl font-bold">{stats.totalProfitPotential.toFixed(0)} {CURRENCY}</p></div><DollarSign className="h-8 w-8 text-rose-500" /></div></Card>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border p-1 shadow-sm">
                <Button variant={filterType === "all" ? "default" : "ghost"} size="sm" onClick={() => setFilterType("all")}>All</Button>
                <Button variant={filterType === "box" ? "default" : "ghost"} size="sm" onClick={() => setFilterType("box")}>Box</Button>
                <Button variant={filterType === "single" ? "default" : "ghost"} size="sm" onClick={() => setFilterType("single")}>Single</Button>
              </div>
              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFilterPinned(!isFilterPinned)}>{isFilterPinned ? <Pin className="h-4 w-4 text-primary" /> : <PinOff className="h-4 w-4 text-muted-foreground" />}</Button></TooltipTrigger><TooltipContent>{isFilterPinned ? "Unpin default filter" : "Pin current filter as default"}</TooltipContent></Tooltip>
              <Badge variant="secondary" className="h-8 px-3">{filteredStocks.length} items</Badge>
            </div>
            <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          </div>

          {/* Error */}
          <AnimatePresence>{error && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive"><AlertCircle className="h-5 w-5" /><span>{error}</span></motion.div>}</AnimatePresence>

          {/* Stock Table */}
          <Card className="overflow-hidden border shadow-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead><TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Box Qty</TableHead><TableHead>Single Qty</TableHead><TableHead>Type</TableHead><TableHead>Total Singles</TableHead><TableHead>Box Profit</TableHead><TableHead>Single Profit</TableHead><TableHead>Total Profit</TableHead><TableHead>Last Updated</TableHead><TableHead className="w-44"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStocks.length === 0 && !loading ? (<TableRow><TableCell colSpan={12} className="h-32 text-center"><p className="text-muted-foreground">No stock entries found.</p></TableCell></TableRow>) : (filteredStocks.map((stock) => {
                  const isExpanded = expandedRows.has(stock.id);
                  const product = stock.product;
                  const bottlesPerBox = product?.bottlesPerBox || 1;
                  const totalSingles = stock.boxQuantity * bottlesPerBox + stock.singleQuantity;
                  const expectedSingles = stock.boxQuantity * bottlesPerBox;
                  const expectedBoxes = Math.floor(stock.singleQuantity / bottlesPerBox);
                  const isMismatch = stock.containerType === ContainerType.BOX ? stock.singleQuantity !== expectedSingles : stock.boxQuantity !== expectedBoxes;
                  const isLowStock = totalSingles < bottlesPerBox * 2;
                  const profit = calculateStockProfit(stock);
                  return (
                    <React.Fragment key={stock.id}>
                      <TableRow className={cn("group cursor-pointer transition-colors hover:bg-muted/50", isMismatch && "bg-destructive/10", isLowStock && !isMismatch && "border-l-2 border-l-amber-500")} onClick={() => toggleRowExpanded(stock.id)}>
                        <TableCell>{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                        <TableCell className="font-medium">{product?.name || "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{product?.sku || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="font-mono">{stock.boxQuantity}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className="font-mono">{stock.singleQuantity}</Badge></TableCell>
                        <TableCell><Badge className={cn("capitalize", stock.containerType === ContainerType.BOX ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300")}>{stock.containerType}</Badge></TableCell>
                        <TableCell className="font-mono font-medium">{totalSingles}</TableCell>
                        <TableCell className="font-mono text-emerald-600">{profit.boxProfit.toFixed(2)} {CURRENCY}</TableCell>
                        <TableCell className="font-mono text-emerald-600">{profit.singleProfit.toFixed(2)} {CURRENCY}</TableCell>
                        <TableCell className="font-mono font-bold text-emerald-700">{profit.totalProfit.toFixed(2)} {CURRENCY}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(stock.updatedAt).toLocaleDateString()}</TableCell>
                        <TableCell><div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openRestockDialog(stock); }}><PlusCircle className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Restock</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleNormalize(stock); }}><RefreshCw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Normalize</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openAdjustDialog(stock); }}><Calculator className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Adjust</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openStockForm(stock); }}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleStockDelete(stock.id); }}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
                        </div></TableCell>
                      </TableRow>
                      {isExpanded && (<TableRow><TableCell colSpan={12} className="p-0"><motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="px-6 py-4"><div className="grid gap-4 md:grid-cols-3"><div><h4 className="mb-2 text-sm font-semibold flex items-center gap-1"><Package className="h-4 w-4" />Product Details</h4><dl className="grid grid-cols-2 gap-2 text-sm"><dt className="text-muted-foreground">Category:</dt><dd>{getCategoryName(product?.categoryId || "")}</dd><dt className="text-muted-foreground">Brand:</dt><dd>{getBrandName(product?.brandId || "")}</dd><dt className="text-muted-foreground">Packaging:</dt><dd className="capitalize">{getPackagingType(product?.packagingId || "")}</dd><dt className="text-muted-foreground">Bottles/Box:</dt><dd className="font-mono">{bottlesPerBox}</dd></dl></div><div><h4 className="mb-2 text-sm font-semibold flex items-center gap-1"><Calculator className="h-4 w-4" />Stock Breakdown</h4><dl className="grid grid-cols-2 gap-2 text-sm"><dt className="text-muted-foreground">Full Boxes:</dt><dd className="font-mono">{stock.boxQuantity}</dd><dt className="text-muted-foreground">Loose Singles:</dt><dd className="font-mono">{stock.singleQuantity % bottlesPerBox}</dd><dt className="text-muted-foreground">Total Singles:</dt><dd className="font-mono font-bold">{totalSingles}</dd><dt className="text-muted-foreground">Box Equivalent:</dt><dd className="font-mono">{(totalSingles / bottlesPerBox).toFixed(1)}</dd></dl></div><div><h4 className="mb-2 text-sm font-semibold flex items-center gap-1">{isMismatch ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}Consistency Check</h4>{isMismatch ? (<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3"><p className="text-sm text-destructive"><AlertCircle className="mr-1 inline h-4 w-4" />Mismatch detected!</p><p className="mt-1 text-xs text-muted-foreground">{stock.containerType === ContainerType.BOX ? `Expected ${expectedSingles} singles based on ${stock.boxQuantity} boxes.` : `Expected ${expectedBoxes} boxes based on ${stock.singleQuantity} singles.`}</p></div>) : (<div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3"><p className="text-sm text-emerald-600 dark:text-emerald-400">✓ Quantities are consistent</p></div>)}</div></div></motion.div></TableCell></TableRow>)}
                    </React.Fragment>
                  );
                }))}
                {loading && (<TableRow><TableCell colSpan={12} className="h-20 text-center"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>)}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Stock Form Dialog */}
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editingId ? "Edit Stock" : "Add Stock"}</DialogTitle><DialogDescription>{editingId ? "Update stock quantities" : "Add new stock entry"}</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4"><div className="space-y-2"><Label>Product *</Label><Select value={form.productId} onValueChange={handleStockProductSelect} disabled={!!editingId}><SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{products.filter(p => p.isActive).map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.bottlesPerBox} per box)</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Container Type *</Label><Select value={form.containerType} onValueChange={(v) => handleStockContainerTypeChange(v as ContainerType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ContainerType.BOX}>Box (primary)</SelectItem><SelectItem value={ContainerType.SINGLE}>Single (primary)</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Choose which quantity to enter; the other auto‑calculates.</p></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Box Quantity</Label><Input type="number" min={0} value={form.boxQuantity} onChange={(e) => handleStockQuantityChange("boxQuantity", e.target.value)} disabled={form.containerType === ContainerType.SINGLE} className="font-mono" /></div><div className="space-y-2"><Label>Single Quantity</Label><Input type="number" min={0} value={form.singleQuantity} onChange={(e) => handleStockQuantityChange("singleQuantity", e.target.value)} disabled={form.containerType === ContainerType.BOX} className="font-mono" /></div></div></div>
            <DialogFooter><Button variant="outline" onClick={() => setFormDialogOpen(false)}>Cancel</Button><Button onClick={handleStockSubmit} disabled={loading}>{editingId ? "Update" : "Create"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restock Dialog */}
        <Dialog open={restockDialogOpen} onOpenChange={setRestockDialogOpen}>
          <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Restock Product</DialogTitle><DialogDescription>{restockStock?.product?.name} - Current: {restockStock?.boxQuantity} boxes, {restockStock?.singleQuantity} singles</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Boxes to add</Label><Input type="number" min={0} value={restockBoxes} onChange={(e) => setRestockBoxes(Number(e.target.value) || 0)} className="font-mono" /></div><div className="space-y-2"><Label>Singles to add</Label><Input type="number" min={0} value={restockSingles} onChange={(e) => setRestockSingles(Number(e.target.value) || 0)} className="font-mono" /></div></div></div>
            <DialogFooter><Button variant="outline" onClick={() => setRestockDialogOpen(false)}>Cancel</Button><Button onClick={handleRestock} disabled={loading}>Confirm Restock</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adjustment Dialog */}
        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Adjust Stock</DialogTitle><DialogDescription>{adjustStock?.product?.name} - Current: {adjustStock?.boxQuantity} boxes, {adjustStock?.singleQuantity} singles</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4"><div className="space-y-2"><Label>Adjustment Mode</Label><div className="flex gap-2"><Button variant={adjustMode === "add" ? "default" : "outline"} className="flex-1" onClick={() => setAdjustMode("add")}><PlusCircle className="mr-2 h-4 w-4" />Add</Button><Button variant={adjustMode === "subtract" ? "default" : "outline"} className="flex-1" onClick={() => setAdjustMode("subtract")}><MinusCircle className="mr-2 h-4 w-4" />Subtract</Button><Button variant={adjustMode === "set" ? "default" : "outline"} className="flex-1" onClick={() => setAdjustMode("set")}><Save className="mr-2 h-4 w-4" />Set Exact</Button></div></div>
              {adjustMode === "add" || adjustMode === "subtract" ? (<div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Boxes to {adjustMode}</Label><Input type="number" min={0} value={adjustBoxes} onChange={(e) => setAdjustBoxes(Number(e.target.value) || 0)} className="font-mono" /></div><div className="space-y-2"><Label>Singles to {adjustMode}</Label><Input type="number" min={0} value={adjustSingles} onChange={(e) => setAdjustSingles(Number(e.target.value) || 0)} className="font-mono" /></div></div>) : (<div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>New Box Quantity</Label><Input type="number" min={0} value={adjustExactBoxes} onChange={(e) => setAdjustExactBoxes(Number(e.target.value) || 0)} className="font-mono" /></div><div className="space-y-2"><Label>New Single Quantity</Label><Input type="number" min={0} value={adjustExactSingles} onChange={(e) => setAdjustExactSingles(Number(e.target.value) || 0)} className="font-mono" /></div></div>)}</div>
            <DialogFooter><Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancel</Button><Button onClick={handleAdjustSubmit} disabled={loading}>Apply Adjustment</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Exchange Dialog */}
        <Dialog open={exchangeDialogOpen} onOpenChange={setExchangeDialogOpen}>
          <DialogContent className="max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-2"><Repeat className="h-5 w-5" />Product Exchange</DialogTitle><DialogDescription>Exchange products between inventory.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4"><div className="space-y-2"><Label>Source Product (giving away) *</Label><Select value={exchangeForm.sourceProductId} onValueChange={(v) => setExchangeForm(prev => ({ ...prev, sourceProductId: v }))}><SelectTrigger><SelectValue placeholder="Select product to give" /></SelectTrigger><SelectContent>{products.filter(p => p.isActive).map(p => { const stock = stocks.find(s => s.productId === p.id); const totalSingles = stock ? stock.boxQuantity * p.bottlesPerBox + stock.singleQuantity : 0; return <SelectItem key={p.id} value={p.id}>{p.name} (Stock: {totalSingles} singles)</SelectItem>; })}</SelectContent></Select></div><div className="space-y-2"><Label>Target Product (receiving) *</Label><Select value={exchangeForm.targetProductId} onValueChange={(v) => setExchangeForm(prev => ({ ...prev, targetProductId: v }))}><SelectTrigger><SelectValue placeholder="Select product to receive" /></SelectTrigger><SelectContent>{products.filter(p => p.isActive).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Exchange Type</Label><Select value={exchangeForm.exchangeType} onValueChange={(v: "box" | "single") => setExchangeForm(prev => ({ ...prev, exchangeType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="box">Boxes</SelectItem><SelectItem value="single">Singles</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Quantity</Label><Input type="number" min={1} value={exchangeForm.sourceQuantity} onChange={(e) => setExchangeForm(prev => ({ ...prev, sourceQuantity: Number(e.target.value) || 1 }))} className="font-mono" /></div></div><div className="space-y-2"><Label>Notes (optional)</Label><Input placeholder="Exchange reason" value={exchangeForm.notes} onChange={(e) => setExchangeForm(prev => ({ ...prev, notes: e.target.value }))} /></div>
              {exchangeForm.sourceProductId && exchangeForm.targetProductId && (<div className="rounded-lg bg-muted p-3 text-sm"><p className="font-semibold mb-2">Exchange Preview:</p>{(() => { const source = products.find(p => p.id === exchangeForm.sourceProductId); const target = products.find(p => p.id === exchangeForm.targetProductId); if (!source || !target) return null; const sourceSingles = exchangeForm.exchangeType === "box" ? exchangeForm.sourceQuantity * source.bottlesPerBox : exchangeForm.sourceQuantity; const targetBoxes = Math.floor(sourceSingles / target.bottlesPerBox); const targetSingles = sourceSingles % target.bottlesPerBox; return (<div className="space-y-1 text-muted-foreground"><p>You give: <span className="font-medium text-foreground">{exchangeForm.sourceQuantity} {exchangeForm.exchangeType}(s) of {source.name}</span></p><p>You receive: <span className="font-medium text-foreground">{targetBoxes} box(es) and {targetSingles} single(s) of {target.name}</span></p><p className="text-xs">(Based on {source.bottlesPerBox} bottles/box for source and {target.bottlesPerBox} for target)</p></div>); })()}</div>)}</div>
            <DialogFooter><Button variant="outline" onClick={() => setExchangeDialogOpen(false)}>Cancel</Button><Button onClick={handleExchange} disabled={exchangeLoading}>{exchangeLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeftRight className="mr-2 h-4 w-4" />}Confirm Exchange</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Entity Management Dialog */}
        <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Quick Management</DialogTitle><DialogDescription>Manage products, categories, brands, and packaging</DialogDescription></DialogHeader>
            <Tabs value={activeEntityTab} onValueChange={(v) => { setActiveEntityTab(v as typeof activeEntityTab); setEditingProductId(null); setEditingEntityId(null); setEntityForm({ name: "", type: "" }); setEntitySearch(""); }}>
              <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="products">Products</TabsTrigger><TabsTrigger value="category">Categories</TabsTrigger><TabsTrigger value="brand">Brands</TabsTrigger><TabsTrigger value="packaging">Packaging</TabsTrigger></TabsList>

              {/* Products Tab */}
              <TabsContent value="products" className="space-y-4">
                <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search products..." value={entitySearch} onChange={(e) => setEntitySearch(e.target.value)} className="pl-8" /></div><Button onClick={() => openProductForm()}><Plus className="mr-2 h-4 w-4" />New Product</Button></div>
                <div className="max-h-96 space-y-2 overflow-y-auto">{filteredProducts.map(product => (<div key={product.id} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted"><div className="flex-1"><div className="font-medium">{product.name}</div><div className="text-xs text-muted-foreground">SKU: {product.sku || "—"} | {getCategoryName(product.categoryId)} | {getBrandName(product.brandId)} | {getPackagingType(product.packagingId)}</div><div className="text-xs text-muted-foreground">Box: {product.boxBuyPrice} / {product.boxSellPrice} {CURRENCY} | Single: {product.singleSellPrice} {CURRENCY} | {product.isActive ? "Active" : "Inactive"}</div></div><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openProductForm(product)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleProductDelete(product.id)}><Trash2 className="h-4 w-4" /></Button></div></div>))}{filteredProducts.length === 0 && <div className="py-4 text-center text-sm text-muted-foreground">No products found</div>}</div>
                <div className="border-t pt-4 mt-4"><h4 className="font-semibold mb-3">{editingProductId ? "Edit Product" : "Add New Product"}</h4><div className="grid gap-3 md:grid-cols-2"><div className="space-y-1"><Label>Name *</Label><Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Product name" /></div><div className="space-y-1"><Label>SKU</Label><div className="flex gap-1"><Input value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} placeholder="Auto-generated" className="flex-1" /><Button type="button" variant="outline" size="icon" onClick={handleGenerateSku}><RefreshCw className="h-4 w-4" /></Button></div></div><div className="md:col-span-2 space-y-1"><Label>Description</Label><Input value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} placeholder="Optional description" /></div><div className="space-y-1"><Label>Category *</Label><Select value={productForm.categoryId} onValueChange={(v) => setProductForm({ ...productForm, categoryId: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Brand *</Label><Select value={productForm.brandId} onValueChange={(v) => setProductForm({ ...productForm, brandId: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{brands.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Packaging *</Label><Select value={productForm.packagingId} onValueChange={(v) => setProductForm({ ...productForm, packagingId: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{packagings.map(p => <SelectItem key={p.id} value={p.id}>{p.type}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label>Bottles per Box</Label><Input type="number" min={1} value={productForm.bottlesPerBox} onChange={(e) => setProductForm({ ...productForm, bottlesPerBox: Number(e.target.value) || 1 })} /></div><div className="space-y-1"><Label>Box Buy Price ({CURRENCY})</Label><Input type="number" step="0.01" value={productForm.boxBuyPrice} onChange={(e) => setProductForm({ ...productForm, boxBuyPrice: e.target.value })} /></div><div className="space-y-1"><Label>Box Sell Price ({CURRENCY})</Label><Input type="number" step="0.01" value={productForm.boxSellPrice} onChange={(e) => setProductForm({ ...productForm, boxSellPrice: e.target.value })} /></div><div className="space-y-1"><Label>Single Sell Price ({CURRENCY})</Label><Input type="number" step="0.01" value={productForm.singleSellPrice} onChange={(e) => setProductForm({ ...productForm, singleSellPrice: e.target.value })} /></div><div className="flex items-center gap-2 col-span-2"><Switch checked={productForm.isActive} onCheckedChange={(c) => setProductForm({ ...productForm, isActive: c })} /><Label>Active</Label></div></div><div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={resetProductForm}>Cancel</Button><Button onClick={handleProductSubmit} disabled={loading}>{editingProductId ? "Update Product" : "Create Product"}</Button></div></div>
              </TabsContent>

              {/* Categories Tab */}
              <TabsContent value="category" className="space-y-4"><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search categories..." value={entitySearch} onChange={(e) => setEntitySearch(e.target.value)} className="pl-8" /></div><div className="max-h-80 space-y-1 overflow-y-auto">{filteredCategories.map(cat => (<div key={cat.id} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted"><span className="capitalize">{cat.name}</span><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditEntity(cat)}><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteEntity(cat.id)}><Trash2 className="h-3 w-3" /></Button></div></div>))}{filteredCategories.length === 0 && <div className="py-4 text-center text-sm text-muted-foreground">No categories found</div>}</div><div className="border-t pt-4"><Label>{editingEntityId ? "Edit" : "Add"} Category</Label><div className="mt-2 flex gap-2"><Input placeholder="Name" value={entityForm.name} onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })} className="flex-1" /><Button onClick={handleEntitySubmit} disabled={loading}>{editingEntityId ? "Update" : "Add"}</Button>{editingEntityId && <Button variant="ghost" onClick={() => { setEditingEntityId(null); setEntityForm({ name: "", type: "" }); }}>Cancel</Button>}</div></div></TabsContent>

              {/* Brands Tab */}
              <TabsContent value="brand" className="space-y-4"><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search brands..." value={entitySearch} onChange={(e) => setEntitySearch(e.target.value)} className="pl-8" /></div><div className="max-h-80 space-y-1 overflow-y-auto">{filteredBrands.map(brand => (<div key={brand.id} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted"><span className="capitalize">{brand.name}</span><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditEntity(brand)}><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteEntity(brand.id)}><Trash2 className="h-3 w-3" /></Button></div></div>))}{filteredBrands.length === 0 && <div className="py-4 text-center text-sm text-muted-foreground">No brands found</div>}</div><div className="border-t pt-4"><Label>{editingEntityId ? "Edit" : "Add"} Brand</Label><div className="mt-2 flex gap-2"><Input placeholder="Name" value={entityForm.name} onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })} className="flex-1" /><Button onClick={handleEntitySubmit} disabled={loading}>{editingEntityId ? "Update" : "Add"}</Button>{editingEntityId && <Button variant="ghost" onClick={() => { setEditingEntityId(null); setEntityForm({ name: "", type: "" }); }}>Cancel</Button>}</div></div></TabsContent>

              {/* Packaging Tab */}
              <TabsContent value="packaging" className="space-y-4"><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search packaging..." value={entitySearch} onChange={(e) => setEntitySearch(e.target.value)} className="pl-8" /></div><div className="max-h-80 space-y-1 overflow-y-auto">{filteredPackagings.map(pkg => (<div key={pkg.id} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted"><span className="capitalize">{pkg.type}</span><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditEntity(pkg)}><Pencil className="h-3 w-3" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteEntity(pkg.id)}><Trash2 className="h-3 w-3" /></Button></div></div>))}{filteredPackagings.length === 0 && <div className="py-4 text-center text-sm text-muted-foreground">No packaging types found</div>}</div><div className="border-t pt-4"><Label>{editingEntityId ? "Edit" : "Add"} Packaging</Label><div className="mt-2 flex gap-2"><Select value={entityForm.type} onValueChange={(v) => setEntityForm({ ...entityForm, type: v })}><SelectTrigger className="flex-1"><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent><SelectItem value="bottle">Bottle</SelectItem><SelectItem value="can">Can</SelectItem><SelectItem value="plastic">Plastic</SelectItem></SelectContent></Select><Button onClick={handleEntitySubmit} disabled={loading}>{editingEntityId ? "Update" : "Add"}</Button>{editingEntityId && <Button variant="ghost" onClick={() => { setEditingEntityId(null); setEntityForm({ name: "", type: "" }); }}>Cancel</Button>}</div></div></TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}