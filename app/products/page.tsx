"use client";

import React, { JSX, useEffect, useMemo, useState, useRef } from "react";
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
import {
  Trash2,
  Pencil,
  Plus,
  Package,
  Tag,
  Layers,
  AlertCircle,
  Search,
  Settings,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ==================== TYPES ====================
interface ProductPrice {
  id: string;
  buyingPrice: number;
  sellingPrice: number;
  effectiveFrom: string;
  isCurrent: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  categoryId: string;
  brandId: string;
  packagingId: string;
  bottlesPerBox: number;
  allowLoss: boolean;
  prices?: ProductPrice[];
  createdAt?: string;
  updatedAt?: string;
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
const PRODUCTS_PAGE_SIZE = 20;

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // ---------- UI filters ----------
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  // ---------- Product form dialog ----------
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    isActive: true,
    categoryId: "",
    brandId: "",
    packagingId: "",
    bottlesPerBox: DEFAULT_BOTTLES_PER_BOX,
    allowLoss: false,
    buyingPrice: "",
    sellingPrice: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  // ---------- Entity management dialog ----------
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [activeEntityTab, setActiveEntityTab] = useState<"category" | "brand" | "packaging">("category");
  const [entityForm, setEntityForm] = useState({ name: "", type: "" });
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [entitySearch, setEntitySearch] = useState("");

  // ---------- Expandable rows ----------
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Intersection Observer ref for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastProductElementRef = useRef<HTMLTableRowElement | null>(null);

  // ==================== FETCH PRODUCTS (PAGINATED) ====================
  const fetchProducts = async (pageNum: number, reset = false) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append("page", pageNum.toString());
      params.append("limit", PRODUCTS_PAGE_SIZE.toString());
      if (search) params.append("search", search);

      const response = await api.get<{ data: Product[]; page: number; hasMore: boolean; total: number }>(
        `/products?${params.toString()}`
      );
      const { data, hasMore: more, page: currentPage } = response.data;
      // Ensure data is an array
      const productsData = Array.isArray(data) ? data : [];
      setProducts((prev) => (reset ? productsData : [...prev, ...productsData]));
      setHasMore(more);
      setPage(currentPage);
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to load products";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // ==================== FETCH SUPPORTING DATA ====================
  const fetchSupportingData = async () => {
    try {
      const [c, b, pkg] = await Promise.all([
        api.get<Category[]>("/categories"),
        api.get<Brand[]>("/brands"),
        api.get<Packaging[]>("/packagings"),
      ]);
      setCategories(Array.isArray(c.data) ? c.data : []);
      setBrands(Array.isArray(b.data) ? b.data : []);
      setPackagings(Array.isArray(pkg.data) ? pkg.data : []);
    } catch (e) {
      console.error("Failed to fetch supporting data", e);
    }
  };

  // Initial load
  useEffect(() => {
    fetchProducts(1, true);
    fetchSupportingData();
  }, []);

  // Reset pagination when search changes
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    fetchProducts(1, true);
  }, [search]);

  // Infinite scroll setup - safely handle products length
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !initialLoading) {
          fetchProducts(page + 1, false);
        }
      },
      { threshold: 0.1 }
    );

    if (lastProductElementRef.current) {
      observerRef.current.observe(lastProductElementRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, loading, initialLoading, page, products.length]);

  // ==================== FILTERED PRODUCTS ====================
  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (filterType === "active") {
      filtered = filtered.filter((p) => p.isActive);
    } else if (filterType === "inactive") {
      filtered = filtered.filter((p) => !p.isActive);
    }
    return filtered;
  }, [products, filterType]);

  // ==================== HELPERS ====================
  const getCategoryName = (id: string): string =>
    categories.find((c) => c.id === id)?.name ?? "—";
  const getBrandName = (id: string): string =>
    brands.find((b) => b.id === id)?.name ?? "—";
  const getPackagingType = (id: string): string =>
    packagings.find((p) => p.id === id)?.type ?? "—";

  const getCurrentPrice = (product: Product) => {
    const currentPrice = product.prices?.find((p) => p.isCurrent);
    return currentPrice
      ? { buyingPrice: currentPrice.buyingPrice, sellingPrice: currentPrice.sellingPrice }
      : { buyingPrice: 0, sellingPrice: 0 };
  };

  const resetProductForm = () => {
    setForm({
      name: "",
      description: "",
      isActive: true,
      categoryId: "",
      brandId: "",
      packagingId: "",
      bottlesPerBox: DEFAULT_BOTTLES_PER_BOX,
      allowLoss: false,
      buyingPrice: "",
      sellingPrice: "",
    });
    setEditingId(null);
  };

  const openProductForm = (product?: Product) => {
    if (product) {
      const currentPrice = getCurrentPrice(product);
      setForm({
        name: product.name,
        description: product.description || "",
        isActive: product.isActive,
        categoryId: product.categoryId,
        brandId: product.brandId,
        packagingId: product.packagingId,
        bottlesPerBox: product.bottlesPerBox,
        allowLoss: product.allowLoss,
        buyingPrice: String(currentPrice.buyingPrice),
        sellingPrice: String(currentPrice.sellingPrice),
      });
      setEditingId(product.id);
    } else {
      resetProductForm();
    }
    setFormDialogOpen(true);
  };

  // ==================== PRODUCT CRUD ====================
  const handleProductSubmit = async () => {
    if (!form.name || !form.categoryId || !form.brandId || !form.packagingId) {
      toast.error("Please fill all required fields");
      return;
    }

    const payload: any = {
      name: form.name,
      description: form.description,
      isActive: form.isActive,
      categoryId: form.categoryId,
      brandId: form.brandId,
      packagingId: form.packagingId,
      bottlesPerBox: form.bottlesPerBox,
      allowLoss: form.allowLoss,
    };

    // Include prices always for new product, or if editing and prices changed
    if (!editingId || (form.buyingPrice && form.sellingPrice)) {
      payload.buyingPrice = Number(form.buyingPrice) || 0;
      payload.sellingPrice = Number(form.sellingPrice) || 0;
    }

    try {
      setLoading(true);
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/products", payload);
        toast.success("Product created");
      }
      setFormDialogOpen(false);
      resetProductForm();
      // Reset and reload
      setProducts([]);
      setPage(1);
      setHasMore(true);
      await fetchProducts(1, true);
      await fetchSupportingData();
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to save product";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      toast.error("Failed to delete product");
    }
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
    }
  };

  const resetEntityForm = () => {
    setEntityForm({ name: "", type: "" });
    setEditingEntityId(null);
  };

  const handleEntitySubmit = async () => {
    const endpoint = getEntityEndpoint();
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
      resetEntityForm();
      await fetchSupportingData();
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
      await fetchSupportingData();
    } catch (e) {
      toast.error(`Failed to delete ${activeEntityTab}`);
    }
  };

  const filteredEntities = useMemo(() => {
    const searchLower = entitySearch.toLowerCase();
    if (activeEntityTab === "category") {
      return categories.filter((c) => c.name.toLowerCase().includes(searchLower));
    } else if (activeEntityTab === "brand") {
      return brands.filter((b) => b.name.toLowerCase().includes(searchLower));
    } else {
      return packagings.filter((p) => p.type.toLowerCase().includes(searchLower));
    }
  }, [activeEntityTab, categories, brands, packagings, entitySearch]);

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ==================== RENDER ====================
  if (initialLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Product Catalog</h1>
              <p className="text-sm text-muted-foreground">
                Manage products, prices, and categories
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEntityDialogOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Manage Entities
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
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Packaging</TableHead>
                  <TableHead>Bottles/Box</TableHead>
                  <TableHead className="text-right">Buying Price</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center">
                      <p className="text-muted-foreground">No products found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product, index) => {
                    const isExpanded = expandedRows.has(product.id);
                    const isLast = index === filteredProducts.length - 1;
                    const currentPrice = getCurrentPrice(product);

                    return (
                      <React.Fragment key={product.id}>
                        <TableRow
                          ref={isLast ? lastProductElementRef : null}
                          className={cn(
                            "group cursor-pointer transition-colors hover:bg-muted/30",
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
                          <TableCell>{getCategoryName(product.categoryId)}</TableCell>
                          <TableCell>{getBrandName(product.brandId)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {getPackagingType(product.packagingId)}
                            </Badge>
                          </TableCell>
                          <TableCell>{product.bottlesPerBox}</TableCell>
                          <TableCell className="text-right font-mono">
                            {currentPrice.buyingPrice.toFixed(2)} {CURRENCY}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {currentPrice.sellingPrice.toFixed(2)} {CURRENCY}
                          </TableCell>
                          <TableCell>
                            {product.isActive ? (
                              <Badge variant="default" className="bg-emerald-500">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openProductForm(product);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProduct(product.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/20">
                            <TableCell colSpan={10} className="p-0">
                              <div className="px-6 py-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div>
                                    <h4 className="mb-2 text-sm font-semibold">Details</h4>
                                    <dl className="grid grid-cols-2 gap-2 text-sm">
                                      <dt className="text-muted-foreground">Description:</dt>
                                      <dd className="line-clamp-2">
                                        {product.description || "—"}
                                      </dd>
                                      <dt className="text-muted-foreground">Allow Loss:</dt>
                                      <dd>{product.allowLoss ? "Yes" : "No"}</dd>
                                      <dt className="text-muted-foreground">Created:</dt>
                                      <dd>
                                        {product.createdAt
                                          ? new Date(product.createdAt).toLocaleDateString()
                                          : "—"}
                                      </dd>
                                    </dl>
                                  </div>
                                  <div>
                                    <h4 className="mb-2 text-sm font-semibold">Price History</h4>
                                    <div className="max-h-40 overflow-y-auto text-sm">
                                      {product.prices && product.prices.length > 0 ? (
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="text-muted-foreground">
                                              <th className="text-left">From</th>
                                              <th className="text-left">Buy</th>
                                              <th className="text-left">Sell</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {product.prices.map((price) => (
                                              <tr key={price.id}>
                                                <td>
                                                  {new Date(price.effectiveFrom).toLocaleDateString()}
                                                </td>
                                                <td>
                                                  {price.buyingPrice} {CURRENCY}
                                                </td>
                                                <td>
                                                  {price.sellingPrice} {CURRENCY}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      ) : (
                                        <p className="text-muted-foreground">No price history</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={10} className="h-20 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Product Form Dialog */}
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
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
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => setForm({ ...form, categoryId: v })}
                >
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Brand *</Label>
                <Select
                  value={form.brandId}
                  onValueChange={(v) => setForm({ ...form, brandId: v })}
                >
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Packaging *</Label>
                <Select
                  value={form.packagingId}
                  onValueChange={(v) => setForm({ ...form, packagingId: v })}
                >
                  <SelectTrigger>
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
              <div className="space-y-2">
                <Label>Bottles per Box</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.bottlesPerBox}
                  onChange={(e) =>
                    setForm({ ...form, bottlesPerBox: Number(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Buying Price ({CURRENCY})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.buyingPrice}
                  onChange={(e) => setForm({ ...form, buyingPrice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Selling Price ({CURRENCY})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(c) => setForm({ ...form, isActive: c })}
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.allowLoss}
                  onCheckedChange={(c) => setForm({ ...form, allowLoss: c })}
                />
                <Label>Allow selling below cost</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleProductSubmit} disabled={loading}>
                {editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Entity Management Dialog */}
        <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Categories, Brands & Packaging</DialogTitle>
            </DialogHeader>
            <div className="flex gap-4 border-b">
              {(["category", "brand", "packaging"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={activeEntityTab === tab ? "default" : "ghost"}
                  onClick={() => {
                    setActiveEntityTab(tab);
                    resetEntityForm();
                    setEntitySearch("");
                  }}
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
                  onClick={() => {
                    resetEntityForm();
                    setEditingEntityId(null);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add
                </Button>
              </div>

              <div className="max-h-80 space-y-1 overflow-y-auto">
                {filteredEntities.map((item: Category | Brand | Packaging) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted"
                  >
                    <span>
                      {activeEntityTab === "packaging"
                        ? (item as Packaging).type
                        : (item as Category | Brand).name}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditEntity(item)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteEntity(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <Label>{editingEntityId ? "Edit" : "Add"} {activeEntityTab}</Label>
                <div className="mt-2 flex gap-2">
                  {activeEntityTab === "packaging" ? (
                    <Select
                      value={entityForm.type}
                      onValueChange={(v) => setEntityForm({ ...entityForm, type: v })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
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
                      onChange={(e) =>
                        setEntityForm({ ...entityForm, name: e.target.value })
                      }
                      className="flex-1"
                    />
                  )}
                  <Button onClick={handleEntitySubmit} disabled={loading}>
                    {editingEntityId ? "Update" : "Add"}
                  </Button>
                  {editingEntityId && (
                    <Button variant="ghost" onClick={resetEntityForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}