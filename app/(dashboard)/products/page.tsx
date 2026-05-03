"use client";

import React, {
  JSX,
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Pencil,
  Plus,
  Package,
  AlertCircle,
  Search,
  Settings,
  ChevronRight,
  Loader2,
  Clock,
  Sparkles,
  Tag,
  Layers,
  Archive,
  Lock,
  Unlock,
  ChevronDown,
  CheckSquare,
  Square,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

/* ========================================================================== */
/*  TYPES                                                                     */
/* ========================================================================== */

interface ProductPrice {
  id: string;
  productId: string;
  buyPricePerBox: number | string;
  sellPricePerBox: number | string;
  sellPricePerUnit: number | string;
  startAt: string;
  endAt: string | null;
  allowLoss: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
  categoryId: string;
  category?: Category;
}

interface Packaging {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  unitsPerBox: number;
  brandId: string;
  packagingId: string;
  brand?: {
    id: string;
    name: string;
    category?: Category;
  };
  packaging?: {
    id: string;
    name: string;
  };
  prices?: ProductPrice[];
  createdAt?: string;
  updatedAt?: string;
}

/* ========================================================================== */
/*  CONSTANTS                                                                 */
/* ========================================================================== */

const DEFAULT_UNITS_PER_BOX = 24;
const CURRENCY = "ETB";
const PRODUCTS_PAGE_SIZE = 20;
const UNDO_SECONDS = 10;

/* ========================================================================== */
/*  TYPE GUARDS                                                               */
/* ========================================================================== */

function isCategory(entity: Category | Brand | Packaging): entity is Category {
  return "name" in entity && !("categoryId" in entity) && !("category" in entity);
}

function isBrand(entity: Category | Brand | Packaging): entity is Brand {
  return "name" in entity && "categoryId" in entity && "category" in entity;
}

function isPackaging(entity: Category | Brand | Packaging): entity is Packaging {
  return "name" in entity && !("categoryId" in entity) && !("category" in entity);
}

/* ========================================================================== */
/*  HELPERS                                                                   */
/* ========================================================================== */

const getPackagingDisplayName = (pkg: Packaging): string => {
  return pkg?.name ?? "";
};

/* ========================================================================== */
/*  CUSTOM HOOK – DYNAMIC UNDO COUNTDOWN IN TOAST                             */
/* ========================================================================== */

function useUndoToast() {
  const toastIdRef = useRef<string | number | null>(null);

  const showUndoToast = (
    message: string,
    description: string,
    onUndo: () => void,
    seconds: number,
  ) => {
    toastIdRef.current = toast(message, {
      description: `${description} (${seconds}s)`,
      duration: seconds * 1000,
      position: "bottom-left",
      action: {
        label: "Undo",
        onClick: () => {
          if (toastIdRef.current) toast.dismiss(toastIdRef.current);
          onUndo();
        },
      },
    });

    let remaining = seconds;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0 || !toastIdRef.current) {
        clearInterval(interval);
        return;
      }
      toast(message, {
        id: toastIdRef.current,
        description: `${description} (${remaining}s)`,
        duration: (remaining + 1) * 1000,
        position: "bottom-left",
        action: {
          label: "Undo",
          onClick: () => {
            if (toastIdRef.current) toast.dismiss(toastIdRef.current);
            clearInterval(interval);
            onUndo();
          },
        },
      });
    }, 1000);
  };

  const dismissToast = () => {
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  };

  return { showUndoToast, dismissToast };
}

/* ========================================================================== */
/*  INLINE SEARCHABLE BRAND SELECT                                            */
/* ========================================================================== */

interface SearchableBrandSelectProps {
  value: string;
  onChange: (value: string) => void;
  brands: Brand[];
}

