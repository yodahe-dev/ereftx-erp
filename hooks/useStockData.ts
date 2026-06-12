"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

// ==================== TYPES ====================
export interface ProductPrice {
  id: string;
  productId: string;
  buyPricePerBox: number;
  sellPricePerBox: number;
  sellPricePerUnit: number;
  startAt: string;
  endAt: string | null;
  allowLoss: boolean;
}

export interface PriceLayer {
  priceId: string;
  buyPricePerBox: number;
  sellPricePerBox: number;
  sellPricePerUnit: number;
  boxQuantity: number;
  singleQuantity: number;
  totalUnits: number;
  remainingUnits: number;
  costPerUnit: number;
  profitPerUnit: number;
  potentialProfit: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  unitsPerBox: number;
  categoryId: string;
  brandId: string;
  packagingId: string;
  prices?: ProductPrice[];
  buyPricePerBox?: number;
  sellPricePerBox?: number;
  sellPricePerUnit?: number;
  allowLoss?: boolean;
  currentPriceId?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Brand {
  id: string;
  name: string;
}

export interface Packaging {
  id: string;
  name: string;
}

export interface Stock {
  id: string;
  productId: string;
  boxQuantity: number;
  singleQuantity: number;
  containerType: "box" | "single";
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

export interface StockHistoryRecord {
  id: string;
  productId: string;
  actionType: "initial" | "restock" | "adjust" | "exchange";
  boxQuantityBefore: number;
  singleQuantityBefore: number;
  boxQuantityAfter: number;
  singleQuantityAfter: number;
  boxQuantityChange: number;
  singleQuantityChange: number;
  notes: string | null;
  isFree: boolean;
  createdAt: string;
}

export interface PriceListFilters {
  productId?: string;
  active?: boolean;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

export interface PriceListResponse {
  data: ProductPrice[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export type AdjustmentMode = "add" | "subtract" | "set";
export type FilterType = "all" | "box" | "single";
export type RestockPriceOption = "keep" | "existing" | "new";

// ==================== CONSTANTS ====================
const STORAGE_FILTER_KEY = "stock-filter-preference";
const STORAGE_PINNED_FILTER_KEY = "stock-pinned-filter";
const PRODUCTS_PAGE_LIMIT = 1000;
const DEFAULT_UNITS_PER_BOX = 24;
export const CURRENCY = "ETB";
const LOW_STOCK_BOX_THRESHOLD = 2;
const UNDO_SECONDS = 10;
const DEFAULT_PAGE_SIZE = 10;

export function useStockData() {
  // ---------- core state ----------
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- search / filter ----------
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [isFilterPinned, setIsFilterPinned] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // ---------- pagination ----------
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // ---------- dialogs & forms ----------
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    boxQuantity: "",
    singleQuantity: "",
    containerType: "box" as "box" | "single",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [restockStock, setRestockStock] = useState<Stock | null>(null);
  const [restockBoxes, setRestockBoxes] = useState(0);
  const [restockSingles, setRestockSingles] = useState(0);
  const [restockNotes, setRestockNotes] = useState("");
  const [restockPriceOption, setRestockPriceOption] = useState<RestockPriceOption>("keep");
  const [restockExistingPriceId, setRestockExistingPriceId] = useState("");
  const [restockNewBuyPrice, setRestockNewBuyPrice] = useState("");
  const [restockNewSellPriceBox, setRestockNewSellPriceBox] = useState("");
  const [restockNewSellPriceUnit, setRestockNewSellPriceUnit] = useState("");
  const [restockIsFree, setRestockIsFree] = useState(false);
  const [availablePrices, setAvailablePrices] = useState<ProductPrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustStock, setAdjustStock] = useState<Stock | null>(null);
  const [adjustMode, setAdjustMode] = useState<AdjustmentMode>("set");
  const [adjustBoxes, setAdjustBoxes] = useState(0);
  const [adjustSingles, setAdjustSingles] = useState(0);
  const [adjustExactBoxes, setAdjustExactBoxes] = useState(0);
  const [adjustExactSingles, setAdjustExactSingles] = useState(0);

  const [exchangeDialogOpen, setExchangeDialogOpen] = useState(false);
  const [exchangeForm, setExchangeForm] = useState({
    sourceProductId: "",
    targetProductId: "",
    exchangeType: "box" as "box" | "single",
    sourceQuantity: 1,
    notes: "",
  });
  const [exchangeLoading, setExchangeLoading] = useState(false);

  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [activeEntityTab, setActiveEntityTab] = useState<"products" | "prices" | "category" | "brand" | "packaging">("products");
  const [entitySearch, setEntitySearch] = useState("");
  const [priceListFilters, setPriceListFilters] = useState<PriceListFilters>({
    page: 1,
    limit: 10,
    sortBy: "startAt",
    sortOrder: "DESC",
  });
  const [priceListData, setPriceListData] = useState<PriceListResponse>({
    data: [],
    total: 0,
    page: 1,
    totalPages: 0,
    limit: 10,
  });
  const [priceListLoading, setPriceListLoading] = useState(false);
  const [activatingPriceId, setActivatingPriceId] = useState<string | null>(null);

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    brandId: "",
    packagingId: "",
    unitsPerBox: DEFAULT_UNITS_PER_BOX,
    buyPricePerBox: "",
    sellPricePerBox: "",
    sellPricePerUnit: "",
    allowLoss: false,
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [priceHistoryDialogOpen, setPriceHistoryDialogOpen] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);

