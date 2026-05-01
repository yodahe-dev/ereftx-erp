"use client";

import { JSX, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

/**
 * =====================
 * TYPES
 * =====================
 */
interface Category {
  id: string;
  name: string;
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

/**
 * =====================
 * COMPONENT
 * =====================
 */
export default function CategoryPage(): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deletedCategory, setDeletedCategory] = useState<Category | null>(null);

  /**
   * =====================
   * FETCH
   * =====================
   */
  const fetchCategories = async (): Promise<void> => {
    try {
      setError(null);
      const res = await api.get<Category[]>("/categories");
      if (!Array.isArray(res.data)) {
        throw new Error("Invalid API response");
      }
      setCategories(res.data);
    } catch (e: unknown) {
      const err = e as ApiError;
      setError(err?.response?.data?.message || "Failed to load categories");
    }
  };

  useEffect(() => {
    void fetchCategories();
  }, []);

  /**
   * =====================
   * FILTER
   * =====================
   */
  const filteredCategories = useMemo<Category[]>(() => {
    const q = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  /**
   * =====================
   * RESET FORM
   * =====================
   */
  const resetForm = (): void => {
    setName("");
    setEditingId(null);
  };

  /**
   * =====================
   * OPEN DIALOG
   * =====================
   */
  const openCreateDialog = (): void => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (cat: Category): void => {
    setName(cat.name);
    setEditingId(cat.id);
    setDialogOpen(true);
  };

  const handleDialogClose = (): void => {
    setDialogOpen(false);
    resetForm();
  };

  /**
   * =====================
   * SUBMIT
   * =====================
   */
  const handleSubmit = async (): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: { name: string } = { name: trimmed };

      if (editingId) {
        await api.put(`/categories/${editingId}`, payload);
        toast.success("Category updated");
      } else {
        await api.post("/categories", payload);
        toast.success("Category created");
      }

      handleDialogClose();
      await fetchCategories();
    } catch (e: unknown) {
      const err = e as ApiError;
      setError(err?.response?.data?.message || "Failed to save category");
      toast.error(err?.response?.data?.message || "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  /**
   * =====================
   * DELETE WITH UNDO
   * =====================
   */
  const initiateDelete = (cat: Category): void => {
    setDeleteCategoryId(cat.id);
    setDeletedCategory(cat);
    setDeleteAlertOpen(true);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deleteCategoryId || !deletedCategory) return;

    try {
      await api.delete(`/categories/${deleteCategoryId}`);
      // Remove from local state immediately
      setCategories((prev) => prev.filter((c) => c.id !== deleteCategoryId));
      // Show undo toast
      toast("Category deleted", {
        description: "You can undo this action within 10 seconds.",
        duration: UNDO_SECONDS * 1000,
        position: "bottom-left",
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              // Re-create the category using the saved name
              await api.post("/categories", { name: deletedCategory.name });
              toast.success("Category restored");
              await fetchCategories();
            } catch (e: any) {
              toast.error(e?.response?.data?.message || "Failed to undo delete");
            }
          },
        },
      });
    } catch (e) {
      toast.error("Failed to delete category");
    } finally {
      setDeleteAlertOpen(false);
      setDeleteCategoryId(null);
      setDeletedCategory(null);
    }
  };

  const cancelDelete = (): void => {
    setDeleteAlertOpen(false);
    setDeleteCategoryId(null);
    setDeletedCategory(null);
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
                    {categories.length}
                  </p>
                  <Tags className="h-8 w-8 text-emerald-500 opacity-80" />
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
              {filteredCategories.length} item{filteredCategories.length !== 1 ? "s" : ""}
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

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive backdrop-blur-sm">
              <span>{error}</span>
            </div>
          )}

          {/* Category Cards */}
          {loading && categories.length === 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No categories found</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCategories.map((cat) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="group"
                >
                  <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 flex items-center justify-center">
                          <Tags className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="font-medium text-gray-800 dark:text-gray-100">
                          {cat.name}
                        </span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
          )}
        </div>

        {/* Category Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {editingId ? "Edit Category" : "Add Category"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update the category name"
                  : "Create a new product category"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category Name *</Label>
                <Input
                  placeholder="e.g., Beer, Wine, Soft Drinks"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleDialogClose}
                className="border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              >
                {loading ? "Saving..." : editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation with Undo */}
        <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                This category will be permanently removed.
                You can undo this action for 10 seconds after deletion.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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