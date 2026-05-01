"use client";

import { JSX, useEffect, useMemo, useState } from "react";
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

interface Brand {
  id: string;
  name: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
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
export default function BrandPage(): JSX.Element {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [deleteBrandId, setDeleteBrandId] = useState<string | null>(null);
  const [deletedBrand, setDeletedBrand] = useState<Brand | null>(null);

  /**
   * =====================
   * FETCH DATA
   * =====================
   */
  const fetchBrands = async (): Promise<void> => {
    try {
      setError(null);
      const res = await api.get<Brand[]>("/brands");
      if (!Array.isArray(res.data)) {
        throw new Error("Invalid API response");
      }
      setBrands(res.data);
    } catch (e: unknown) {
      const err = e as ApiError;
      setError(err?.response?.data?.message || "Failed to load brands");
    }
  };

  const fetchCategories = async (): Promise<void> => {
    try {
      const res = await api.get<Category[]>("/categories");
      if (Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  };

  useEffect(() => {
    void fetchBrands();
    void fetchCategories();
  }, []);

  /**
   * =====================
   * FILTER
   * =====================
   */
  const filteredBrands = useMemo<Brand[]>(() => {
    const q = search.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, search]);

  /**
   * =====================
   * RESET FORM
   * =====================
   */
  const resetForm = (): void => {
    setName("");
    setCategoryId("");
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

  const openEditDialog = (brand: Brand): void => {
    setName(brand.name);
    setCategoryId(brand.categoryId);
    setEditingId(brand.id);
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
      setError("Brand name is required");
      return;
    }

    if (!categoryId) {
      setError("Please select a category");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        name: trimmed,
        categoryId,
      };

      if (editingId) {
        await api.put(`/brands/${editingId}`, payload);
        toast.success("Brand updated");
      } else {
        await api.post("/brands", payload);
        toast.success("Brand created");
      }

      handleDialogClose();
      await fetchBrands();
    } catch (e: unknown) {
      const err = e as ApiError;
      setError(err?.response?.data?.message || "Failed to save brand");
      toast.error(err?.response?.data?.message || "Failed to save brand");
    } finally {
      setLoading(false);
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
      // Remove from local state immediately
      setBrands((prev) => prev.filter((b) => b.id !== deleteBrandId));
      // Show undo toast
      toast("Brand deleted", {
        description: "You can undo this action within 10 seconds.",
        duration: UNDO_SECONDS * 1000,
        position: "bottom-left",
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              // Re-create the brand with saved data
              await api.post("/brands", {
                name: deletedBrand.name,
                categoryId: deletedBrand.categoryId,
              });
              toast.success("Brand restored");
              await fetchBrands();
            } catch (e: any) {
              toast.error(e?.response?.data?.message || "Failed to undo delete");
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
                Brand Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Manage your product brands
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
                  Total Brands
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {brands.length}
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
              {filteredBrands.length} item{filteredBrands.length !== 1 ? "s" : ""}
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
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive backdrop-blur-sm">
              <span>{error}</span>
            </div>
          )}

          {/* Brand Cards */}
          {loading && brands.length === 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-muted-foreground">No brands found</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredBrands.map((brand) => (
                <motion.div
                  key={brand.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="group"
                >
                  <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center">
                          <Tag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-800 dark:text-gray-100">
                            {brand.name}
                          </span>
                          {brand.category && (
                            <p className="text-xs text-muted-foreground">
                              {brand.category.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
          )}
        </div>

        {/* Brand Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md border-0 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {editingId ? "Edit Brand" : "Add Brand"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update the brand details"
                  : "Create a new product brand"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Brand Name *</Label>
                <Input
                  placeholder="Brand name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category *</Label>
                <Select
                  value={categoryId}
                  onValueChange={(v) => setCategoryId(v)}
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

        {/* Delete Confirmation (simple yes/no) */}
        <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Brand</AlertDialogTitle>
              <AlertDialogDescription>
                This brand will be permanently removed.
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