  const [stockHistoryDialogOpen, setStockHistoryDialogOpen] = useState(false);
  const [selectedStockForHistory, setSelectedStockForHistory] = useState<Stock | null>(null);
  const [stockHistoryRecords, setStockHistoryRecords] = useState<StockHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [entityForm, setEntityForm] = useState({ name: "", type: "" });
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [priceLayers, setPriceLayers] = useState<Record<string, PriceLayer[]>>({});

  const [stats, setStats] = useState({
    totalProducts: 0,
    totalBoxes: 0,
    totalSingles: 0,
    lowStockItems: 0,
    totalProfitPotential: 0,
    totalInventoryValue: 0,
  });

  // ---------- delete with undo ----------
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [deleteStock, setDeleteStock] = useState<Stock | null>(null);
  const [deletedStockBackup, setDeletedStockBackup] = useState<Stock | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== HELPERS ====================
  const getCategoryName = (id: string): string => categories.find((c) => c.id === id)?.name ?? "—";
  const getBrandName = (id: string): string => brands.find((b) => b.id === id)?.name ?? "—";
  const getPackagingName = (id: string): string => packagings.find((p) => p.id === id)?.name ?? "—";

  // ==================== FETCH ALL PRODUCTS (paginated) ====================
  const fetchAllProducts = async (): Promise<Product[]> => {
    try {
      let allProducts: Product[] = [];
      let current = 1;
      let hasMore = true;
      while (hasMore) {
        const response = await api.get<{ data: Product[]; hasMore: boolean }>(
          `/products?page=${current}&limit=${PRODUCTS_PAGE_LIMIT}`
        );
        const { data, hasMore: more } = response.data;
        const productsWithPrice = data.map((product) => {
          const latestPrice = product.prices?.[0];
          return {
            ...product,
            buyPricePerBox: latestPrice ? Number(latestPrice.buyPricePerBox) : 0,
            sellPricePerBox: latestPrice ? Number(latestPrice.sellPricePerBox) : 0,
            sellPricePerUnit: latestPrice ? Number(latestPrice.sellPricePerUnit) : 0,
            allowLoss: latestPrice?.allowLoss ?? false,
            currentPriceId: latestPrice?.id,
          };
        });
        allProducts = [...allProducts, ...productsWithPrice];
        hasMore = more;
        current++;
      }
      return allProducts;
    } catch (error) {
      console.error("Failed to fetch products:", error);
      return [];
    }
  };

  // ==================== FETCH ALL DATA ====================
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [stocksRes, productsData, catRes, brandRes, pkgRes] = await Promise.all([
        api.get<Stock[]>("/stocks"),
        fetchAllProducts(),
        api.get("/categories"),
        api.get("/brands"),
        api.get("/packagings"),
      ]);

      const catsArray = catRes.data?.data ?? catRes.data;
      const brandsArray = brandRes.data?.data ?? brandRes.data;
      const pkgsArray = pkgRes.data?.data ?? pkgRes.data;