function SearchableBrandSelect({ value, onChange, brands }: SearchableBrandSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return brands;
    return brands.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [brands, search]);

  const selectedBrand = brands.find((b) => b.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
        >
          {selectedBrand ? selectedBrand.name : "Select brand..."}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder="Search brand..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>No brand found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-auto">
            {filtered.map((brand) => (
              <CommandItem
                key={brand.id}
                value={brand.name}
                onSelect={() => {
                  onChange(brand.id);
                  setOpen(false);
                  setSearch("");
                }}
              >
                {brand.name}
                {brand.category && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({brand.category.name})
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ========================================================================== */
/*  PAGE COMPONENT                                                            */
/* ========================================================================== */

export default function ProductPage(): JSX.Element {
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");

  // Product form
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    brandId: "",
    packagingId: "",
    unitsPerBox: DEFAULT_UNITS_PER_BOX,
    buyPricePerBox: "",
    sellPricePerBox: "",
    sellPricePerUnit: "",
    allowLoss: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lockPrices, setLockPrices] = useState(true);

  // Delete + undo
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showUndoToast, dismissToast } = useUndoToast();

  // Entity manager
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [activeEntityTab, setActiveEntityTab] = useState<"category" | "brand" | "packaging">("category");
  const [entityForm, setEntityForm] = useState({
    name: "",
    type: "",
    categoryId: "",
  });
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [entitySearch, setEntitySearch] = useState("");
  const [entityLoading, setEntityLoading] = useState(false);

  // Expandable rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastProductElementRef = useRef<HTMLTableRowElement | null>(null);

  // ------------ BULK CREATE FROM BRANDS ------------
  const [batchOpen, setBatchOpen] = useState(false);
  const [selectedBrandIds, setSelectedBrandIds] = useState<Set<string>>(new Set());
  const [batchForm, setBatchForm] = useState({
    packagingId: "",
    unitsPerBox: DEFAULT_UNITS_PER_BOX,
    buyPricePerBox: "",
    sellPricePerBox: "",
    sellPricePerUnit: "",
    allowLoss: true,
  });
  // custom name/description per selected brand
  const [brandCustomizations, setBrandCustomizations] = useState<Map<string, { name: string; description: string }>>(new Map());
  const [batchLoading, setBatchLoading] = useState(false);

  // Brands that already have a product (based on currently loaded products)
  const usedBrandIds = useMemo(() => {
    const ids = new Set<string>();
    products.forEach((p) => ids.add(p.brandId));
    return ids;
  }, [products]);

  // Brands available for batch creation (those not already used)
  const availableBatchBrands = useMemo(() => {
    return brands.filter((b) => !usedBrandIds.has(b.id));
  }, [brands, usedBrandIds]);

  // Initialize default customizations when brands are selected/deselected
  useEffect(() => {
    const newMap = new Map(brandCustomizations);
    let changed = false;
    // Remove entries for unselected brands
    for (const [id] of newMap) {
      if (!selectedBrandIds.has(id)) {
        newMap.delete(id);
        changed = true;
      }
    }
    // Add default for newly selected brands
    for (const id of selectedBrandIds) {
      if (!newMap.has(id)) {
        const brand = brands.find((b) => b.id === id);
        if (brand) {
          newMap.set(id, {
            name: brand.name,
            description: `${brand.name} ${brand.category?.name ?? ""}`.trim(),
          });
          changed = true;
        }
      }
    }
    if (changed) setBrandCustomizations(newMap);
  }, [selectedBrandIds, brands, brandCustomizations]);

  /* ========================================================================
     DATA FETCHING
     ======================================================================== */

  const fetchProducts = useCallback(
    async (pageNum: number, reset = false) => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.append("page", pageNum.toString());
        params.append("limit", PRODUCTS_PAGE_SIZE.toString());
        if (search) params.append("search", search);
        if (brandFilter !== "all") params.append("brandId", brandFilter);

        const response = await api.get<{
          data: Product[];
          page: number;
          hasMore: boolean;
          total: number;
        }>(`/products?${params.toString()}`);

        const { data, hasMore: more, page: currentPage } = response.data;
        const productsData = Array.isArray(data) ? data : [];

        setProducts((prev) => (reset ? productsData : [...prev, ...productsData]));
        setHasMore(!!more);
        setPage(currentPage);
      } catch (e: unknown) {
        const message =
          (e as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? "Failed to load products";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [search, brandFilter]
  );

  const fetchSupportingData = useCallback(async () => {
    try {
      const [cRes, bRes, pkgRes] = await Promise.all([
        api.get<Category[]>("/categories"),
        api.get<Brand[]>("/brands"),
        api.get<Packaging[]>("/packagings"),
      ]);
      setCategories(Array.isArray(cRes.data) ? cRes.data : []);
      setBrands(Array.isArray(bRes.data) ? bRes.data : []);
      setPackagings(Array.isArray(pkgRes.data) ? pkgRes.data : []);
    } catch (e) {
      console.error("Failed to fetch supporting data", e);
      toast.error("Could not load categories, brands, or packaging types");
    }
  }, []);

  useEffect(() => {
    fetchProducts(1, true);
    fetchSupportingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    fetchProducts(1, true);
  }, [search, brandFilter, fetchProducts]);

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
  }, [hasMore, loading, initialLoading, page, fetchProducts]);

  /* ========================================================================
     HELPERS
     ======================================================================== */

  const getLatestPrice = (product: Product) => {
    const latest = product.prices?.[0];
    return {
      buyPricePerBox: Number(latest?.buyPricePerBox) || 0,
      sellPricePerBox: Number(latest?.sellPricePerBox) || 0,
      sellPricePerUnit: Number(latest?.sellPricePerUnit) || 0,
      allowLoss: latest?.allowLoss ?? false,
    };
  };

  const getDefaultPackagingId = (): string => {
    if (packagings.length > 0) return packagings[0].id;
    return "";
  };

  const resetProductForm = (keepPrices = false) => {
    const prevPrices = keepPrices
      ? {
          buyPricePerBox: form.buyPricePerBox,
          sellPricePerBox: form.sellPricePerBox,
          sellPricePerUnit: form.sellPricePerUnit,
          allowLoss: form.allowLoss,
        }
      : {
          buyPricePerBox: "",
          sellPricePerBox: "",
          sellPricePerUnit: "",
          allowLoss: true,
        };

    setForm({
      name: "",
      description: "",
      brandId: "",
      packagingId: getDefaultPackagingId(),
      unitsPerBox: DEFAULT_UNITS_PER_BOX,
      ...prevPrices,
    });
    setEditingId(null);
  };

  const openProductForm = (product?: Product) => {
    if (product) {
      const latest = getLatestPrice(product);
      setForm({
        name: product.name,
        description: product.description || "",
        brandId: product.brandId,
        packagingId: product.packagingId,
        unitsPerBox: product.unitsPerBox,
        buyPricePerBox: String(latest.buyPricePerBox),
        sellPricePerBox: String(latest.sellPricePerBox),
        sellPricePerUnit: String(latest.sellPricePerUnit),
        allowLoss: latest.allowLoss,
      });
      setEditingId(product.id);
    } else {
      resetProductForm(false);
    }
    setFormDialogOpen(true);
  };

  /* ========================================================================
     PRODUCT CRUD
     ======================================================================== */

  const handleProductSubmit = async () => {
    if (!form.name || !form.brandId || !form.packagingId) {
      toast.error("Please fill all required fields");
      return;
    }

    const payload = {
      name: form.name,
      description: form.description,
      brandId: form.brandId,
      packagingId: form.packagingId,
      unitsPerBox: form.unitsPerBox,
      buyPricePerBox: Number(form.buyPricePerBox) || 0,
      sellPricePerBox: Number(form.sellPricePerBox) || 0,
      sellPricePerUnit: Number(form.sellPricePerUnit) || 0,
      allowLoss: form.allowLoss,
    };

    try {
      setLoading(true);
      if (editingId) {
        await api.put(`/products/${editingId}`, {
          name: payload.name,
          description: payload.description,
          brandId: payload.brandId,
          packagingId: payload.packagingId,
          unitsPerBox: payload.unitsPerBox,
        });
        const currentProduct = products.find((p) => p.id === editingId);
        const latest = currentProduct ? getLatestPrice(currentProduct) : null;
        const priceChanged =
          !latest ||
          latest.buyPricePerBox !== Number(form.buyPricePerBox) ||
          latest.sellPricePerBox !== Number(form.sellPricePerBox) ||
          latest.sellPricePerUnit !== Number(form.sellPricePerUnit) ||
          latest.allowLoss !== form.allowLoss;
        if (priceChanged) {
          await api.post(`/products/${editingId}/prices`, {
            buyPricePerBox: Number(form.buyPricePerBox) || 0,
            sellPricePerBox: Number(form.sellPricePerBox) || 0,
            sellPricePerUnit: Number(form.sellPricePerUnit) || 0,
            allowLoss: form.allowLoss,
          });
        }
        toast.success("Product updated");
        setFormDialogOpen(false);
        resetProductForm(false);
        setProducts([]);
        setPage(1);
        setHasMore(true);
        fetchProducts(1, true);
      } else {
        await api.post("/products", payload);
        toast.success("Product created");
        if (!lockPrices) {
          setFormDialogOpen(false);
          resetProductForm(false);
        } else {
          resetProductForm(true);
        }
        setProducts([]);
        setPage(1);
        setHasMore(true);
        fetchProducts(1, true);
      }
      fetchSupportingData();
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to save product";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setDeleteAlertOpen(true);
  };

  const executeDeletion = () => {
    if (!productToDelete) return;
    const backup = { ...productToDelete };
    const idToDelete = productToDelete.id;

    setProducts((prev) => prev.filter((p) => p.id !== idToDelete));
    setDeleteAlertOpen(false);
    setProductToDelete(null);

    showUndoToast(
      "Product deleted",
      `Undo within ${UNDO_SECONDS}s`,
      () => {
        setProducts((prev) => [backup, ...prev]);
        dismissToast();
        if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
          undoTimeoutRef.current = null;
        }
      },
      UNDO_SECONDS
    );

    undoTimeoutRef.current = setTimeout(async () => {
      try {
        await api.delete(`/products/${idToDelete}`);
      } catch {
        // ignore
      }
      undoTimeoutRef.current = null;
    }, UNDO_SECONDS * 1000);
  };

  /* ========================================================================
     BULK CREATE FROM BRANDS
     ======================================================================== */

  const toggleBrandSelection = (brandId: string) => {
    setSelectedBrandIds((prev) => {
      const next = new Set(prev);
      if (next.has(brandId)) next.delete(brandId);
      else next.add(brandId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedBrandIds.size === availableBatchBrands.length) {
      setSelectedBrandIds(new Set());
    } else {
      setSelectedBrandIds(new Set(availableBatchBrands.map((b) => b.id)));
    }
  };

  const updateCustomName = (brandId: string, name: string) => {
    setBrandCustomizations((prev) => {
      const next = new Map(prev);
      const existing = next.get(brandId) || { name: "", description: "" };
      next.set(brandId, { ...existing, name });
      return next;
    });
  };

  const updateCustomDescription = (brandId: string, description: string) => {
    setBrandCustomizations((prev) => {
      const next = new Map(prev);
      const existing = next.get(brandId) || { name: "", description: "" };
      next.set(brandId, { ...existing, description });
      return next;
    });
  };

  const handleBatchCreate = async () => {
    if (!batchForm.packagingId) {
      toast.error("Please select a packaging type");
      return;
    }
    if (selectedBrandIds.size === 0) {
      toast.error("Select at least one brand");
      return;
    }

    const payload = {
      packagingId: batchForm.packagingId,
      unitsPerBox: batchForm.unitsPerBox,
      buyPricePerBox: Number(batchForm.buyPricePerBox) || 0,
      sellPricePerBox: Number(batchForm.sellPricePerBox) || 0,
      sellPricePerUnit: Number(batchForm.sellPricePerUnit) || 0,
      allowLoss: batchForm.allowLoss,
    };

    setBatchLoading(true);
    let created = 0;
    let failed = 0;

    const ids = Array.from(selectedBrandIds);
    for (const brandId of ids) {
      const custom = brandCustomizations.get(brandId);
      const productName = custom?.name || brands.find((b) => b.id === brandId)?.name || "Unnamed";
      const productDescription = custom?.description || "";

      try {
        await api.post("/products", {
          name: productName,
          description: productDescription,
          brandId,
          ...payload,
        });
        created++;
      } catch (e) {
        failed++;
      }
    }

    if (created > 0) {
      toast.success(`${created} product${created > 1 ? "s" : ""} created`);
    }
    if (failed > 0) {
      toast.error(`${failed} product${failed > 1 ? "s" : ""} failed`);
    }

    setBatchLoading(false);
    setBatchOpen(false);
    setSelectedBrandIds(new Set());
    setBrandCustomizations(new Map());
    setProducts([]);
    setPage(1);
    setHasMore(true);
    fetchProducts(1, true);
    fetchSupportingData();
  };

  /* ========================================================================
     ENTITY CRUD
     ======================================================================== */

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
    setEntityForm({ name: "", type: "", categoryId: "" });
    setEditingEntityId(null);
  };

  const handleEntitySubmit = async () => {
    const endpoint = getEntityEndpoint();
    let payload: Record<string, string | number>;

    if (activeEntityTab === "packaging") {
      if (!entityForm.type) {
        toast.error("Packaging type is required");
        return;
      }
      payload = { type: entityForm.type.trim().toLowerCase() };
    } else if (activeEntityTab === "brand") {
      if (!entityForm.name || !entityForm.categoryId) {
        toast.error("Brand name and category are required");
        return;
      }
      payload = { name: entityForm.name.trim(), categoryId: entityForm.categoryId };
    } else {
      if (!entityForm.name) {
        toast.error("Category name is required");
        return;
      }
      payload = { name: entityForm.name.trim() };
    }

    try {
      setEntityLoading(true);
      if (editingEntityId) {
        await api.put(`${endpoint}/${editingEntityId}`, payload);
        toast.success(`${activeEntityTab} updated`);
      } else {
        await api.post(endpoint, payload);
        toast.success(`${activeEntityTab} created`);
      }
      resetEntityForm();
      await fetchSupportingData();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? `Failed to save ${activeEntityTab}`;
      toast.error(msg);
    } finally {
      setEntityLoading(false);
    }
  };

  const handleEditEntity = (entity: Category | Brand | Packaging) => {
    setEditingEntityId(entity.id);
    if (isPackaging(entity)) {
      setEntityForm({ name: "", type: entity.name, categoryId: "" });
    } else if (isBrand(entity)) {
      setEntityForm({ name: entity.name, type: "", categoryId: entity.categoryId });
    } else {
      setEntityForm({ name: (entity as Category).name, type: "", categoryId: "" });
    }
  };

  const handleDeleteEntity = async (id: string) => {
    if (!confirm(`Delete this ${activeEntityTab}?`)) return;
    try {
      await api.delete(`${getEntityEndpoint()}/${id}`);
      toast.success(`${activeEntityTab} deleted`);
      await fetchSupportingData();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? `Failed to delete ${activeEntityTab}`;
      toast.error(msg);
    }
  };

  const filteredEntities = useMemo(() => {
    const searchLower = entitySearch.toLowerCase();
    if (activeEntityTab === "category") {
      return categories.filter((c) => c.name.toLowerCase().includes(searchLower));
    }
    if (activeEntityTab === "brand") {
      return brands.filter((b) => b.name.toLowerCase().includes(searchLower));
    }
    return packagings.filter((p) =>
      getPackagingDisplayName(p).toLowerCase().includes(searchLower)
    );
  }, [activeEntityTab, categories, brands, packagings, entitySearch]);

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const safePackagingName = (product: Product): string => {
    if (product.packaging?.name) return product.packaging.name;
    const found = packagings.find((p) => p.id === product.packagingId);
    return found ? getPackagingDisplayName(found) : "—";
  };

  /* ========================================================================
     RENDER
     ======================================================================== */

  if (initialLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Product Catalog
              </h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Manage products, pricing, categories, brands, and packaging
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEntityDialogOpen(true)}
                className="shadow-sm border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950"
              >
                <Settings className="mr-2 h-4 w-4" /> Manage Entities
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBatchOpen(true);
                  setSelectedBrandIds(new Set());
                  setBrandCustomizations(new Map());
                  setBatchForm({
                    packagingId: getDefaultPackagingId(),
                    unitsPerBox: DEFAULT_UNITS_PER_BOX,
                    buyPricePerBox: "",
                    sellPricePerBox: "",
                    sellPricePerUnit: "",
                    allowLoss: true,
                  });
                }}
                className="shadow-sm border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950"
              >
                <ClipboardList className="mr-2 h-4 w-4" /> Batch Create
              </Button>
              <Button
                onClick={() => openProductForm()}
                className="shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0"
              >
                <Plus className="mr-2 h-4 w-4" /> New Product
              </Button>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid gap-4 md:grid-cols-4"
          >
            <Card className="border-l-4 border-l-indigo-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {products.length}
                  </p>
                </div>
                <Package className="h-8 w-8 text-indigo-500 opacity-80" />
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Categories</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {categories.length}
                  </p>
                </div>
                <Layers className="h-8 w-8 text-emerald-500 opacity-80" />
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Brands</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {brands.length}
                  </p>
                </div>
                <Tag className="h-8 w-8 text-amber-500 opacity-80" />
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-rose-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Packaging Types</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                    {packagings.length}
                  </p>
                </div>
                <Archive className="h-8 w-8 text-rose-500 opacity-80" />
              </CardContent>
            </Card>
          </motion.div>

          {/* Search & Brand Filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="h-8 px-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700"
              >
                {products.length} products
              </Badge>
              <SearchableBrandSelect
                value={brandFilter}
                onChange={setBrandFilter}
                brands={[{ id: "all", name: "All brands", categoryId: "" }, ...brands]}
              />
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

          {/* Error display */}
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

          {/* Product Table */}
          <Card className="overflow-hidden border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-b-2 border-slate-300 dark:border-slate-600">
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead className="text-right">Buy/Box</TableHead>
                  <TableHead className="text-right">Sell/Box</TableHead>
                  <TableHead className="text-right">Sell/Unit</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-12 w-12 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No products found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product, index) => {
                    const isExpanded = expandedRows.has(product.id);
                    const isLast = index === products.length - 1;
                    const latest = getLatestPrice(product);

                    return (
                      <React.Fragment key={product.id}>
                        <TableRow
                          ref={isLast ? lastProductElementRef : null}
                          className="group cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 dark:hover:from-indigo-950/30 dark:hover:to-purple-950/30"
                          onClick={() => toggleRowExpanded(product.id)}
                        >
                          <TableCell>
                            <motion.span
                              animate={{ rotate: isExpanded ? 90 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="inline-block"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </motion.span>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center">
                                <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              {product.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.brand?.category?.name ?? "—"}
                          </TableCell>
                          <TableCell>{product.brand?.name ?? "—"}</TableCell>
                          <TableCell className="text-right font-mono text-blue-600">
                            {latest.buyPricePerBox.toFixed(2)} {CURRENCY}
                          </TableCell>
                          <TableCell className="text-right font-mono text-emerald-600">
                            {latest.sellPricePerBox.toFixed(2)} {CURRENCY}
                          </TableCell>
                          <TableCell className="text-right font-mono text-emerald-600">
                            {latest.sellPricePerUnit.toFixed(2)} {CURRENCY}
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
                                      openProductForm(product);
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
                                    className="h-8 w-8 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      confirmDeleteProduct(product);
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
                          <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50">
                            <TableCell colSpan={8} className="p-0">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="px-6 py-5"
                              >
                                <div className="grid gap-6 md:grid-cols-2">
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
                                      <span className="text-muted-foreground">Units/Box:</span>
                                      <span className="font-mono font-medium">
                                        {product.unitsPerBox}
                                      </span>
                                      <span className="text-muted-foreground">Packaging:</span>
                                      <span className="capitalize">
                                        {safePackagingName(product)}
                                      </span>
                                      <span className="text-muted-foreground">Allow Loss:</span>
                                      <span>{latest.allowLoss ? "Yes" : "No"}</span>
                                      <span className="text-muted-foreground">Created:</span>
                                      <span>
                                        {product.createdAt
                                          ? new Date(product.createdAt).toLocaleDateString()
                                          : "—"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                        <Clock className="h-4 w-4 text-white" />
                                      </div>
                                      <h4 className="font-semibold text-purple-700 dark:text-purple-300">
                                        Price History
                                      </h4>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                                      {product.prices && product.prices.length > 0 ? (
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="bg-slate-100 dark:bg-slate-800 text-muted-foreground">
                                              <th className="text-left px-3 py-2">From</th>
                                              <th className="text-left px-3 py-2">To</th>
                                              <th className="text-left px-3 py-2">Buy/Box</th>
                                              <th className="text-left px-3 py-2">Sell/Box</th>
                                              <th className="text-left px-3 py-2">Sell/Unit</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {product.prices.map((price) => (
                                              <tr
                                                key={price.id}
                                                className="border-t border-slate-100 dark:border-slate-800"
                                              >
                                                <td className="px-3 py-2">
                                                  {new Date(price.startAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-3 py-2">
                                                  {price.endAt
                                                    ? new Date(price.endAt).toLocaleDateString()
                                                    : "Current"}
                                                </td>
                                                <td className="px-3 py-2">
                                                  {Number(price.buyPricePerBox).toFixed(2)} {CURRENCY}
                                                </td>
                                                <td className="px-3 py-2">
                                                  {Number(price.sellPricePerBox).toFixed(2)} {CURRENCY}
                                                </td>
                                                <td className="px-3 py-2">
                                                  {Number(price.sellPricePerUnit).toFixed(2)} {CURRENCY}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      ) : (
                                        <p className="p-3 text-center text-muted-foreground">
                                          No price history
                                        </p>
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
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-20 text-center">
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
          <DialogContent className="min-w-[600px] border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {editingId ? "Edit Product" : "New Product"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update product details and pricing"
                  : "Add a new product to the catalog"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Brand *</Label>
                <SearchableBrandSelect
                  value={form.brandId}
                  onChange={(v) => setForm({ ...form, brandId: v })}
                  brands={brands}
                />
              </div>
              <div className="space-y-2">
                <Label>Packaging *</Label>
                <Select
                  value={form.packagingId}
                  onValueChange={(v) => setForm({ ...form, packagingId: v })}
                >
                  <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {packagings.length === 0 ? (
                      <div className="px-2 py-1 text-sm text-muted-foreground">
                        No packaging types available
                      </div>
                    ) : (
                      packagings.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {getPackagingDisplayName(p)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Units per Box</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.unitsPerBox}
                  onChange={(e) =>
                    setForm({ ...form, unitsPerBox: Number(e.target.value) || 1 })
                  }
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Buy Price/Box ({CURRENCY})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.buyPricePerBox}
                  onChange={(e) => setForm({ ...form, buyPricePerBox: e.target.value })}
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Sell Price/Box ({CURRENCY})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.sellPricePerBox}
                  onChange={(e) => setForm({ ...form, sellPricePerBox: e.target.value })}
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Sell Price/Unit ({CURRENCY})</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.sellPricePerUnit}
                  onChange={(e) => setForm({ ...form, sellPricePerUnit: e.target.value })}
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.allowLoss}
                  onCheckedChange={(c) => setForm({ ...form, allowLoss: c })}
                />
                <Label>Allow selling below cost</Label>
              </div>
              {!editingId && (
                <div className="flex items-center gap-2">
                  <Switch checked={lockPrices} onCheckedChange={setLockPrices} />
                  <Label className="flex items-center gap-1">
                    {lockPrices ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Unlock className="h-3 w-3" />
                    )}
                    Quick‑add (keep prices)
                  </Label>
                </div>
              )}
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
                onClick={handleProductSubmit}
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              >
                {editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{productToDelete?.name}</strong>?
                <br />
                You will have {UNDO_SECONDS} seconds to undo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={executeDeletion}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Batch Create Dialog */}
        <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
          <DialogContent className="max-w-2xl border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Batch Create from Brands
              </DialogTitle>
              <DialogDescription>
                Select brands and set common pricing. Product names = brand name, descriptions = brand + category name (customisable).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <Label>Available Brands ({availableBatchBrands.length})</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="text-xs"
                >
                  {selectedBrandIds.size === availableBatchBrands.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              {availableBatchBrands.length === 0 ? (
                <p className="text-muted-foreground text-sm">All brands already have a product.</p>
              ) : (
                <div className="border rounded-lg max-h-60 overflow-auto">
                  {availableBatchBrands.map((brand) => {
                    const isSelected = selectedBrandIds.has(brand.id);
                    const custom = brandCustomizations.get(brand.id) || { name: brand.name, description: `${brand.name} ${brand.category?.name ?? ""}` };
                    return (
                      <div
                        key={brand.id}
                        className={`flex flex-col px-3 py-2 border-b last:border-b-0 ${isSelected ? "bg-indigo-50 dark:bg-indigo-950/30" : ""}`}
                      >
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleBrandSelection(brand.id)}>
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{brand.name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {brand.category?.name || "—"}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="mt-2 ml-6 grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Product Name</Label>
                              <Input
                                value={custom.name}
                                onChange={(e) => updateCustomName(brand.id, e.target.value)}
                                className="h-7 text-xs"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Description</Label>
                              <Input
                                value={custom.description}
                                onChange={(e) => updateCustomDescription(brand.id, e.target.value)}
                                className="h-7 text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs">Packaging *</Label>
                  <Select
                    value={batchForm.packagingId}
                    onValueChange={(v) => setBatchForm({ ...batchForm, packagingId: v })}
                  >
                    <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm h-9">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {packagings.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {getPackagingDisplayName(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Units per Box</Label>
                  <Input
                    type="number"
                    min={1}
                    value={batchForm.unitsPerBox}
                    onChange={(e) => setBatchForm({ ...batchForm, unitsPerBox: Number(e.target.value) || 1 })}
                    className="h-9 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Buy Price/Box ({CURRENCY})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={batchForm.buyPricePerBox}
                    onChange={(e) => setBatchForm({ ...batchForm, buyPricePerBox: e.target.value })}
                    className="h-9 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Sell Price/Box ({CURRENCY})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={batchForm.sellPricePerBox}
                    onChange={(e) => setBatchForm({ ...batchForm, sellPricePerBox: e.target.value })}
                    className="h-9 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Sell Price/Unit ({CURRENCY})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={batchForm.sellPricePerUnit}
                    onChange={(e) => setBatchForm({ ...batchForm, sellPricePerUnit: e.target.value })}
                    className="h-9 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <Switch
                    checked={batchForm.allowLoss}
                    onCheckedChange={(c) => setBatchForm({ ...batchForm, allowLoss: c })}
                  />
                  <Label className="text-xs">Allow loss</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBatchCreate}
                disabled={batchLoading || selectedBrandIds.size === 0}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
              >
                {batchLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create {selectedBrandIds.size} Product{selectedBrandIds.size !== 1 && "s"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Entity Management Dialog */}
        <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
          <DialogContent className="min-w-[800px] max-h-[90vh] overflow-y-auto border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Manage Entities
              </DialogTitle>
              <DialogDescription>
                Add, edit, or remove categories, brands, and packaging types
              </DialogDescription>
            </DialogHeader>
            <Tabs
              value={activeEntityTab}
              onValueChange={(v) => {
                setActiveEntityTab(v as typeof activeEntityTab);
                resetEntityForm();
                setEntitySearch("");
              }}
            >
              <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
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

              <div className="space-y-4 py-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={`Search ${activeEntityTab}s...`}
                      value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)}
                      className="pl-8 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      resetEntityForm();
                      setEditingEntityId(null);
                    }}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>

                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {filteredEntities.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No {activeEntityTab}s found.
                    </p>
                  ) : (
                    filteredEntities.map((entity) => (
                      <div
                        key={entity.id}
                        className="flex items-center justify-between rounded-xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-3 py-2"
                      >
                        <div className="flex flex-col">
                          <span className="capitalize font-medium">
                            {isPackaging(entity)
                              ? getPackagingDisplayName(entity)
                              : (entity as Category | Brand).name}
                          </span>
                          {isBrand(entity) && (
                            <span className="text-xs text-muted-foreground">
                              {categories.find((c) => c.id === entity.categoryId)?.name ?? "—"}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                            onClick={() => handleEditEntity(entity)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-destructive"
                            onClick={() => handleDeleteEntity(entity.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t pt-4">
                  <Label className="mb-2 block">
                    {editingEntityId ? "Edit" : "Add"} {activeEntityTab}
                  </Label>
                  <div className="mt-2 flex gap-2 items-end">
                    {activeEntityTab === "packaging" ? (
                      <Select
                        value={entityForm.type}
                        onValueChange={(v) => setEntityForm({ ...entityForm, type: v })}
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
                    ) : activeEntityTab === "brand" ? (
                      <>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Name</Label>
                          <Input
                            placeholder="Brand name"
                            value={entityForm.name}
                            onChange={(e) =>
                              setEntityForm({ ...entityForm, name: e.target.value })
                            }
                            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Category</Label>
                          <Select
                            value={entityForm.categoryId}
                            onValueChange={(v) =>
                              setEntityForm({ ...entityForm, categoryId: v })
                            }
                          >
                            <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                              <SelectValue placeholder="Select category" />
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
                      </>
                    ) : (
                      <Input
                        placeholder="Category name"
                        value={entityForm.name}
                        onChange={(e) =>
                          setEntityForm({ ...entityForm, name: e.target.value })
                        }
                        className="flex-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                      />
                    )}
                    <Button
                      onClick={handleEntitySubmit}
                      disabled={entityLoading}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                    >
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
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}