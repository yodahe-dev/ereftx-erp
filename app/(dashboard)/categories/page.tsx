"use client";

import { JSX, useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Tags,
  Package,
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

// ==================== TYPES ====================
interface Category {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

// ==================== CONSTANTS ====================
const DEFAULT_LIMIT = 12;
const UNDO_SECONDS = 10;

export default function CategoryPage(): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<PaginationMeta>({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    limit: DEFAULT_LIMIT,
  });

  // Form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete state
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Category | null>(null);
  const [deleteTimer, setDeleteTimer] = useState(UNDO_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== FETCH CATEGORIES ====================
  const fetchCategories = useCallback(
    async (page = 1, searchTerm = search) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ data: Category[]; meta: PaginationMeta }>(
          `/categories?page=${page}&limit=${meta.limit}&search=${encodeURIComponent(searchTerm)}`
        );
        setCategories(res.data.data || []);
        setMeta(res.data.meta);
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Failed to load categories";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [meta.limit] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Initial fetch
  useEffect(() => {
    fetchCategories(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchCategories(1, search);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search, fetchCategories]);

  // ==================== FORM HANDLERS ====================
  const resetForm = () => {
    setFormName("");
    setEditingId(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (cat: Category) => {
    setFormName(cat.name);
    setEditingId(cat.id);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const name = formName.trim();
    if (!name) {
      setError("Category name is required");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = { name };
      if (editingId) {
        await api.put(`/categories/${editingId}`, payload);
        toast.success("Category updated");
      } else {
        await api.post("/categories", payload);
        toast.success("Category created");
      }
      setDialogOpen(false);
      resetForm();
      await fetchCategories(meta.currentPage);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to save category";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== DELETE WITH UNDO ====================
  const initiateDelete = (cat: Category) => {
    setDeleteItem(cat);
    setDeleteTimer(UNDO_SECONDS);
    setDeleteAlertOpen(true);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDeleteTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelDelete = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDeleteAlertOpen(false);
    setDeleteItem(null);
  };

  const confirmDelete = async () => {
    if (!deleteItem || deleteTimer > 0) return;
    try {
      await api.delete(`/categories/${deleteItem.id}`);
      toast.success("Category deleted");
      await fetchCategories(meta.currentPage);
    } catch (err) {
      toast.error("Failed to delete category");
    } finally {
      cancelDelete();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ==================== PAGINATION ====================
  const handlePageChange = (page: number) => {
    if (page < 1 || page > meta.totalPages) return;
    fetchCategories(page, search);
  };

  // ==================== RENDER ====================
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
                Category Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Manage your product categories
              </p>
            </div>
            <Button
              onClick={openCreateDialog}
              className="shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </motion.div>

          {/* Statistics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid gap-4 md:grid-cols-2"
          >
            <Card className="border-l-4 border-l-emerald-500 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {meta.totalItems}
                  </p>
                  <Tags className="h-8 w-8 text-emerald-500 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Search & Info */}
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
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive backdrop-blur-sm"
            >
              <span>{error}</span>
            </motion.div>
          )}

          {/* Categories Grid */}
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="mx-auto h-16 w-16 text-muted-foreground/40" />
              <p className="mt-4 text-lg text-muted-foreground">
                {search ? "No categories match your search" : "No categories found"}
              </p>
              {!search && (
                <Button
                  variant="link"
                  className="mt-2 text-indigo-600 dark:text-indigo-400"
                  onClick={openCreateDialog}
                >
                  Create your first category
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories.map((cat) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    layout
                  >
                    <Card className="group bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-0 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
                      <CardContent className="p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 flex items-center justify-center shrink-0">
                            <Tags className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                              {cat.name}
                            </h3>
                            {cat.createdAt && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Created {new Date(cat.createdAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                onClick={() => openEditDialog(cat)}
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
                                onClick={() => initiateDelete(cat)}
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

        {/* Category Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {editingId ? "Edit Category" : "Create Category"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update the category name"
                  : "Add a new product category"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category Name *</Label>
                <Input
                  placeholder="e.g., Beer, Wine, Soft Drinks"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
                className="border-slate-300 dark:border-slate-700"
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
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation with Countdown */}
        <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteItem && (
                  <>
                    Permanently delete{" "}
                    <strong className="capitalize">{deleteItem.name}</strong>?
                    <br />
                    {deleteTimer > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        Undo available in {deleteTimer}s...
                      </span>
                    ) : (
                      <span className="text-destructive">
                        No undo available. This action is immediate.
                      </span>
                    )}
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteTimer > 0}
                className={cn(
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                  deleteTimer > 0 && "opacity-50 cursor-not-allowed"
                )}
              >
                Delete Now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}