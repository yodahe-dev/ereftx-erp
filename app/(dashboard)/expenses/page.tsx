"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { motion } from "framer-motion";
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
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
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
  const [quickCategoryParentId, setQuickCategoryParentId] = useState("none");
  const [showQuickCategoryDialog, setShowQuickCategoryDialog] = useState(false);
  const [quickPlanTitle, setQuickPlanTitle] = useState("");
  const [quickPlanTarget, setQuickPlanTarget] = useState("");
  const [showQuickPlanDialog, setShowQuickPlanDialog] = useState(false);
  const [dateRangePreset, setDateRangePreset] = useState("all");

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    expenseDate: "",
    categoryId: "",
    referenceType: "general" as ExpenseReferenceType,
    notes: "",
  });
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", parentId: "none" });
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

  // ---------- Quick date presets ----------
  const applyDatePreset = (preset: string) => {
    const today = new Date();
    let start = "";
    let end = "";
    switch (preset) {
      case "today":
        start = format(today, "yyyy-MM-dd");
        end = format(today, "yyyy-MM-dd");
        break;
      case "week":
        start = format(startOfWeek(today), "yyyy-MM-dd");
        end = format(endOfWeek(today), "yyyy-MM-dd");
        break;
      case "month":
        start = format(startOfMonth(today), "yyyy-MM-dd");
        end = format(endOfMonth(today), "yyyy-MM-dd");
        break;
      default:
        start = "";
        end = "";
    }
    setExpenseFilter({ ...expenseFilter, startDate: start, endDate: end });
    setDateRangePreset(preset);
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
      toast.error("Failed to load expenses");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get("/expense-categories?flatList=true");
      setExpenseCategories(res.data.data || []);
    } catch (error) {
      toast.error("Failed to load categories");
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get("/expense-plans?limit=100");
      setExpensePlans(res.data.data || []);
    } catch (error) {
      toast.error("Failed to load plans");
    }
  };

  const fetchRecurring = async () => {
    try {
      const res = await api.get("/recurring-expenses?limit=100");
      setRecurringExpenses(res.data.data || []);
    } catch (error) {
      toast.error("Failed to load recurring expenses");
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

  // ---------- Inline Category Creation (fixed empty string) ----------
  const handleQuickCreateCategory = async () => {
    if (!quickCategoryName.trim()) return toast.error("Category name required");
    try {
      const res = await api.post("/expense-categories", {
        name: quickCategoryName,
        parentId: quickCategoryParentId === "none" ? null : quickCategoryParentId,
      });
      toast.success("Category created");
      setExpenseCategories(prev => [...prev, res.data.data]);
      setExpenseForm(prev => ({ ...prev, categoryId: res.data.data.id }));
      setQuickCategoryName("");
      setQuickCategoryParentId("none");
      setShowQuickCategoryDialog(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Creation failed");
    }
  };

  const handleQuickCreatePlan = async () => {
    if (!quickPlanTitle.trim() || !quickPlanTarget) return toast.error("Title and target amount required");
    try {
      const res = await api.post("/expense-plans", {
        title: quickPlanTitle,
        targetAmount: parseFloat(quickPlanTarget),
      });
      toast.success("Plan created");
      setExpensePlans(prev => [...prev, res.data.data]);
      setQuickPlanTitle("");
      setQuickPlanTarget("");
      setShowQuickPlanDialog(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Creation failed");
    }
  };

  // ---------- CRUD Handlers ----------
  const handleCreateExpense = async () => {
    if (!expenseForm.title || !expenseForm.amount || !expenseForm.categoryId) {
      toast.error("Title, amount and category are required");
      return;
    }
    try {
      await api.post("/expenses", {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        expenseDate: expenseForm.expenseDate || undefined,
      });
      toast.success("Expense created");
      setExpenseDialogOpen(false);
      resetExpenseForm();
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Creation failed");
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingItem) return;
    try {
      await api.put(`/expenses/${editingItem.id}`, {
        title: expenseForm.title,
        amount: parseFloat(expenseForm.amount),
        expenseDate: expenseForm.expenseDate,
        categoryId: expenseForm.categoryId,
        referenceType: expenseForm.referenceType,
        notes: expenseForm.notes,
      });
      toast.success("Expense updated");
      setExpenseDialogOpen(false);
      resetExpenseForm();
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await api.delete(`/expenses/${id}`);
      toast.success("Expense deleted");
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  // Category handlers
  const handleCreateCategory = async () => {
    if (!categoryForm.name) return toast.error("Name required");
    try {
      await api.post("/expense-categories", {
        name: categoryForm.name,
        description: categoryForm.description,
        parentId: categoryForm.parentId === "none" ? null : categoryForm.parentId,
      });
      toast.success("Category created");
      setCategoryDialogOpen(false);
      setCategoryForm({ name: "", description: "", parentId: "none" });
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await api.delete(`/expense-categories/${id}`);
      toast.success("Category deleted");
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message);
    }
  };

  // Plan handlers
  const handleCreatePlan = async () => {
    if (!planForm.title || !planForm.targetAmount) return toast.error("Title and target amount required");
    try {
      await api.post("/expense-plans", {
        ...planForm,
        targetAmount: parseFloat(planForm.targetAmount),
        targetDate: planForm.targetDate || undefined,
      });
      toast.success("Plan created");
      setPlanDialogOpen(false);
      setPlanForm({ title: "", targetAmount: "", targetDate: "", status: "planned", notes: "" });
      fetchPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.message);
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      await api.delete(`/expense-plans/${id}`);
      toast.success("Plan deleted");
      fetchPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.message);
    }
  };

  const handleRefreshPlan = async (id: string) => {
    try {
      await api.post(`/expense-plans/${id}/refresh-allocation`);
      toast.success("Allocation refreshed");
      fetchPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.message);
    }
  };

  // Recurring handlers
  const handleCreateRecurring = async () => {
    if (!recurringForm.title || !recurringForm.amount || !recurringForm.categoryId) {
      return toast.error("Title, amount and category required");
    }
    try {
      await api.post("/recurring-expenses", {
        ...recurringForm,
        amount: parseFloat(recurringForm.amount),
        billingDay: parseInt(recurringForm.billingDay),
      });
      toast.success("Recurring expense created");
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
      fetchRecurring();
    } catch (err: any) {
      toast.error(err.response?.data?.message);
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    try {
      await api.delete(`/recurring-expenses/${id}`);
      toast.success("Recurring expense deleted");
      fetchRecurring();
    } catch (err: any) {
      toast.error(err.response?.data?.message);
    }
  };

  const handlePreviewRecurring = async (id: string) => {
    try {
      const res = await api.get(`/recurring-expenses/${id}/preview?months=6`);
      setPreviewDates(res.data.data.map((d: string) => new Date(d)));
      setPreviewDatesOpen(true);
    } catch (err) {
      toast.error("Failed to preview");
    }
  };

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const res = await api.get("/recurring-expenses/generate");
      toast.success(`Generated ${res.data.generatedCount} expenses`);
      fetchExpenses();
      fetchRecurring();
    } catch (err) {
      toast.error("Generation failed");
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
      // Pre-fill today's date for new expense
      setExpenseForm(prev => ({ ...prev, expenseDate: format(new Date(), "yyyy-MM-dd") }));
    }
    setExpenseDialogOpen(true);
  };

  // ==================== RENDER ====================
  if (loading && !expenses.length && !expenseCategories.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
          </div>
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
              <p className="text-sm text-muted-foreground mt-1">
                <Sparkles className="h-3 w-3 inline text-amber-500" /> Smart tracking, plans, and automation
              </p>
            </div>
            <div className="flex gap-2">
              {activeTab === "expenses" && (
                <Button onClick={() => openExpenseDialog()} className="bg-gradient-to-r from-rose-600 to-orange-600 text-white">
                  <Plus className="mr-2 h-4 w-4" /> Add Expense
                </Button>
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
                    {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Generate Now
                  </Button>
                  <Button onClick={() => setRecurringDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Recurring</Button>
                </>
              )}
            </div>
          </motion.div>

          {/* Stats Cards */}
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

            {/* ---------- EXPENSES TAB ---------- */}
            <TabsContent value="expenses" className="space-y-4">
              <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-3 mb-4">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search expenses..." value={expenseFilter.search} onChange={e => setExpenseFilter({ ...expenseFilter, search: e.target.value })} className="pl-9" />
                    </div>
                    <Select value={expenseFilter.categoryId || "all"} onValueChange={v => setExpenseFilter({ ...expenseFilter, categoryId: v === "all" ? "" : v })}>
                      <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={expenseFilter.referenceType || "all"} onValueChange={v => setExpenseFilter({ ...expenseFilter, referenceType: v === "all" ? "" : v })}>
                      <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Types" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="recurring">Recurring</SelectItem>
                        <SelectItem value="plan">Plan</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="stock">Stock</SelectItem>
                      </SelectContent>
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
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map(exp => (
                          <TableRow key={exp.id} className="group">
                            <TableCell className="font-medium">{exp.title}</TableCell>
                            <TableCell><Badge variant="secondary">{exp.category?.name || "—"}</Badge></TableCell>
                            <TableCell className="font-mono font-semibold">{exp.amount.toFixed(2)} {CURRENCY}</TableCell>
                            <TableCell>{format(new Date(exp.expenseDate), "PP")}</TableCell>
                            <TableCell><Badge variant="outline" className="capitalize">{exp.referenceType}</Badge></TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => openExpenseDialog(exp)}><Edit3 className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(exp.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
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

            {/* ---------- CATEGORIES TAB ---------- */}
            <TabsContent value="categories" className="space-y-4">
              <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {expenseCategories.filter(c => !c.parentId).map(cat => (
                      <CategoryTreeNode
                        key={cat.id}
                        category={cat}
                        allCategories={expenseCategories}
                        onDelete={handleDeleteCategory}
                        onRefresh={fetchCategories}
                      />
                    ))}
                    {expenseCategories.length === 0 && <p className="text-center text-muted-foreground py-8">No categories yet.</p>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---------- PLANS TAB ---------- */}
            <TabsContent value="plans" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {expensePlans.map(plan => {
                  const progress = (plan.currentAllocatedAmount / plan.targetAmount) * 100;
                  return (
                    <Card key={plan.id} className="overflow-hidden hover:shadow-xl transition-all">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex justify-between items-center">
                          <span>{plan.title}</span>
                          <Badge variant={plan.status === "active" ? "default" : plan.status === "completed" ? "outline" : "secondary"}>
                            {plan.status}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm"><span>Allocated:</span><span className="font-mono">{plan.currentAllocatedAmount.toFixed(2)} {CURRENCY}</span></div>
                        <div className="flex justify-between text-sm"><span>Target:</span><span className="font-mono">{plan.targetAmount.toFixed(2)} {CURRENCY}</span></div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">{progress.toFixed(0)}% achieved</p>
                        {plan.targetDate && <p className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Target: {format(new Date(plan.targetDate), "PPP")}</p>}
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/expenses/plan/${plan.id}`)}>View Expenses</Button>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleRefreshPlan(plan.id)}><RefreshCw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Refresh allocation</TooltipContent></Tooltip>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleDeletePlan(plan.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button></TooltipTrigger><TooltipContent>Delete plan</TooltipContent></Tooltip>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {expensePlans.length === 0 && <p className="text-center text-muted-foreground py-8 col-span-full">No plans created yet.</p>}
              </div>
            </TabsContent>

            {/* ---------- RECURRING TAB ---------- */}
            <TabsContent value="recurring" className="space-y-4">
              <Card className="border-0 shadow-xl">
                <CardContent className="p-4">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Amount</TableHead><TableHead>Frequency</TableHead><TableHead>Billing Day</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {recurringExpenses.map(re => (
                        <TableRow key={re.id}>
                          <TableCell>{re.title}</TableCell>
                          <TableCell>{re.category?.name || "—"}</TableCell>
                          <TableCell className="font-mono">{re.amount.toFixed(2)} {CURRENCY}</TableCell>
                          <TableCell className="capitalize">{re.frequency}</TableCell>
                          <TableCell>{re.billingDay}</TableCell>
                          <TableCell><Badge variant={re.isActive ? "default" : "secondary"}>{re.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                          <TableCell className="flex gap-1">
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handlePreviewRecurring(re.id)}><Calendar className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Preview</TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleDeleteRecurring(re.id)}><Trash2 className="h-4 w-4 text-rose-500" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                      {recurringExpenses.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8">No recurring expenses.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Expense Dialog with inline category/plan creation */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingItem ? "Edit Expense" : "New Expense"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={expenseForm.title} onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })} /></div>
            <div><Label>Amount ({CURRENCY})</Label>
              <Input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
              <div className="flex gap-2 mt-1">
                {QUICK_AMOUNTS.map(amt => (
                  <Button key={amt} variant="outline" size="sm" onClick={() => setExpenseForm({ ...expenseForm, amount: amt.toString() })}>{amt}</Button>
                ))}
              </div>
            </div>
            <div><Label>Date</Label><Input type="date" value={expenseForm.expenseDate} onChange={e => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} /></div>
            <div><Label>Category</Label>
              <div className="flex gap-2">
                <Select value={expenseForm.categoryId} onValueChange={v => setExpenseForm({ ...expenseForm, categoryId: v })}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
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
            <Button onClick={editingItem ? handleUpdateExpense : handleCreateExpense}>{editingItem ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Category Dialog - fixed empty string value */}
      <Dialog open={showQuickCategoryDialog} onOpenChange={setShowQuickCategoryDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Category</DialogTitle><DialogDescription>Add a category for your expense</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={quickCategoryName} onChange={e => setQuickCategoryName(e.target.value)} autoFocus /></div>
            <div><Label>Parent Category (optional)</Label>
              <Select value={quickCategoryParentId} onValueChange={setQuickCategoryParentId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowQuickCategoryDialog(false)}>Cancel</Button><Button onClick={handleQuickCreateCategory}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Plan Dialog */}
      <Dialog open={showQuickPlanDialog} onOpenChange={setShowQuickPlanDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Plan Title</Label><Input value={quickPlanTitle} onChange={e => setQuickPlanTitle(e.target.value)} /></div>
            <div><Label>Target Amount ({CURRENCY})</Label><Input type="number" step="0.01" value={quickPlanTarget} onChange={e => setQuickPlanTarget(e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowQuickPlanDialog(false)}>Cancel</Button><Button onClick={handleQuickCreatePlan}>Create Plan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog - fixed empty string */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} /></div>
            <div><Label>Parent Category</Label>
              <Select value={categoryForm.parentId} onValueChange={v => setCategoryForm({ ...categoryForm, parentId: v })}>
                <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button><Button onClick={handleCreateCategory}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Create Expense Plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={planForm.title} onChange={e => setPlanForm({ ...planForm, title: e.target.value })} /></div>
            <div><Label>Target Amount ({CURRENCY})</Label><Input type="number" step="0.01" value={planForm.targetAmount} onChange={e => setPlanForm({ ...planForm, targetAmount: e.target.value })} /></div>
            <div><Label>Target Date (optional)</Label><Input type="date" value={planForm.targetDate} onChange={e => setPlanForm({ ...planForm, targetDate: e.target.value })} /></div>
            <div><Label>Status</Label><Select value={planForm.status} onValueChange={v => setPlanForm({ ...planForm, status: v as ExpensePlanStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="planned">Planned</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></div>
            <div><Label>Notes</Label><Textarea value={planForm.notes} onChange={e => setPlanForm({ ...planForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Cancel</Button><Button onClick={handleCreatePlan}>Create Plan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurring Dialog */}
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
          <DialogFooter><Button variant="outline" onClick={() => setRecurringDialogOpen(false)}>Cancel</Button><Button onClick={handleCreateRecurring}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dates Dialog */}
      <Dialog open={previewDatesOpen} onOpenChange={setPreviewDatesOpen}>
        <DialogContent><DialogHeader><DialogTitle>Upcoming Dates (6 months)</DialogTitle></DialogHeader>
          <div className="max-h-96 overflow-y-auto"><ul>{previewDates.map((d, i) => <li key={i} className="py-1 border-b">{format(d, "PPP")}</li>)}</ul></div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

// Helper component for category tree
function CategoryTreeNode({ category, allCategories, onDelete, onRefresh }: { category: ExpenseCategory; allCategories: ExpenseCategory[]; onDelete: (id: string) => void; onRefresh: () => void }) {
  const children = allCategories.filter(c => c.parentId === category.id);
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="ml-4 border-l pl-2">
      <div className="flex items-center gap-2 py-1">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(!expanded)}><ChevronRight className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")} /></Button>
        <span className="font-medium">{category.name}</span>
        {children.length > 0 && <Badge variant="outline">{children.length} sub</Badge>}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(category.id)}><Trash2 className="h-3 w-3 text-rose-500" /></Button>
      </div>
      {expanded && children.map(child => <CategoryTreeNode key={child.id} category={child} allCategories={allCategories} onDelete={onDelete} onRefresh={onRefresh} />)}
    </div>
  );
}