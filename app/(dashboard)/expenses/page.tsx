"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  ChevronRight,
  Calendar,
  RefreshCw,
  Loader2,
  Target,
  Receipt,
  Sparkles,
  FolderPlus,
  Undo2,
  AlertTriangle,
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─── Log the API base URL to help debug ───
console.log("🧪 API base URL:", (api as any).defaults?.baseURL || "Not set");

// ==================== TYPES ====================
type ExpenseReferenceType = "stock" | "personal" | "recurring" | "general" | "plan";
interface Expense {
  id: string;
  title: string;
  amount: number;
  expenseDate: string;
  categoryId: string;
  recurringExpenseId?: string | null;
  expensePlanId?: string | null;
  productId?: string | null;
  referenceType: ExpenseReferenceType;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string };
  plan?: { id: string; title: string };
}

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  createdAt: string;
}

type ExpensePlanStatus = "planned" | "active" | "completed" | "cancelled";
interface ExpensePlan {
  id: string;
  title: string;
  targetAmount: number;
  currentAllocatedAmount: number;
  targetDate?: string | null;
  status: ExpensePlanStatus;
  notes?: string | null;
  createdAt: string;
}

type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly" | "custom";
interface RecurringExpense {
  id: string;
  title: string;
  categoryId: string;
  amount: number;
  frequency: RecurringFrequency;
  billingDay: number;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  category?: { id: string; name: string };
}

// ==================== CONSTANTS ====================
const CURRENCY = "ETB";
const QUICK_AMOUNTS = [100, 500, 1000, 5000];
const DELETE_UNDO_SECONDS = 5;

