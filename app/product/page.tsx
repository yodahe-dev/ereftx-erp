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
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
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
import { motion } from "framer-motion";
import {
  Trash2,
  Pencil,
  Plus,
  RefreshCw,
  Package,
  Tag,
  Layers,
  ExternalLink,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Search,
  Copy,
  CalendarCheck,
  Settings,
  ChevronDown,
  ChevronRight,
  Pin,
  PinOff,
} from "lucide-react";
import { toast } from "sonner";
import { format, isBefore } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ==================== TYPES (strict) ====================
interface Product {
  id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  isActive: boolean;
  categoryId: string;
  brandId: string;
  packagingId: string;
  bottlesPerBox: number;
  boxBuyPrice: number;
  boxSellPrice: number;
  singleSellPrice: number;
  priceStartDate?: string;
  priceEndDate?: string | null;
  createdAt?: string;
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

// ==================== CONSTANTS ====================
const DEFAULT_BOTTLES_PER_BOX = 24;
const CURRENCY = "ETB";
const STORAGE_FILTER_KEY = "product-filter-preference";
const STORAGE_PINNED_FILTER_KEY = "product-pinned-filter";

type FilterType = "all" | "active" | "inactive";

// ==================== MAIN PAGE ====================
export default function ProductPage(): JSX.Element {
  // ---------- Data states ----------
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

  // On client mount, load preferences from localStorage
  useEffect(() => {
    setIsClient(true);
    const pinned = localStorage.getItem(STORAGE_PINNED_FILTER_KEY);
    if (pinned === "active" || pinned === "inactive" || pinned === "all") {
      setFilterType(pinned);
      setIsFilterPinned(true);
    } else {
      const saved = localStorage.getItem(STORAGE_FILTER_KEY);
      if (saved === "active" || saved === "inactive" || saved === "all") {
        setFilterType(saved);
      }
    }
  }, []);

  // Persist filter preference to localStorage
  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem(STORAGE_FILTER_KEY, filterType);
    if (isFilterPinned) {
      localStorage.setItem(STORAGE_PINNED_FILTER_KEY, filterType);
    } else {
      localStorage.removeItem(STORAGE_PINNED_FILTER_KEY);
    }
  }, [filterType, isFilterPinned, isClient]);

  // ---------- Product form dialog ----------
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [form, setForm] = useState({
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
    priceEndDate: null as Date | null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [duplicatingFrom, setDuplicatingFrom] = useState<Product | null>(null);

  // ---------- Entity management dialog ----------
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [activeEntityTab, setActiveEntityTab] = useState<"category" | "brand" | "packaging">("category");
  const [entityForm, setEntityForm] = useState({ name: "", type: "" });
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [entitySearch, setEntitySearch] = useState("");

  // ---------- Expandable rows in table ----------
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // ==================== FETCH ALL DATA ====================
  const fetchAll = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const [p, c, b, pkg] = await Promise.all([
        api.get<Product[]>("/products"),
        api.get<Category[]>("/categories"),
        api.get<Brand[]>("/brands"),
        api.get<Packaging[]>("/packagings"),
      ]);

      setProducts(p.data);
      setCategories(c.data);
      setBrands(b.data);
      setPackagings(pkg.data);
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to load data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ==================== FILTERED PRODUCTS ====================
  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );

    if (filterType === "active") {
      filtered = filtered.filter((p) => p.isActive);
    } else if (filterType === "inactive") {
      filtered = filtered.filter((p) => !p.isActive);
    }

    return filtered;
  }, [products, search, filterType]);

  // ==================== HELPERS ====================
  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "—";
  const getBrandName = (id: string) =>
    brands.find((b) => b.id === id)?.name ?? "—";
  const getPackagingType = (id: string) =>
    packagings.find((p) => p.id === id)?.type ?? "—";

  const resetProductForm = () => {
    setForm({
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
      priceEndDate: null,
    });
    setEditingId(null);
    setDuplicatingFrom(null);
  };

  const resetEntityForm = () => {
    setEntityForm({ name: "", type: "" });
    setEditingEntityId(null);
  };

  const openProductForm = (product?: Product, isDuplicate = false) => {
    if (product) {
      setForm({
        name: isDuplicate ? `${product.name} (Copy)` : product.name,
        sku: isDuplicate ? "" : product.sku || "",
        description: product.description || "",
        isActive: product.isActive,
        categoryId: product.categoryId,
        brandId: product.brandId,
        packagingId: product.packagingId,
        bottlesPerBox: product.bottlesPerBox,
        boxBuyPrice: String(product.boxBuyPrice),
        boxSellPrice: String(product.boxSellPrice),
        singleSellPrice: String(product.singleSellPrice),
        priceEndDate: null,
      });
      setEditingId(isDuplicate ? null : product.id);
      setDuplicatingFrom(isDuplicate ? product : null);
    } else {
      resetProductForm();
    }
    setFormDialogOpen(true);
  };

  // ==================== SKU GENERATION ====================
  const generateSequentialSku = (): string => {
    if (!form.categoryId || !form.name) {
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `SKU-${random}`;
    }

    const category = categories.find((c) => c.id === form.categoryId);
    const catName = category?.name || "";
    const prodName = form.name;

    const catPrefix = catName
      .split(/\s+/)
      .map((word) => word.substring(0, 3).toUpperCase())
      .join("")
      .slice(0, 6) || "CAT";
    const prodPrefix = prodName
      .split(/\s+/)
      .map((word) => word.substring(0, 3).toUpperCase())
      .join("")
      .slice(0, 6) || "PRD";

    const basePrefix = `${catPrefix}-${prodPrefix}`;

    const existingSkus = products
      .map((p) => p.sku)
      .filter((sku): sku is string => !!sku && sku.startsWith(basePrefix));

    if (existingSkus.length === 0) {
      return `${basePrefix}-001`;
    }

    const numbers = existingSkus
      .map((sku) => {
        const baseSku = sku.split("-v")[0];
        const parts = baseSku.split("-");
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        return isNaN(num) ? 0 : num;
      })
      .filter((n) => n > 0);

    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;

    const paddedNumber = nextNumber.toString().padStart(3, "0");
    return `${basePrefix}-${paddedNumber}`;
  };

  const handleGenerateSku = () => {
    if (!form.categoryId) toast.warning("Select a category first");
    if (!form.name) toast.warning("Enter product name");
    const newSku = generateSequentialSku();
    setForm((prev) => ({ ...prev, sku: newSku }));
    toast.success("SKU generated", { description: newSku });
  };

  useEffect(() => {
    if (!editingId && !duplicatingFrom && form.categoryId && form.name && !form.sku) {
      handleGenerateSku();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.categoryId, form.name, editingId, duplicatingFrom]);

  // ==================== PRODUCT CRUD ====================
  const handleProductSubmit = async () => {
    if (!form.name || !form.categoryId || !form.brandId || !form.packagingId) {
      toast.error("Please fill all required fields");
      return;
    }

    const payload = {
      ...form,
      boxBuyPrice: Number(form.boxBuyPrice) || 0,
      boxSellPrice: Number(form.boxSellPrice) || 0,
      singleSellPrice: Number(form.singleSellPrice) || 0,
      priceEndDate: form.priceEndDate?.toISOString() || null,
    };

    try {
      setLoading(true);
      if (editingId) {
        const response = await api.put(`/products/${editingId}`, payload);
        toast.success(response.data.message || "Product updated");
      } else {
        await api.post("/products", { ...payload, priceEndDate: null });
        toast.success(duplicatingFrom ? "Product duplicated" : "Product created");
      }
      setFormDialogOpen(false);
      resetProductForm();
      await fetchAll();
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to save product";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPriceEndDate = () => {
    setForm((prev) => ({ ...prev, priceEndDate: new Date() }));
    toast.info("Price end date set to today – will create new version on save.");
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      await fetchAll();
    } catch (e) {
      toast.error("Failed to delete product");
    }
  };

  // ==================== ENTITY CRUD ====================
  const getEntityEndpoint = () => {
    switch (activeEntityTab) {
      case "category": return "/categories";
      case "brand": return "/brands";
      case "packaging": return "/packagings";
    }
  };

  const handleEntitySubmit = async () => {
    const endpoint = getEntityEndpoint();
    const payload = activeEntityTab === "packaging"
      ? { type: entityForm.type }
      : { name: entityForm.name };

    if ((activeEntityTab !== "packaging" && !entityForm.name) ||
        (activeEntityTab === "packaging" && !entityForm.type)) {
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
      resetEntityForm();
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

  const filteredEntities = useMemo(() => {
    const searchLower = entitySearch.toLowerCase();
    if (activeEntityTab === "category") {
      return categories.filter(c => c.name.toLowerCase().includes(searchLower));
    } else if (activeEntityTab === "brand") {
      return brands.filter(b => b.name.toLowerCase().includes(searchLower));
    } else {
      return packagings.filter(p => p.type.toLowerCase().includes(searchLower));
    }
  }, [activeEntityTab, categories, brands, packagings, entitySearch]);

  // ==================== PROFIT CALCULATIONS ====================
  const calculateProfitMetrics = (product: Product) => {
    const boxCost = product.boxBuyPrice;
    const boxSellPrice = product.boxSellPrice;
    const singlePrice = product.singleSellPrice;
    const bottles = product.bottlesPerBox;

    const revenueSingles = singlePrice * bottles;
    const profitSingles = revenueSingles - boxCost;
    const profitBox = boxSellPrice - boxCost;
    const profitPerBottle = singlePrice - boxCost / bottles;

    return {
      revenueSingles,
      profitSingles,
      profitBox,
      profitPerBottle,
      isSinglesBetter: profitSingles > profitBox,
      difference: Math.abs(profitSingles - profitBox),
    };
  };

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
              <h1 className="text-3xl font-bold tracking-tight">Product Catalog</h1>
              <p className="text-sm text-muted-foreground">
                Manage your beverage inventory
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick navigation to entity pages */}
              <div className="mr-2 flex items-center gap-1 rounded-lg border p-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href="/categories">
                        <Tag className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Categories</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href="/brands">
                        <Layers className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Brands</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href="/packagings">
                        <Package className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Packaging</TooltipContent>
                </Tooltip>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setEntityDialogOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Quick Edit
              </Button>
              <Button onClick={() => openProductForm()}>
                <Plus className="mr-2 h-4 w-4" />
                New Product
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border p-1">
                <Button
                  variant={filterType === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                >
                  All
                </Button>
                <Button
                  variant={filterType === "active" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("active")}
                >
                  Active
                </Button>
                <Button
                  variant={filterType === "inactive" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilterType("inactive")}
                >
                  Inactive
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
                      <Pin className="h-4 w-4 text-primary" />
                    ) : (
                      <PinOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFilterPinned ? "Unpin default filter" : "Pin current filter as default"}
                </TooltipContent>
              </Tooltip>
              <Badge variant="secondary" className="h-8 px-3">
                {filteredProducts.length} products
              </Badge>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Table */}
          <Card className="overflow-hidden border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Packaging</TableHead>
                  <TableHead className="text-right">Box (Buy/Sell)</TableHead>
                  <TableHead className="text-right">Single</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center">
                      <p className="text-muted-foreground">No products found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const isExpanded = expandedRows.has(product.id);
                    const metrics = calculateProfitMetrics(product);
                    const isPriceExpired = product.priceEndDate && isBefore(new Date(product.priceEndDate), new Date());

                    return (
                      <React.Fragment key={product.id}>
                        <TableRow
                          className={cn(
                            "group cursor-pointer transition-colors hover:border hover:border-primary/20 hover:bg-muted/30",
                            !product.isActive && "opacity-60"
                          )}
                          onClick={() => toggleRowExpanded(product.id)}
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="font-mono text-sm">{product.sku || "—"}</TableCell>
                          <TableCell>{getCategoryName(product.categoryId)}</TableCell>
                          <TableCell>{getBrandName(product.brandId)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {getPackagingType(product.packagingId)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {product.boxBuyPrice} / {product.boxSellPrice} {CURRENCY}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.singleSellPrice} {CURRENCY}
                          </TableCell>
                          <TableCell>
                            {!product.isActive ? (
                              <Badge variant="secondary">Inactive</Badge>
                            ) : isPriceExpired ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : (
                              <Badge variant="default" className="bg-emerald-500">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); openProductForm(product, true); }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); openProductForm(product, false); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/20">
                            <TableCell colSpan={10} className="p-0">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="px-6 py-4"
                              >
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <h4 className="mb-2 text-sm font-semibold">Details</h4>
                                    <dl className="grid grid-cols-2 gap-2 text-sm">
                                      <dt className="text-muted-foreground">Bottles/Box:</dt>
                                      <dd>{product.bottlesPerBox}</dd>
                                      <dt className="text-muted-foreground">Description:</dt>
                                      <dd className="line-clamp-2">{product.description || "—"}</dd>
                                      {product.priceEndDate && (
                                        <>
                                          <dt className="text-muted-foreground">Price valid until:</dt>
                                          <dd>{format(new Date(product.priceEndDate), "PPP")}</dd>
                                        </>
                                      )}
                                    </dl>
                                  </div>
                                  <div className="rounded-lg border p-3">
                                    <div className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                      <TrendingUp className="h-3 w-3" />
                                      Profit Analysis
                                    </div>
                                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                                      <div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Singles revenue:</span>
                                          <span>{metrics.revenueSingles.toFixed(2)} {CURRENCY}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Profit (singles):</span>
                                          <Badge variant={metrics.profitSingles >= 0 ? "default" : "destructive"}>
                                            {metrics.profitSingles.toFixed(2)} {CURRENCY}
                                          </Badge>
                                        </div>
                                      </div>
                                      <div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Box revenue:</span>
                                          <span>{product.boxSellPrice.toFixed(2)} {CURRENCY}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">Profit (box):</span>
                                          <Badge variant={metrics.profitBox >= 0 ? "default" : "destructive"}>
                                            {metrics.profitBox.toFixed(2)} {CURRENCY}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2 text-xs">
                                      <span className="text-muted-foreground">
                                        Per bottle: {metrics.profitPerBottle.toFixed(2)} {CURRENCY}
                                      </span>
                                      {metrics.isSinglesBetter ? (
                                        <Badge className="bg-emerald-100 text-emerald-800">
                                          +{metrics.difference.toFixed(2)} selling singles
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-amber-100 text-amber-800">
                                          +{metrics.difference.toFixed(2)} selling box
                                        </Badge>
                                      )}
                                    </div>
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

        {/* Product Form Dialog */}
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Product" : duplicatingFrom ? "Duplicate Product" : "Add New Product"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="h-9 flex-1 justify-start font-mono">
                    {form.sku || "—"}
                  </Badge>
                  <Button type="button" variant="outline" size="icon" onClick={handleGenerateSku}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Brand *</Label>
                <Select value={form.brandId} onValueChange={(v) => setForm({ ...form, brandId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Packaging *</Label>
                <Select value={form.packagingId} onValueChange={(v) => setForm({ ...form, packagingId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {packagings.map((p) => <SelectItem key={p.id} value={p.id}>{p.type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bottles per Box</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.bottlesPerBox}
                  onChange={(e) => setForm({ ...form, bottlesPerBox: Number(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Box Buy Price ({CURRENCY})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.boxBuyPrice}
                  onChange={(e) => setForm({ ...form, boxBuyPrice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Box Sell Price ({CURRENCY})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.boxSellPrice}
                  onChange={(e) => setForm({ ...form, boxSellPrice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Single Sell Price ({CURRENCY})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.singleSellPrice}
                  onChange={(e) => setForm({ ...form, singleSellPrice: e.target.value })}
                />
              </div>
              {editingId && (
                <div className="space-y-2">
                  <Label>Price End Date</Label>
                  <div className="flex items-center gap-2">
                    {form.priceEndDate ? (
                      <>
                        <Badge variant="outline"><CalendarCheck className="mr-1 h-3 w-3" />{format(form.priceEndDate, "PPP")}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, priceEndDate: null })}>Clear</Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={handleSetPriceEndDate}>
                        <CalendarCheck className="mr-1 h-4 w-4" /> Set End Date (Today)
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(c) => setForm({ ...form, isActive: c })} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleProductSubmit} disabled={loading}>
                {editingId ? (form.priceEndDate ? "Update & New Version" : "Update") : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Entity Management Dialog */}
        <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Quick Entity Management</DialogTitle>
            </DialogHeader>
            <div className="flex gap-4 border-b">
              {(["category", "brand", "packaging"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={activeEntityTab === tab ? "default" : "ghost"}
                  onClick={() => { setActiveEntityTab(tab); resetEntityForm(); setEntitySearch(""); }}
                  className="capitalize"
                >
                  {tab}s
                </Button>
              ))}
            </div>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${activeEntityTab}s...`}
                    value={entitySearch}
                    onChange={(e) => setEntitySearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button
                  onClick={() => { resetEntityForm(); setEditingEntityId(null); }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>

              <div className="max-h-80 space-y-1 overflow-y-auto">
                {filteredEntities.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted">
                    <span>{activeEntityTab === "packaging" ? item.type : item.name}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditEntity(item)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteEntity(item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {(editingEntityId !== null || !editingEntityId) && (
                <div className="border-t pt-4">
                  <Label>{editingEntityId ? "Edit" : "Add"} {activeEntityTab}</Label>
                  <div className="mt-2 flex gap-2">
                    {activeEntityTab === "packaging" ? (
                      <Select value={entityForm.type} onValueChange={(v) => setEntityForm({ ...entityForm, type: v })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottle">Bottle</SelectItem>
                          <SelectItem value="can">Can</SelectItem>
                          <SelectItem value="plastic">Plastic</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Name"
                        value={entityForm.name}
                        onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })}
                      />
                    )}
                    <Button onClick={handleEntitySubmit} disabled={loading}>
                      {editingEntityId ? "Update" : "Add"}
                    </Button>
                    {editingEntityId && (
                      <Button variant="ghost" onClick={resetEntityForm}>Cancel</Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}