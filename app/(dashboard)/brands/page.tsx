"use client";

import { JSX, useEffect, useMemo, useState, useRef, useCallback } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  Search,
  Sparkles,
  Tag,
  Package,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

/**
 * =====================
 * TYPES
 * =====================
 */
interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
  categoryId: string;
  createdAt?: string;
  category?: {
    id: string;
    name: string;
  };
}

interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

/**
 * =====================
 * CONSTANTS
 * =====================
 */
const UNDO_SECONDS = 10;
const DEFAULT_PAGE_LIMIT = 12;

/**
 * =====================
 * COMPONENT
 * =====================
 */
export default function BrandPage(): JSX.Element {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Pagination meta
  const [meta, setMeta] = useState<PaginationMeta>({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: DEFAULT_PAGE_LIMIT,
  });

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState<string>("");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [deleteBrandId, setDeleteBrandId] = useState<string | null>(null);
  const [deletedBrand, setDeletedBrand] = useState<Brand | null>(null);

  // Debounce search
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * =====================
   * FETCH BRANDS (server‑side pagination & search)
   * =====================
   */
  const fetchBrands = useCallback(async (page = 1, searchTerm = search) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<{ data: Brand[]; meta: PaginationMeta }>(
        `/brands?page=${page}&limit=${meta.limit}&search=${encodeURIComponent(searchTerm)}`
      );
      setBrands(res.data.data);
      setMeta(res.data.meta);
    } catch (e: unknown) {
      const err = e as ApiError;
      const msg = err?.response?.data?.message || "Failed to load brands";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [meta.limit, search]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * =====================
   * FETCH CATEGORIES (unchanged)
   * =====================
   */
  const fetchCategories = async (): Promise<void> => {
    try {
      const res = await api.get<{ data: Category[] }>("/categories");
      if (Array.isArray(res.data.data)) {
        setCategories(res.data.data);
      } else if (Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  };

  // Initial load
  useEffect(() => {
    fetchBrands(1);
    fetchCategories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search – triggers server fetch
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchBrands(1, search);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search, fetchBrands]);

  /**
   * =====================
   * FORM LOGIC
   * =====================
   */
  const resetForm = (): void => {
    setFormName("");
    setFormCategoryId("");
    setEditingId(null);
  };

  const openCreateDialog = (): void => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (brand: Brand): void => {
    setFormName(brand.name);
    setFormCategoryId(brand.categoryId);
    setEditingId(brand.id);
    setDialogOpen(true);
  };

  const handleSubmit = async (): Promise<void> => {
    const name = formName.trim();
    if (!name) {
      setError("Brand name is required");
      return;
    }
    if (!formCategoryId) {
      setError("Please select a category");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = { name, categoryId: formCategoryId };
      if (editingId) {
        await api.put(`/brands/${editingId}`, payload);
        toast.success("Brand updated");
      } else {
        await api.post("/brands", payload);
        toast.success("Brand created");
      }
      setDialogOpen(false);
      resetForm();
      // Refetch current page
      await fetchBrands(meta.currentPage);
    } catch (e: unknown) {
      const err = e as ApiError;
      const msg = err?.response?.data?.message || "Failed to save brand";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * =====================
   * DELETE WITH UNDO
   * =====================
   */
  const initiateDelete = (brand: Brand): void => {
    setDeleteBrandId(brand.id);
    setDeletedBrand(brand);
    setDeleteAlertOpen(true);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deleteBrandId || !deletedBrand) return;
    try {
      await api.delete(`/brands/${deleteBrandId}`);
      // Optimistic remove
      setBrands((prev) => prev.filter((b) => b.id !== deleteBrandId));
      setMeta((prev) => ({ ...prev, totalItems: prev.totalItems - 1 }));
      toast("Brand deleted", {
        description: "You can undo this action within 10 seconds.",
        duration: UNDO_SECONDS * 1000,
        position: "bottom-left",
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await api.post("/brands", {
                name: deletedBrand.name,
                categoryId: deletedBrand.categoryId,
              });
              toast.success("Brand restored");
              // Refetch current page to get fresh data
              await fetchBrands(meta.currentPage);
            } catch (e: any) {
              toast.error(e?.response?.data?.message || "Failed to undo");
            }
          },
        },
      });
    } catch (e: unknown) {
      const err = e as ApiError;
      toast.error(err?.response?.data?.message || "Failed to delete brand");
    } finally {
      setDeleteAlertOpen(false);
      setDeleteBrandId(null);
      setDeletedBrand(null);
    }
  };

  const cancelDelete = (): void => {
    setDeleteAlertOpen(false);
    setDeleteBrandId(null);
    setDeletedBrand(null);
  };

  /**
   * =====================
   * PAGINATION HELPERS
   * =====================
   */
  const handlePageChange = (page: number) => {
    if (page < 1 || page > meta.totalPages) return;
    fetchBrands(page, search);
  };

  /**
   * =====================
   * RENDER
   * =====================
   */
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
                Brand Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Organize your product lines efficiently
              </p>
            </div>
            <Button
              onClick={openCreateDialog}
              className="shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Brand
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid gap-4 md:grid-cols-2"
          >
            <Card className="border-l-4 border-l-emerald-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Brands
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {meta.totalItems}
                  </p>
                  <Tag className="h-8 w-8 text-emerald-500 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Search & Error */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Badge
              variant="secondary"
              className="h-8 px-3 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700"
            >
              {meta.totalItems} item{meta.totalItems !== 1 ? "s" : ""}
            </Badge>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive backdrop-blur-sm"
            >
              <span>{error}</span>
            </motion.div>
          )}

          {/* Brand Cards Grid */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : brands.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="mx-auto h-16 w-16 text-muted-foreground/40" />
              <p className="mt-4 text-lg text-muted-foreground">
                {search ? "No brands match your search" : "No brands found"}
              </p>
              {!search && (
                <Button
                  variant="link"
                  className="mt-2 text-indigo-600 dark:text-indigo-400"
                  onClick={openCreateDialog}
                >
                  Create your first brand
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {brands.map((brand) => (
                  <motion.div
                    key={brand.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    layout
                  >
                    <Card className="group bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
                      <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center shrink-0">
                            <Tag className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                              {brand.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              {brand.category ? (
                                <Badge variant="outline" className="text-xs font-normal">
                                  {brand.category.name}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                              {brand.createdAt && (
                                <span className="text-xs text-muted-foreground hidden sm:inline">
                                  {new Date(brand.createdAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                onClick={() => openEditDialog(brand)}
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
                                onClick={() => initiateDelete(brand)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {meta.totalPages > 1 && (
                <div className="flex items-center justify-center pt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(meta.currentPage - 1)}
                          className={cn(
                            meta.currentPage === 1 && "pointer-events-none opacity-50"
                          )}
                        />
                      </PaginationItem>
                      {Array.from({ length: meta.totalPages }, (_, i) => i + 1)
                        .filter(
                          (page) =>
                            page === 1 ||
                            page === meta.totalPages ||
                            Math.abs(page - meta.currentPage) <= 1
                        )
                        .map((page, idx, arr) => (
                          <div key={page} className="flex items-center">
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <PaginationItem>
                                <span className="px-2 text-muted-foreground">...</span>
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                onClick={() => handlePageChange(page)}
                                isActive={meta.currentPage === page}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          </div>
                        ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(meta.currentPage + 1)}
                          className={cn(
                            meta.currentPage === meta.totalPages && "pointer-events-none opacity-50"
                          )}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>

        {/* Brand Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {editingId ? "Edit Brand" : "Create Brand"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update the brand details"
                  : "Add a new brand to your inventory"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Brand Name *</Label>
                <Input
                  placeholder="e.g., Coca‑Cola"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category *</Label>
                <Select
                  value={formCategoryId}
                  onValueChange={(v) => setFormCategoryId(v)}
                >
                  <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-slate-300 dark:border-slate-700"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : editingId ? (
                  "Update Brand"
                ) : (
                  "Create Brand"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Brand</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to permanently delete <strong>{deletedBrand?.name}</strong>.
                You can undo this action for {UNDO_SECONDS} seconds after confirmation.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}