// ==================== MAIN COMPONENT ====================
export default function ExpensesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("expenses");

  // Data states
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [expensePlans, setExpensePlans] = useState<ExpensePlan[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [expenseFilter, setExpenseFilter] = useState({ search: "", categoryId: "", referenceType: "", startDate: "", endDate: "" });
  const [expensePagination, setExpensePagination] = useState({ page: 1, total: 0, limit: 20 });

  // Dialog states
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [previewDatesOpen, setPreviewDatesOpen] = useState(false);
  const [previewDates, setPreviewDates] = useState<Date[]>([]);
  const [generating, setGenerating] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [showQuickCategoryDialog, setShowQuickCategoryDialog] = useState(false);
  const [quickPlanTitle, setQuickPlanTitle] = useState("");
  const [quickPlanTarget, setQuickPlanTarget] = useState("");
  const [showQuickPlanDialog, setShowQuickPlanDialog] = useState(false);
  const [dateRangePreset, setDateRangePreset] = useState("all");

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: "expense" | "category" | "plan" | "recurring";
    id: string;
    title: string;
    deleteFn: () => Promise<void>;
    optimisticData: any;
  } | null>(null);

  // Force delete dialog
  const [forceDeleteDialog, setForceDeleteDialog] = useState<{
    open: boolean;
    id: string;
    title: string;
    categories: ExpenseCategory[];
  } | null>(null);
  const [forceReassignTo, setForceReassignTo] = useState<string>("none");
  const [forceLoading, setForceLoading] = useState(false);

  // Loading states for CRUD operations
  const [isCreatingExpense, setIsCreatingExpense] = useState(false);
  const [isUpdatingExpense, setIsUpdatingExpense] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isCreatingRecurring, setIsCreatingRecurring] = useState(false);
  const [isQuickCreatingCategory, setIsQuickCreatingCategory] = useState(false);
  const [isQuickCreatingPlan, setIsQuickCreatingPlan] = useState(false);

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    expenseDate: "",
    categoryId: "",
    referenceType: "general" as ExpenseReferenceType,
    notes: "",
  });
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [planForm, setPlanForm] = useState({ title: "", targetAmount: "", targetDate: "", status: "planned" as ExpensePlanStatus, notes: "" });
  const [recurringForm, setRecurringForm] = useState({
    title: "",
    categoryId: "",
    amount: "",
    frequency: "monthly" as RecurringFrequency,
    billingDay: "1",
    isActive: true,
    notes: "",
  });

  const getIdempotencyKey = () => crypto.randomUUID();

  // ─── Enhanced error logging ───
  const handleApiError = (err: any, operation: string) => {
    console.error(`❌ ${operation} error:`, err);
    const message = err.response?.data?.message || err.message || "Unknown error";
    const status = err.response?.status || "no status";
    console.error(`   Status: ${status}, URL: ${err.config?.url}`);
    toast.error(`${operation} failed: ${message}`, { position: "bottom-left" });
  };

  // Optimistic delete with undo
  const optimisticDelete = (
    type: "expense" | "category" | "plan" | "recurring",
    id: string,
    title: string,
    optimisticData: any,
    actualDeleteFn: () => Promise<void>
  ) => {
    if (type === "expense") setExpenses(prev => prev.filter(i => i.id !== id));
    else if (type === "category") setExpenseCategories(prev => prev.filter(i => i.id !== id));
    else if (type === "plan") setExpensePlans(prev => prev.filter(i => i.id !== id));
    else if (type === "recurring") setRecurringExpenses(prev => prev.filter(i => i.id !== id));

    let secondsLeft = DELETE_UNDO_SECONDS;
    const toastId = `delete-${type}-${id}`;

    const updateToast = () => {
      toast.custom(
        (t) => (
          <div className="flex items-center justify-between gap-4 p-4 bg-slate-900 border-l-4 border-amber-500 rounded-lg shadow-xl text-white">
            <span className="text-sm">Deleting "{title}" in {secondsLeft}s...</span>
            <Button
              variant="outline"
              size="sm"
              className="border-white/30 text-white hover:bg-white/20 hover:text-white"
              onClick={() => {
                clearInterval(interval);
                clearTimeout(timeout);
                if (type === "expense") setExpenses(prev => [...prev, optimisticData]);
                else if (type === "category") setExpenseCategories(prev => [...prev, optimisticData]);
                else if (type === "plan") setExpensePlans(prev => [...prev, optimisticData]);
                else if (type === "recurring") setRecurringExpenses(prev => [...prev, optimisticData]);
                toast.dismiss(toastId);
                toast.success("Deletion cancelled", { position: "bottom-left" });
              }}
            >
              <Undo2 className="mr-1 h-3 w-3" /> Undo
            </Button>
          </div>
        ),
        { id: toastId, duration: DELETE_UNDO_SECONDS * 1000 + 500, position: "bottom-left" }
      );
    };

    updateToast();

    const interval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(interval);
        clearTimeout(timeout);
        toast.dismiss(toastId);
        actualDeleteFn().catch((err) => {
          handleApiError(err, "Delete");
          if (type === "expense") setExpenses(prev => [...prev, optimisticData]);
          else if (type === "category") setExpenseCategories(prev => [...prev, optimisticData]);
          else if (type === "plan") setExpensePlans(prev => [...prev, optimisticData]);
          else if (type === "recurring") setRecurringExpenses(prev => [...prev, optimisticData]);
          if (type === "category" && err.response?.data?.message.includes('force=true')) {
            setForceDeleteDialog({ open: true, id, title, categories: expenseCategories });
          }
        });
      } else {
        updateToast();
      }
    }, 1000);

    const timeout = setTimeout(() => {
      if (secondsLeft > 0) {
        clearInterval(interval);
        toast.dismiss(toastId);
        actualDeleteFn().catch((err) => {
          handleApiError(err, "Delete");
          if (type === "expense") setExpenses(prev => [...prev, optimisticData]);
          else if (type === "category") setExpenseCategories(prev => [...prev, optimisticData]);
          else if (type === "plan") setExpensePlans(prev => [...prev, optimisticData]);
          else if (type === "recurring") setRecurringExpenses(prev => [...prev, optimisticData]);
        });
      }
    }, DELETE_UNDO_SECONDS * 1000);
  };

  const confirmDelete = (
    type: "expense" | "category" | "plan" | "recurring",
    id: string,
    title: string,
    optimisticData: any,
    actualDeleteFn: () => Promise<void>
  ) => {
    setDeleteConfirm({ open: true, type, id, title, deleteFn: actualDeleteFn, optimisticData });
  };

  const handleForceDelete = async () => {
    if (!forceDeleteDialog) return;
    setForceLoading(true);
    try {
      const params = new URLSearchParams({ force: "true" });
      if (forceReassignTo !== "none") params.append("reassignTo", forceReassignTo);
      await api.delete(`/expense-categories/${forceDeleteDialog.id}?${params.toString()}`);
      toast.success(`Category ${forceReassignTo !== "none" ? "force-deleted with reassignment" : "force-deleted"}`, { position: "bottom-left" });
      await fetchCategories();
      await fetchExpenses();
      setForceDeleteDialog(null);
      setForceReassignTo("none");
    } catch (err: any) {
      handleApiError(err, "Force delete");
    } finally {
      setForceLoading(false);
    }
  };

  // ---------- Data Fetching ----------
  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams();
      if (expenseFilter.search) params.append("search", expenseFilter.search);
      if (expenseFilter.categoryId) params.append("categoryId", expenseFilter.categoryId);
      if (expenseFilter.referenceType) params.append("referenceType", expenseFilter.referenceType);
      if (expenseFilter.startDate) params.append("startDate", expenseFilter.startDate);
      if (expenseFilter.endDate) params.append("endDate", expenseFilter.endDate);
      params.append("page", expensePagination.page.toString());
      params.append("limit", expensePagination.limit.toString());
      const res = await api.get(`/expenses?${params.toString()}`);
      setExpenses(res.data.data || []);
      setExpensePagination(prev => ({ ...prev, total: res.data.pagination?.total || 0 }));
    } catch (error) {
      handleApiError(error, "Fetch expenses");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/expense-categories?flatList=true");
      setExpenseCategories(res.data.data || []);
    } catch (error) {
      handleApiError(error, "Fetch categories");
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get("/expense-plans?limit=100");
      setExpensePlans(res.data.data || []);
    } catch (error) {
      handleApiError(error, "Fetch plans");
    }
  };

  const fetchRecurring = async () => {
    try {
      const res = await api.get("/recurring-expenses?limit=100");
      setRecurringExpenses(res.data.data || []);
    } catch (error) {
      handleApiError(error, "Fetch recurring");
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchExpenses(), fetchCategories(), fetchPlans(), fetchRecurring()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [expensePagination.page, expenseFilter]);

  // ---------- Summary Stats ----------
  const stats = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory: Record<string, number> = {};
    expenses.forEach(e => {
      const catName = e.category?.name || "Uncategorized";
      byCategory[catName] = (byCategory[catName] || 0) + e.amount;
    });
    const recentTrend = expenses.slice(0, 10).reduce((sum, e) => sum + e.amount, 0) / 10 || 0;
    const highestExpense = expenses.reduce((max, e) => e.amount > max ? e.amount : max, 0);
    return { totalExpenses, byCategory, recentTrend, highestExpense };
  }, [expenses]);

  // ---------- Quick Category Creation ----------
  const handleQuickCreateCategory = async () => {
    if (!quickCategoryName.trim()) return toast.error("Category name required", { position: "bottom-left" });
    setIsQuickCreatingCategory(true);
    const idempotencyKey = getIdempotencyKey();
    try {
      const res = await api.post("/expense-categories", {
        name: quickCategoryName,
        parentId: null,
      }, { headers: { "Idempotency-Key": idempotencyKey } });
      toast.success("Category created", { position: "bottom-left" });
      setExpenseCategories(prev => [...prev, res.data.data]);
      setExpenseForm(prev => ({ ...prev, categoryId: res.data.data.id }));
      setQuickCategoryName("");
      setShowQuickCategoryDialog(false);
    } catch (err: any) {
      handleApiError(err, "Quick create category");
    } finally {
      setIsQuickCreatingCategory(false);
    }
  };

  const handleQuickCreatePlan = async () => {
    if (!quickPlanTitle.trim() || !quickPlanTarget) return toast.error("Title and target amount required", { position: "bottom-left" });
    setIsQuickCreatingPlan(true);
    const idempotencyKey = getIdempotencyKey();
    try {
      const res = await api.post("/expense-plans", {
        title: quickPlanTitle,
        targetAmount: parseFloat(quickPlanTarget),
      }, { headers: { "Idempotency-Key": idempotencyKey } });
      toast.success("Plan created", { position: "bottom-left" });
      setExpensePlans(prev => [...prev, res.data.data]);
      setQuickPlanTitle("");
      setQuickPlanTarget("");
      setShowQuickPlanDialog(false);
    } catch (err: any) {
      handleApiError(err, "Quick create plan");
    } finally {
      setIsQuickCreatingPlan(false);
    }
  };

  // ---------- CRUD Handlers ----------
  const handleCreateExpense = async () => {
    if (!expenseForm.title.trim()) {
      toast.error("Title is required", { position: "bottom-left" });
      return;
    }
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      toast.error("Valid amount is required", { position: "bottom-left" });
      return;
    }
    if (!expenseForm.categoryId) {
      toast.error("Please select a category", { position: "bottom-left" });
      return;
    }

    setIsCreatingExpense(true);
    const idempotencyKey = getIdempotencyKey();
    try {
      const payload = {
        title: expenseForm.title.trim(),
        amount: parseFloat(expenseForm.amount),
        expenseDate: expenseForm.expenseDate || undefined,
        categoryId: expenseForm.categoryId,
        referenceType: expenseForm.referenceType,
        notes: expenseForm.notes || undefined,
      };
      console.log("📤 Creating expense with payload:", payload);
      await api.post("/expenses", payload, { headers: { "Idempotency-Key": idempotencyKey } });
      toast.success("Expense created", { position: "bottom-left" });
      setExpenseDialogOpen(false);
      resetExpenseForm();
      await fetchExpenses();
    } catch (err: any) {
      handleApiError(err, "Create expense");
    } finally {
      setIsCreatingExpense(false);
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingItem) return;
    setIsUpdatingExpense(true);
    try {
      const payload = {
        title: expenseForm.title,
        amount: parseFloat(expenseForm.amount),
        expenseDate: expenseForm.expenseDate,
        categoryId: expenseForm.categoryId,
        referenceType: expenseForm.referenceType,
        notes: expenseForm.notes,
      };
      console.log(`📤 Updating expense ${editingItem.id} with:`, payload);
      await api.put(`/expenses/${editingItem.id}`, payload);
      toast.success("Expense updated", { position: "bottom-left" });
      setExpenseDialogOpen(false);
      resetExpenseForm();
      await fetchExpenses();
    } catch (err: any) {
      handleApiError(err, "Update expense");
    } finally {
      setIsUpdatingExpense(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name) return toast.error("Name required", { position: "bottom-left" });
    setIsCreatingCategory(true);
    const idempotencyKey = getIdempotencyKey();
    try {
      await api.post("/expense-categories", {
        name: categoryForm.name,
        description: categoryForm.description,
        parentId: null,
      }, { headers: { "Idempotency-Key": idempotencyKey } });
      toast.success("Category created", { position: "bottom-left" });
      setCategoryDialogOpen(false);
      setCategoryForm({ name: "", description: "" });
      await fetchCategories();
    } catch (err: any) {
      handleApiError(err, "Create category");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!planForm.title || !planForm.targetAmount) return toast.error("Title and target amount required", { position: "bottom-left" });
    setIsCreatingPlan(true);
    const idempotencyKey = getIdempotencyKey();
    try {
      await api.post("/expense-plans", {
        ...planForm,
        targetAmount: parseFloat(planForm.targetAmount),
        targetDate: planForm.targetDate || undefined,
      }, { headers: { "Idempotency-Key": idempotencyKey } });
      toast.success("Plan created", { position: "bottom-left" });
      setPlanDialogOpen(false);
      setPlanForm({ title: "", targetAmount: "", targetDate: "", status: "planned", notes: "" });
      await fetchPlans();
    } catch (err: any) {
      handleApiError(err, "Create plan");
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const handleRefreshPlan = async (id: string) => {
    try {
      await api.post(`/expense-plans/${id}/refresh-allocation`);
      toast.success("Allocation refreshed", { position: "bottom-left" });
      await fetchPlans();
    } catch (err: any) {
      handleApiError(err, "Refresh allocation");
    }
  };

  const handleCreateRecurring = async () => {
    if (!recurringForm.title || !recurringForm.amount || !recurringForm.categoryId) {
      return toast.error("Title, amount and category required", { position: "bottom-left" });
    }
    setIsCreatingRecurring(true);
    const idempotencyKey = getIdempotencyKey();
    try {
      await api.post("/recurring-expenses", {
        ...recurringForm,
        amount: parseFloat(recurringForm.amount),
        billingDay: parseInt(recurringForm.billingDay),
      }, { headers: { "Idempotency-Key": idempotencyKey } });
      toast.success("Recurring expense created", { position: "bottom-left" });
      setRecurringDialogOpen(false);
      setRecurringForm({
        title: "",
        categoryId: "",
        amount: "",
        frequency: "monthly",
        billingDay: "1",
        isActive: true,
        notes: "",
      });
      await fetchRecurring();
    } catch (err: any) {
      handleApiError(err, "Create recurring");
    } finally {
      setIsCreatingRecurring(false);
    }
  };

  const handlePreviewRecurring = async (id: string) => {
    try {
      const res = await api.get(`/recurring-expenses/${id}/preview?months=6`);
      setPreviewDates(res.data.data.map((d: string) => new Date(d)));
      setPreviewDatesOpen(true);
    } catch (err) {
      handleApiError(err, "Preview recurring");
    }
  };

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const res = await api.get("/recurring-expenses/generate");
      toast.success(`Generated ${res.data.generatedCount} expenses`, { position: "bottom-left" });
      await fetchExpenses();
      await fetchRecurring();
    } catch (err) {
      handleApiError(err, "Generate recurring");
    } finally {
      setGenerating(false);
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({ title: "", amount: "", expenseDate: "", categoryId: "", referenceType: "general", notes: "" });
    setEditingItem(null);
  };

  const openExpenseDialog = (expense?: Expense) => {
    if (expense) {
      setEditingItem(expense);
      setExpenseForm({
        title: expense.title,
        amount: expense.amount.toString(),
        expenseDate: expense.expenseDate.slice(0, 10),
        categoryId: expense.categoryId,
        referenceType: expense.referenceType,
        notes: expense.notes || "",
      });
    } else {
      resetExpenseForm();
      setExpenseForm(prev => ({ ...prev, expenseDate: format(new Date(), "yyyy-MM-dd") }));
    }
    setExpenseDialogOpen(true);
  };

  const applyDatePreset = (preset: string) => {
    const today = new Date();
    let start = "", end = "";
    switch (preset) {
      case "today": start = end = format(today, "yyyy-MM-dd"); break;
      case "week": start = format(startOfWeek(today), "yyyy-MM-dd"); end = format(endOfWeek(today), "yyyy-MM-dd"); break;
      case "month": start = format(startOfMonth(today), "yyyy-MM-dd"); end = format(endOfMonth(today), "yyyy-MM-dd"); break;
    }
    setExpenseFilter({ ...expenseFilter, startDate: start, endDate: end });
    setDateRangePreset(preset);
  };

  // ==================== RENDER ====================
  if (loading && !expenses.length && !expenseCategories.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-rose-600 via-amber-600 to-orange-600 dark:from-rose-400 dark:via-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
                Expense Management
              </h1>
              <p className="text-sm text-muted-foreground mt-1"><Sparkles className="h-3 w-3 inline text-amber-500" /> Smart tracking, plans, and automation</p>
            </div>
            <div className="flex gap-2">
              {activeTab === "expenses" && (
                <Button onClick={() => openExpenseDialog()} className="bg-gradient-to-r from-rose-600 to-orange-600 text-white"><Plus className="mr-2 h-4 w-4" /> Add Expense</Button>
              )}
              {activeTab === "categories" && (
                <Button onClick={() => setCategoryDialogOpen(true)} variant="outline"><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
              )}
              {activeTab === "plans" && (
                <Button onClick={() => setPlanDialogOpen(true)} variant="outline"><Target className="mr-2 h-4 w-4" /> Create Plan</Button>
              )}
              {activeTab === "recurring" && (
                <>
                  <Button onClick={handleGenerateNow} disabled={generating} variant="outline">
                    {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Generate Now
                  </Button>
                  <Button onClick={() => setRecurringDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Recurring</Button>
                </>
              )}
            </div>
          </motion.div>

          {/* Stats */}
          {activeTab === "expenses" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 md:grid-cols-4">
              <Card className="border-l-4 border-l-rose-500 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle></CardHeader>
                <CardContent><div className="flex items-center justify-between"><p className="text-3xl font-bold">{stats.totalExpenses.toFixed(2)} {CURRENCY}</p><Receipt className="h-8 w-8 text-rose-500" /></div></CardContent>
              </Card>
              <Card className="border-l-4 border-l-amber-500 shadow-lg"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg. Recent (10)</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.recentTrend.toFixed(2)} {CURRENCY}</p></CardContent></Card>
              <Card className="border-l-4 border-l-emerald-500 shadow-lg"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Highest Expense</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.highestExpense.toFixed(2)} {CURRENCY}</p></CardContent></Card>
              <Card className="border-l-4 border-l-blue-500 shadow-lg"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Plans Active</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{expensePlans.filter(p => p.status === "active").length}</p></CardContent></Card>
            </motion.div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-1 rounded-full w-full justify-start overflow-x-auto">
              <TabsTrigger value="expenses" className="rounded-full">Expenses</TabsTrigger>
              <TabsTrigger value="categories" className="rounded-full">Categories</TabsTrigger>
              <TabsTrigger value="plans" className="rounded-full">Expense Plans</TabsTrigger>
              <TabsTrigger value="recurring" className="rounded-full">Recurring</TabsTrigger>
            </TabsList>

            {/* Expenses Tab */}
            <TabsContent value="expenses" className="space-y-4">
              <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-3 mb-4">
                    <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search expenses..." value={expenseFilter.search} onChange={e => setExpenseFilter({ ...expenseFilter, search: e.target.value })} className="pl-9" /></div>
                    <Select value={expenseFilter.categoryId || "all"} onValueChange={v => setExpenseFilter({ ...expenseFilter, categoryId: v === "all" ? "" : v })}>
                      <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">All Categories</SelectItem>{expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={expenseFilter.referenceType || "all"} onValueChange={v => setExpenseFilter({ ...expenseFilter, referenceType: v === "all" ? "" : v })}>
                      <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Types" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="general">General</SelectItem><SelectItem value="recurring">Recurring</SelectItem><SelectItem value="plan">Plan</SelectItem><SelectItem value="personal">Personal</SelectItem><SelectItem value="stock">Stock</SelectItem></SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Tooltip><TooltipTrigger asChild><Button variant={dateRangePreset === "today" ? "default" : "outline"} size="sm" onClick={() => applyDatePreset("today")}>Today</Button></TooltipTrigger><TooltipContent>Today</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><Button variant={dateRangePreset === "week" ? "default" : "outline"} size="sm" onClick={() => applyDatePreset("week")}>This Week</Button></TooltipTrigger><TooltipContent>This week</TooltipContent></Tooltip>
                      <Tooltip><TooltipTrigger asChild><Button variant={dateRangePreset === "month" ? "default" : "outline"} size="sm" onClick={() => applyDatePreset("month")}>This Month</Button></TooltipTrigger><TooltipContent>This month</TooltipContent></Tooltip>
                    </div>
                    <Button variant="outline" onClick={() => setExpenseFilter({ search: "", categoryId: "", referenceType: "", startDate: "", endDate: "" })}>Reset</Button>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                      <TableBody>
                        <AnimatePresence>
                          {expenses.map(exp => (
                            <motion.tr key={exp.id} initial={{ opacity: 1 }} exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.2 }} className="group">
                              <TableCell className="font-medium">{exp.title}</TableCell>
                              <TableCell><Badge variant="secondary">{exp.category?.name || "—"}</Badge></TableCell>
                              <TableCell className="font-mono font-semibold">{exp.amount.toFixed(2)} {CURRENCY}</TableCell>
                              <TableCell>{format(new Date(exp.expenseDate), "PP")}</TableCell>
                              <TableCell><Badge variant="outline" className="capitalize">{exp.referenceType}</Badge></TableCell>
                              <TableCell><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => openExpenseDialog(exp)}><Edit3 className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => confirmDelete("expense", exp.id, exp.title, exp, async () => { await api.delete(`/expenses/${exp.id}`); toast.success("Expense deleted", { position: "bottom-left" }); })}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                              </div></TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                        {expenses.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No expenses found.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-sm text-muted-foreground">Total: {expensePagination.total} items</p>
                    <div className="flex gap-2">
                      <Button disabled={expensePagination.page === 1} onClick={() => setExpensePagination(p => ({ ...p, page: p.page - 1 }))}>Previous</Button>
                      <Button disabled={expensePagination.page * expensePagination.limit >= expensePagination.total} onClick={() => setExpensePagination(p => ({ ...p, page: p.page + 1 }))}>Next</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-4">
              <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <AnimatePresence>
                      {expenseCategories.map(cat => (
                        <motion.div key={cat.id} initial={{ opacity: 1 }} exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.2 }} className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                          <span className="font-medium flex-1">{cat.name}</span>
                          <Button variant="ghost" size="icon" onClick={() => confirmDelete("category", cat.id, cat.name, cat, async () => { await api.delete(`/expense-categories/${cat.id}`); toast.success("Category deleted", { position: "bottom-left" }); })}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {expenseCategories.length === 0 && <p className="text-center text-muted-foreground py-8">No categories yet.</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Plans Tab */}
            <TabsContent value="plans" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {expensePlans.map(plan => {
                    const progress = (plan.currentAllocatedAmount / plan.targetAmount) * 100;
                    return (
                      <motion.div key={plan.id} initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}>
                        <Card className="overflow-hidden hover:shadow-xl transition-all">
                          <CardHeader className="pb-2">
                            <CardTitle className="flex justify-between items-center"><span>{plan.title}</span><Badge variant={plan.status === "active" ? "default" : plan.status === "completed" ? "outline" : "secondary"}>{plan.status}</Badge></CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm"><span>Allocated:</span><span className="font-mono">{plan.currentAllocatedAmount.toFixed(2)} {CURRENCY}</span></div>
                            <div className="flex justify-between text-sm"><span>Target:</span><span className="font-mono">{plan.targetAmount.toFixed(2)} {CURRENCY}</span></div>
                            <Progress value={progress} className="h-2" /><p className="text-xs text-muted-foreground">{progress.toFixed(0)}% achieved</p>
                            {plan.targetDate && <p className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Target: {format(new Date(plan.targetDate), "PPP")}</p>}
                            <div className="flex gap-2 pt-2">
                              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleRefreshPlan(plan.id)}><RefreshCw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Refresh allocation</TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => confirmDelete("plan", plan.id, plan.title, plan, async () => { await api.delete(`/expense-plans/${plan.id}`); toast.success("Plan deleted", { position: "bottom-left" }); })}><Trash2 className="h-4 w-4 text-rose-500" /></Button></TooltipTrigger><TooltipContent>Delete plan</TooltipContent></Tooltip>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {expensePlans.length === 0 && <p className="text-center text-muted-foreground py-8 col-span-full">No plans created yet.</p>}
              </div>
            </TabsContent>

            {/* Recurring Tab */}
            <TabsContent value="recurring" className="space-y-4">
              <Card className="border-0 shadow-xl">
                <CardContent className="p-4">
                  <Table>
                    <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Amount</TableHead><TableHead>Frequency</TableHead><TableHead>Billing Day</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {recurringExpenses.map(re => (
                          <motion.tr key={re.id} initial={{ opacity: 1 }} exit={{ opacity: 0, x: -100 }} transition={{ duration: 0.2 }}>
                            <TableCell>{re.title}</TableCell><TableCell>{re.category?.name || "—"}</TableCell>
                            <TableCell className="font-mono">{re.amount.toFixed(2)} {CURRENCY}</TableCell>
                            <TableCell className="capitalize">{re.frequency}</TableCell><TableCell>{re.billingDay}</TableCell>
                            <TableCell><Badge variant={re.isActive ? "default" : "secondary"}>{re.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                            <TableCell className="flex gap-1">
                              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handlePreviewRecurring(re.id)}><Calendar className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Preview</TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => confirmDelete("recurring", re.id, re.title, re, async () => { await api.delete(`/recurring-expenses/${re.id}`); toast.success("Recurring expense deleted", { position: "bottom-left" }); })}><Trash2 className="h-4 w-4 text-rose-500" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                      {recurringExpenses.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8">No recurring expenses.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ─── DIALOGS ─── */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingItem ? "Edit Expense" : "New Expense"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={expenseForm.title} onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })} /></div>
            <div><Label>Amount ({CURRENCY})</Label>
              <Input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
              <div className="flex gap-2 mt-1">{QUICK_AMOUNTS.map(amt => <Button key={amt} variant="outline" size="sm" onClick={() => setExpenseForm({ ...expenseForm, amount: amt.toString() })}>{amt}</Button>)}</div>
            </div>
            <div><Label>Date</Label><Input type="date" value={expenseForm.expenseDate} onChange={e => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} /></div>
            <div><Label>Category</Label>
              <div className="flex gap-2">
                <Select value={expenseForm.categoryId} onValueChange={v => setExpenseForm({ ...expenseForm, categoryId: v })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {expenseCategories.length === 0 && <SelectItem value="no-cat" disabled>No categories available, create one first</SelectItem>}
                    {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => setShowQuickCategoryDialog(true)}><FolderPlus className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Create new category</TooltipContent></Tooltip>
              </div>
            </div>
            <div><Label>Reference Type</Label>
              <Select value={expenseForm.referenceType} onValueChange={v => setExpenseForm({ ...expenseForm, referenceType: v as ExpenseReferenceType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="plan">Plan</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Textarea value={expenseForm.notes} onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>Cancel</Button>
            <Button onClick={editingItem ? handleUpdateExpense : handleCreateExpense} disabled={isCreatingExpense || isUpdatingExpense}>
              {(isCreatingExpense || isUpdatingExpense) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem ? (isUpdatingExpense ? "Updating..." : "Update") : (isCreatingExpense ? "Creating..." : "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showQuickCategoryDialog} onOpenChange={setShowQuickCategoryDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Category</DialogTitle><DialogDescription>Add a category for your expense</DialogDescription></DialogHeader>
          <div className="space-y-3"><div><Label>Name</Label><Input value={quickCategoryName} onChange={e => setQuickCategoryName(e.target.value)} autoFocus /></div></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickCategoryDialog(false)}>Cancel</Button>
            <Button onClick={handleQuickCreateCategory} disabled={isQuickCreatingCategory}>
              {isQuickCreatingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showQuickPlanDialog} onOpenChange={setShowQuickPlanDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Plan</DialogTitle></DialogHeader>
          <div className="space-y-3"><div><Label>Plan Title</Label><Input value={quickPlanTitle} onChange={e => setQuickPlanTitle(e.target.value)} /></div><div><Label>Target Amount ({CURRENCY})</Label><Input type="number" step="0.01" value={quickPlanTarget} onChange={e => setQuickPlanTarget(e.target.value)} /></div></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickPlanDialog(false)}>Cancel</Button>
            <Button onClick={handleQuickCreatePlan} disabled={isQuickCreatingPlan}>
              {isQuickCreatingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <div className="space-y-3"><div><Label>Name</Label><Input value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} /></div><div><Label>Description</Label><Textarea value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} /></div></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCategory} disabled={isCreatingCategory}>
              {isCreatingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Create Expense Plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={planForm.title} onChange={e => setPlanForm({ ...planForm, title: e.target.value })} /></div>
            <div><Label>Target Amount ({CURRENCY})</Label><Input type="number" step="0.01" value={planForm.targetAmount} onChange={e => setPlanForm({ ...planForm, targetAmount: e.target.value })} /></div>
            <div><Label>Target Date (optional)</Label><Input type="date" value={planForm.targetDate} onChange={e => setPlanForm({ ...planForm, targetDate: e.target.value })} /></div>
            <div><Label>Status</Label><Select value={planForm.status} onValueChange={v => setPlanForm({ ...planForm, status: v as ExpensePlanStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="planned">Planned</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
            <div><Label>Notes</Label><Textarea value={planForm.notes} onChange={e => setPlanForm({ ...planForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePlan} disabled={isCreatingPlan}>
              {isCreatingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={recurringDialogOpen} onOpenChange={setRecurringDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add Recurring Expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={recurringForm.title} onChange={e => setRecurringForm({ ...recurringForm, title: e.target.value })} /></div>
            <div><Label>Category</Label><Select value={recurringForm.categoryId} onValueChange={v => setRecurringForm({ ...recurringForm, categoryId: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Amount ({CURRENCY})</Label><Input type="number" step="0.01" value={recurringForm.amount} onChange={e => setRecurringForm({ ...recurringForm, amount: e.target.value })} /></div>
            <div><Label>Frequency</Label><Select value={recurringForm.frequency} onValueChange={v => setRecurringForm({ ...recurringForm, frequency: v as RecurringFrequency })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent></Select></div>
            <div><Label>Billing Day (1-31)</Label><Input type="number" min={1} max={31} value={recurringForm.billingDay} onChange={e => setRecurringForm({ ...recurringForm, billingDay: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={recurringForm.notes} onChange={e => setRecurringForm({ ...recurringForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecurringDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRecurring} disabled={isCreatingRecurring}>
              {isCreatingRecurring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDatesOpen} onOpenChange={setPreviewDatesOpen}>
        <DialogContent><DialogHeader><DialogTitle>Upcoming Dates (6 months)</DialogTitle></DialogHeader><div className="max-h-96 overflow-y-auto"><ul>{previewDates.map((d, i) => <li key={i} className="py-1 border-b">{format(d, "PPP")}</li>)}</ul></div></DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{deleteConfirm?.title}"? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setDeleteConfirm(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteConfirm) { optimisticDelete(deleteConfirm.type, deleteConfirm.id, deleteConfirm.title, deleteConfirm.optimisticData, deleteConfirm.deleteFn); setDeleteConfirm(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force Delete Dialog */}
      <AlertDialog open={forceDeleteDialog !== null} onOpenChange={(open) => !open && setForceDeleteDialog(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Force Delete Category</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Category "{forceDeleteDialog?.title}" has subcategories or linked expenses.</div>
                <div><strong>Force delete</strong> will:</div>
                <div className="pl-4">
                  <ul className="list-disc space-y-1">
                    <li>Delete this category and all its subcategories</li>
                    <li>Optionally reassign all linked expenses to another category</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-3">
            <Label className="text-sm font-medium">Reassign expenses to (optional)</Label>
            <Select value={forceReassignTo} onValueChange={setForceReassignTo}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Delete expenses (no reassign)" /></SelectTrigger>
              <SelectContent><SelectItem value="none">Delete expenses (no reassign)</SelectItem>{expenseCategories.filter(c => c.id !== forceDeleteDialog?.id).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">{forceReassignTo === "none" ? "All expenses in this category will be permanently deleted." : "All expenses will be moved to the selected category."}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setForceDeleteDialog(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceDelete} disabled={forceLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{forceLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Force Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}