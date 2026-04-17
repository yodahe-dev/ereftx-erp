"use client";

import { JSX, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

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

interface Product {
  id: string;
  name: string;
  categoryId: string;
  brandId: string;
  packagingId: string;
  bottlesPerBox: number;
  boxBuyPrice: number;
  boxSellPrice: number;
  singleSellPrice: number;
}

export default function ProductPage(): JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);

  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    brandId: "",
    packagingId: "",
    bottlesPerBox: 24,
    boxBuyPrice: "",
    boxSellPrice: "",
    singleSellPrice: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // =====================
  // FETCH DATA
  // =====================

  const fetchAll = async () => {
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
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // =====================
  // HANDLE CHANGE
  // =====================

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // =====================
  // SUBMIT
  // =====================

  const handleSubmit = async () => {
    if (
      !form.name ||
      !form.categoryId ||
      !form.brandId ||
      !form.packagingId
    ) {
      alert("Fill required fields");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: form.name,
        categoryId: form.categoryId,
        brandId: form.brandId,
        packagingId: form.packagingId,
        bottlesPerBox: Number(form.bottlesPerBox),
        boxBuyPrice: Number(form.boxBuyPrice),
        boxSellPrice: Number(form.boxSellPrice),
        singleSellPrice: Number(form.singleSellPrice),
      };

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
        setEditingId(null);
      } else {
        await api.post("/products", payload);
      }

      setForm({
        name: "",
        categoryId: "",
        brandId: "",
        packagingId: "",
        bottlesPerBox: 24,
        boxBuyPrice: "",
        boxSellPrice: "",
        singleSellPrice: "",
      });

      fetchAll();
    } finally {
      setLoading(false);
    }
  };

  // =====================
  // DELETE
  // =====================

  const handleDelete = async (id: string) => {
    if (!confirm("Delete product?")) return;

    await api.delete(`/products/${id}`);
    fetchAll();
  };

  // =====================
  // EDIT
  // =====================

  const handleEdit = (p: Product) => {
    setEditingId(p.id);

    setForm({
      name: p.name,
      categoryId: p.categoryId,
      brandId: p.brandId,
      packagingId: p.packagingId,
      bottlesPerBox: p.bottlesPerBox,
      boxBuyPrice: String(p.boxBuyPrice),
      boxSellPrice: String(p.boxSellPrice),
      singleSellPrice: String(p.singleSellPrice),
    });
  };

  // =====================
  // UI
  // =====================

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-semibold">Products</h1>

      {/* FORM */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
          <Input
            placeholder="Product name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />

          <select
            value={form.categoryId}
            onChange={(e) => handleChange("categoryId", e.target.value)}
            className="border rounded px-2"
          >
            <option value="">Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={form.brandId}
            onChange={(e) => handleChange("brandId", e.target.value)}
            className="border rounded px-2"
          >
            <option value="">Brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={form.packagingId}
            onChange={(e) => handleChange("packagingId", e.target.value)}
            className="border rounded px-2"
          >
            <option value="">Packaging</option>
            {packagings.map((p) => (
              <option key={p.id} value={p.id}>
                {p.type}
              </option>
            ))}
          </select>

          <Input
            type="number"
            placeholder="Bottles/Box"
            value={form.bottlesPerBox}
            onChange={(e) =>
              handleChange("bottlesPerBox", e.target.value)
            }
          />

          <Input
            type="number"
            placeholder="Box Buy Price"
            value={form.boxBuyPrice}
            onChange={(e) =>
              handleChange("boxBuyPrice", e.target.value)
            }
          />

          <Input
            type="number"
            placeholder="Box Sell Price"
            value={form.boxSellPrice}
            onChange={(e) =>
              handleChange("boxSellPrice", e.target.value)
            }
          />

          <Input
            type="number"
            placeholder="Single Sell Price"
            value={form.singleSellPrice}
            onChange={(e) =>
              handleChange("singleSellPrice", e.target.value)
            }
          />

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : editingId ? "Update" : "Add"}
          </Button>
        </CardContent>
      </Card>

      {/* LIST */}
      <div className="grid gap-3">
        {products.map((p) => (
          <Card key={p.id} className="p-4 flex justify-between">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted-foreground">
                Buy: {p.boxBuyPrice} | Sell: {p.boxSellPrice}
              </p>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleEdit(p)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(p.id)}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}