      const stocksWithProducts = stocksRes.data.map((stock) => ({
        ...stock,
        product: productsData.find((prod) => prod.id === stock.productId),
      }));

      setStocks(stocksWithProducts);
      setProducts(productsData);
      setCategories(Array.isArray(catsArray) ? catsArray : []);
      setBrands(Array.isArray(brandsArray) ? brandsArray : []);
      setPackagings(Array.isArray(pkgsArray) ? pkgsArray : []);

      // compute stats
      const totalBoxes = stocksWithProducts.reduce((sum, s) => sum + s.boxQuantity, 0);
      const totalSingles = stocksWithProducts.reduce((sum, s) => sum + s.singleQuantity, 0);
      const lowStockItems = stocksWithProducts.filter(
        (s) => s.boxQuantity === 0 && s.singleQuantity === 0
      ).length;
      let totalProfit = 0;
      let totalValue = 0;
      stocksWithProducts.forEach((stock) => {
        const p = stock.product;
        if (p && p.buyPricePerBox) {
          const totalUnits = stock.boxQuantity * p.unitsPerBox + stock.singleQuantity;
          const costPerUnit = p.buyPricePerBox / p.unitsPerBox;
          totalValue += totalUnits * costPerUnit;
          if (p.sellPricePerUnit) {
            const profitPerUnit = p.sellPricePerUnit - costPerUnit;
            totalProfit += totalUnits * profitPerUnit;
          }
        }
      });
      setStats({
        totalProducts: productsData.length,
        totalBoxes,
        totalSingles,
        lowStockItems,
        totalProfitPotential: totalProfit,
        totalInventoryValue: totalValue,
      });
    } catch (e: any) {
      const message = e?.response?.data?.message || "Failed to load data";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ==================== PRICE LIST FUNCTIONS ====================
  const fetchPriceList = useCallback(async () => {
    try {
      setPriceListLoading(true);
      const params: Record<string, any> = {
        page: priceListFilters.page,
        limit: priceListFilters.limit,
        sortBy: priceListFilters.sortBy,
        sortOrder: priceListFilters.sortOrder,
      };
      if (priceListFilters.productId) params.productId = priceListFilters.productId;
      if (priceListFilters.active !== undefined) params.active = priceListFilters.active;
      const response = await api.get<PriceListResponse>("/stocks/prices", { params });
      // ensure numeric conversion
      const dataWithNumbers = response.data.data.map((p) => ({
        ...p,
        buyPricePerBox: Number(p.buyPricePerBox),
        sellPricePerBox: Number(p.sellPricePerBox),
        sellPricePerUnit: Number(p.sellPricePerUnit),
      }));
      setPriceListData({ ...response.data, data: dataWithNumbers });
    } catch (error) {
      toast.error("Failed to load price list");
    } finally {
      setPriceListLoading(false);
    }
  }, [priceListFilters]);

  const handleActivatePrice = async (priceId: string, productId: string) => {
    try {
      setActivatingPriceId(priceId);
      await api.patch(`/stocks/prices/${priceId}/activate`, { productId });
      toast.success("Price activated successfully");
      await fetchPriceList();
      await fetchAll();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Activation failed");
    } finally {
      setActivatingPriceId(null);
    }
  };

  const fetchPricesForProduct = async (productId: string) => {
    try {
      setLoadingPrices(true);
      const response = await api.get<PriceListResponse>("/stocks/prices", {
        params: { productId, limit: 50, active: undefined },
      });
      // ensure numeric conversion
      const dataWithNumbers = response.data.data.map((p) => ({
        ...p,
        buyPricePerBox: Number(p.buyPricePerBox),
        sellPricePerBox: Number(p.sellPricePerBox),
        sellPricePerUnit: Number(p.sellPricePerUnit),
      }));
      setAvailablePrices(dataWithNumbers);
    } catch (error) {
      toast.error("Failed to load price history");
    } finally {
      setLoadingPrices(false);
    }
  };

  // ==================== PRICE LAYERS ====================
  const fetchPriceLayers = async (stockId: string) => {
    try {
      const response = await api.get<PriceLayer[]>(`/stocks/${stockId}/price-layers`);
      setPriceLayers((prev) => ({ ...prev, [stockId]: response.data }));
    } catch (error) {
      console.error("Failed to load price layers", error);
    }
  };

  // ==================== STOCK CRUD ====================
  const resetStockForm = () => {
    setForm({
      productId: "",
      boxQuantity: "",
      singleQuantity: "",
      containerType: "box",
    });
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
    const unitsPerBox = product?.unitsPerBox || 1;
    if (field === "boxQuantity") {
      setForm((prev) => ({
        ...prev,
        boxQuantity: value,
        singleQuantity: prev.containerType === "box" ? String(num * unitsPerBox) : prev.singleQuantity,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        singleQuantity: value,
        boxQuantity: prev.containerType === "single" ? String(Math.floor(num / unitsPerBox)) : prev.boxQuantity,
      }));
    }
  };

  const handleStockContainerTypeChange = (type: "box" | "single") => {
    const product = products.find((p) => p.id === form.productId);
    const unitsPerBox = product?.unitsPerBox || 1;
    const boxNum = Number(form.boxQuantity) || 0;
    const singleNum = Number(form.singleQuantity) || 0;
    if (type === "box") {
      setForm((prev) => ({
        ...prev,
        containerType: type,
        singleQuantity: String(boxNum * unitsPerBox),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        containerType: type,
        boxQuantity: String(Math.floor(singleNum / unitsPerBox)),
      }));
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

    let payload: any = {
      productId: form.productId,
      containerType: form.containerType,
    };

    if (form.containerType === "box") {
      payload.boxQuantity = Number(form.boxQuantity) || 0;
      payload.singleQuantity = 0;
    } else {
      payload.singleQuantity = Number(form.singleQuantity) || 0;
      payload.boxQuantity = 0;
    }

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

  // ==================== DELETE WITH UNDO ====================
  const confirmDelete = (stock: Stock) => {
    setDeleteStock(stock);
    setDeleteAlertOpen(true);
  };

  const performDelete = async () => {
    if (!deleteStock) return;
    const backup = { ...deleteStock };
    setDeletedStockBackup(backup);
    setStocks((prev) => prev.filter((s) => s.id !== deleteStock.id));
    setStats((prev) => ({
      ...prev,
      totalBoxes: prev.totalBoxes - deleteStock.boxQuantity,
      totalSingles: prev.totalSingles - deleteStock.singleQuantity,
      lowStockItems:
        prev.lowStockItems - (deleteStock.boxQuantity === 0 && deleteStock.singleQuantity === 0 ? 1 : 0),
    }));
    setDeleteAlertOpen(false);
    setDeleteStock(null);

    toast("Stock entry deleted", {
      description: `You have ${UNDO_SECONDS} seconds to undo this action.`,
      duration: UNDO_SECONDS * 1000,
      position: "bottom-left",
      action: {
        label: "Undo",
        onClick: async () => {
          if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
          if (deletedStockBackup) {
            try {
              await api.post("/stocks", {
                productId: deletedStockBackup.productId,
                boxQuantity: deletedStockBackup.boxQuantity,
                singleQuantity: deletedStockBackup.singleQuantity,
                containerType: deletedStockBackup.containerType,
              });
              toast.success("Stock restored");
              await fetchAll();
            } catch (e) {
              toast.error("Failed to restore stock");
            }
            setDeletedStockBackup(null);
          }
        },
      },
    });

    undoTimeoutRef.current = setTimeout(async () => {
      try {
        await api.delete(`/stocks/${deleteStock.id}`);
      } catch (e) {
        // ignore
      } finally {
        if (undoTimeoutRef.current) undoTimeoutRef.current = null;
      }
    }, UNDO_SECONDS * 1000);
  };

  // ==================== RESTOCK ====================
  const openRestockDialog = async (stock: Stock) => {
    setRestockStock(stock);
    setRestockBoxes(0);
    setRestockSingles(0);
    setRestockNotes("");
    setRestockPriceOption("keep");
    setRestockExistingPriceId("");
    setRestockNewBuyPrice("");
    setRestockNewSellPriceBox("");
    setRestockNewSellPriceUnit("");
    setRestockIsFree(false);
    await fetchPricesForProduct(stock.productId);
    setRestockDialogOpen(true);
  };

  const getProfitImpact = () => {
    if (!restockStock?.product) return null;
    const product = restockStock.product;
    const oldBuyPrice = product.buyPricePerBox || 0;
    let effectiveNewPrice: number | null = null;
    if (restockPriceOption === "new" && restockNewBuyPrice) {
      effectiveNewPrice = Number(restockNewBuyPrice);
    } else if (restockPriceOption === "existing" && restockExistingPriceId) {
      const selected = availablePrices.find((p) => p.id === restockExistingPriceId);
      effectiveNewPrice = selected?.buyPricePerBox ?? null;
    }
    if (effectiveNewPrice === null) return null;
    const addedUnits = restockBoxes * product.unitsPerBox + restockSingles;
    const costDifference = (effectiveNewPrice - oldBuyPrice) / product.unitsPerBox * addedUnits;
    return {
      oldCostPerUnit: oldBuyPrice / product.unitsPerBox,
      newCostPerUnit: effectiveNewPrice / product.unitsPerBox,
      addedUnits,
      costDifference,
      isHigher: effectiveNewPrice > oldBuyPrice,
    };
  };

  const handleRestock = async () => {
    if (!restockStock) return;
    if (restockBoxes === 0 && restockSingles === 0) {
      toast.error("Please add at least one box or single");
      return;
    }
    try {
      setLoading(true);
      const payload: any = {
        addBoxes: restockBoxes,
        addSingles: restockSingles,
        notes: restockNotes || "Manual restock",
        isFree: restockIsFree,
      };
      if (restockPriceOption === "existing" && restockExistingPriceId) {
        payload.priceId = restockExistingPriceId;
      } else if (restockPriceOption === "new") {
        if (!restockNewBuyPrice) {
          toast.error("Please enter a new buy price");
          setLoading(false);
          return;
        }
        payload.newBuyPricePerBox = Number(restockNewBuyPrice);
        if (restockNewSellPriceBox) payload.newSellPricePerBox = Number(restockNewSellPriceBox);
        if (restockNewSellPriceUnit) payload.newSellPricePerUnit = Number(restockNewSellPriceUnit);
      }
      await api.post(`/stocks/${restockStock.id}/restock`, payload);
      toast.success(`Restocked ${restockBoxes} boxes and ${restockSingles} singles`);
      setRestockDialogOpen(false);
      await fetchAll();
      // refresh price layers for this stock if expanded
      if (expandedRows.has(restockStock.id)) {
        await fetchPriceLayers(restockStock.id);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Restock failed");
    } finally {
      setLoading(false);
    }
  };

  // ==================== ADJUSTMENT ====================
  const openAdjustDialog = (stock: Stock) => {
    setAdjustStock(stock);
    setAdjustMode("set");
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
    const unitsPerBox = product?.unitsPerBox || 1;
    const extraBoxes = Math.floor(newSingles / unitsPerBox);
    newBoxes += extraBoxes;
    newSingles = newSingles % unitsPerBox;

    try {
      setLoading(true);
      await api.put(`/stocks/${adjustStock.id}`, {
        boxQuantity: newBoxes,
        singleQuantity: newSingles,
      });
      toast.success("Stock adjusted successfully");
      setAdjustDialogOpen(false);
      await fetchAll();
      if (expandedRows.has(adjustStock.id)) {
        await fetchPriceLayers(adjustStock.id);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Adjustment failed");
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
      description: "",
      categoryId: "",
      brandId: "",
      packagingId: "",
      unitsPerBox: DEFAULT_UNITS_PER_BOX,
      buyPricePerBox: "",
      sellPricePerBox: "",
      sellPricePerUnit: "",
      allowLoss: false,
    });
    setEditingProductId(null);
  };

  const openProductForm = (product?: Product) => {
    if (product) {
      setProductForm({
        name: product.name,
        description: product.description || "",
        categoryId: product.categoryId,
        brandId: product.brandId,
        packagingId: product.packagingId,
        unitsPerBox: product.unitsPerBox,
        buyPricePerBox: String(product.buyPricePerBox || 0),
        sellPricePerBox: String(product.sellPricePerBox || 0),
        sellPricePerUnit: String(product.sellPricePerUnit || 0),
        allowLoss: product.allowLoss || false,
      });
      setEditingProductId(product.id);
    } else {
      resetProductForm();
    }
  };

  const handleProductSubmit = async () => {
    if (!productForm.name || !productForm.categoryId || !productForm.brandId || !productForm.packagingId) {
      toast.error("Please fill all required fields");
      return;
    }
    const basicPayload = {
      name: productForm.name,
      description: productForm.description || undefined,
      categoryId: productForm.categoryId,
      brandId: productForm.brandId,
      packagingId: productForm.packagingId,
      unitsPerBox: Number(productForm.unitsPerBox) || DEFAULT_UNITS_PER_BOX,
    };
    const pricePayload = {
      buyPricePerBox: Number(productForm.buyPricePerBox) || 0,
      sellPricePerBox: Number(productForm.sellPricePerBox) || 0,
      sellPricePerUnit: Number(productForm.sellPricePerUnit) || 0,
      allowLoss: productForm.allowLoss,
    };
    try {
      setLoading(true);
      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, basicPayload);
        const currentProduct = products.find((p) => p.id === editingProductId);
        if (
          currentProduct &&
          (currentProduct.buyPricePerBox !== pricePayload.buyPricePerBox ||
            currentProduct.sellPricePerBox !== pricePayload.sellPricePerBox ||
            currentProduct.sellPricePerUnit !== pricePayload.sellPricePerUnit ||
            currentProduct.allowLoss !== pricePayload.allowLoss)
        ) {
          await api.post(`/products/${editingProductId}/prices`, pricePayload);
        }
        toast.success("Product updated");
      } else {
        await api.post("/products", { ...basicPayload, ...pricePayload });
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

  const openPriceHistory = (product: Product) => {
    setSelectedProductForHistory(product);
    setPriceHistoryDialogOpen(true);
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
      default:
        return "";
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
      setEntityForm({ name: "", type: (item as Packaging).name });
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

  // ==================== STOCK HISTORY ====================
  const fetchStockHistory = async (productId: string) => {
    try {
      setHistoryLoading(true);
      const response = await api.get<StockHistoryRecord[]>(`/stocks/history/${productId}`);
      setStockHistoryRecords(response.data);
    } catch (e) {
      toast.error("Failed to load stock history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openStockHistory = (stock: Stock) => {
    setSelectedStockForHistory(stock);
    fetchStockHistory(stock.productId);
    setStockHistoryDialogOpen(true);
  };

  // ==================== UTILITIES ====================
  const productHasStock = (productId: string) => stocks.some((s) => s.productId === productId);
  const calculateStockProfit = (stock: Stock) => {
    const product = stock.product;
    if (!product || !product.buyPricePerBox || !product.sellPricePerBox || !product.sellPricePerUnit) {
      return {
        boxProfit: 0,
        singleProfit: 0,
        costPerUnit: 0,
        unitProfit: 0,
        totalCost: 0,
        totalRevenue: 0,
        totalProfit: 0,
      };
    }
    const costPerUnit = product.buyPricePerBox / product.unitsPerBox;
    const unitProfit = product.sellPricePerUnit - costPerUnit;
    const boxProfitPerBox = product.sellPricePerBox - product.buyPricePerBox;
    const totalUnits = stock.boxQuantity * product.unitsPerBox + stock.singleQuantity;
    const totalCost = stock.boxQuantity * product.buyPricePerBox + stock.singleQuantity * costPerUnit;
    const totalRevenue = stock.boxQuantity * product.sellPricePerBox + stock.singleQuantity * product.sellPricePerUnit;
    const totalProfit = totalRevenue - totalCost;
    const boxProfit = stock.boxQuantity * boxProfitPerBox;
    const singleProfit = stock.singleQuantity * unitProfit;
    return { boxProfit, singleProfit, costPerUnit, unitProfit, totalCost, totalRevenue, totalProfit };
  };

  // ==================== LOCALSTORAGE SYNC ====================
  useEffect(() => {
    setIsClient(true);
    const pinned = localStorage.getItem(STORAGE_PINNED_FILTER_KEY);
    if (pinned === "all" || pinned === "box" || pinned === "single") {
      setFilterType(pinned as FilterType);
      setIsFilterPinned(true);
    } else {
      const saved = localStorage.getItem(STORAGE_FILTER_KEY);
      if (saved === "all" || saved === "box" || saved === "single") {
        setFilterType(saved as FilterType);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (activeEntityTab === "prices") {
      fetchPriceList();
    }
  }, [activeEntityTab, fetchPriceList]);

  // Filtered stocks and pagination
  const filteredStocks = stocks.filter((s) => s.product?.name.toLowerCase().includes(search.toLowerCase())).filter((s) => {
    if (filterType === "box") return s.containerType === "box";
    if (filterType === "single") return s.containerType === "single";
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredStocks.length / pageSize));
  const paginatedStocks = filteredStocks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Filtered entities
  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(entitySearch.toLowerCase()));
  const filteredCategories = categories.filter((c) => c.name.toLowerCase().includes(entitySearch.toLowerCase()));
  const filteredBrands = brands.filter((b) => b.name.toLowerCase().includes(entitySearch.toLowerCase()));
  const filteredPackagings = packagings.filter((p) => p.name.toLowerCase().includes(entitySearch.toLowerCase()));

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        // fetch price layers when expanded
        fetchPriceLayers(id);
      }
      return next;
    });
  };

  return {
    // state
    stocks,
    products,
    categories,
    brands,
    packagings,
    loading,
    error,
    search,
    setSearch,
    filterType,
    setFilterType,
    isFilterPinned,
    setIsFilterPinned,
    isClient,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filteredStocks,
    totalPages,
    paginatedStocks,
    stats,
    // dialogs visibility and state
    formDialogOpen,
    setFormDialogOpen,
    form,
    editingId,
    restockDialogOpen,
    setRestockDialogOpen,
    restockStock,
    restockBoxes,
    setRestockBoxes,
    restockSingles,
    setRestockSingles,
    restockNotes,
    setRestockNotes,
    restockPriceOption,
    setRestockPriceOption,
    restockExistingPriceId,
    setRestockExistingPriceId,
    restockNewBuyPrice,
    setRestockNewBuyPrice,
    restockNewSellPriceBox,
    setRestockNewSellPriceBox,
    restockNewSellPriceUnit,
    setRestockNewSellPriceUnit,
    restockIsFree,
    setRestockIsFree,
    availablePrices,
    loadingPrices,
    adjustDialogOpen,
    setAdjustDialogOpen,
    adjustStock,
    adjustMode,
    setAdjustMode,
    adjustBoxes,
    setAdjustBoxes,
    adjustSingles,
    setAdjustSingles,
    adjustExactBoxes,
    setAdjustExactBoxes,
    adjustExactSingles,
    setAdjustExactSingles,
    exchangeDialogOpen,
    setExchangeDialogOpen,
    exchangeForm,
    setExchangeForm,
    exchangeLoading,
    entityDialogOpen,
    setEntityDialogOpen,
    activeEntityTab,
    setActiveEntityTab,
    entitySearch,
    setEntitySearch,
    priceListFilters,
    setPriceListFilters,
    priceListData,
    priceListLoading,
    activatingPriceId,
    productForm,
    editingProductId,
    priceHistoryDialogOpen,
    setPriceHistoryDialogOpen,
    selectedProductForHistory,
    stockHistoryDialogOpen,
    setStockHistoryDialogOpen,
    selectedStockForHistory,
    stockHistoryRecords,
    historyLoading,
    entityForm,
    setEntityForm,
    editingEntityId,
    expandedRows,
    deleteAlertOpen,
    setDeleteAlertOpen,
    deleteStock,
    priceLayers,
    // filtered entities
    filteredProducts,
    filteredCategories,
    filteredBrands,
    filteredPackagings,
    // actions
    getCategoryName,
    getBrandName,
    getPackagingName,
    calculateStockProfit,
    handleStockQuantityChange,
    handleStockContainerTypeChange,
    handleStockProductSelect,
    handleStockSubmit,
    confirmDelete,
    performDelete,
    openRestockDialog,
    getProfitImpact,
    handleRestock,
    openAdjustDialog,
    handleAdjustSubmit,
    handleExchange,
    openProductForm,
    handleProductSubmit,
    handleProductDelete,
    openPriceHistory,
    handleEntitySubmit,
    handleEditEntity,
    handleDeleteEntity,
    toggleRowExpanded,
    productHasStock,
    openStockHistory,
    handleActivatePrice,
    resetProductForm,
    openStockForm,
    setEditingProductId,
    setEditingEntityId,
    setProductForm,
    fetchPriceList,
  };
}