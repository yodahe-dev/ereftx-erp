"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trash2, Pencil } from "lucide-react";

type ID = string;

interface Product {
  id: ID;
  name: string;
  categoryId: ID;
  brandId: ID;
  packagingId: ID;
  bottlesPerBox: number;
  boxBuyPrice: number;
  boxSellPrice: number;
  singleSellPrice: number;
}

interface Category {
  id: ID;
  name: string;
}

interface Brand {
  id: ID;
  name: string;
}

interface Packaging {
  id: ID;
  type: string;
}

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);

  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<ID | null>(null);

  const [search, setSearch] = useState("");

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

  const fetchAll = async (): Promise<void> => {
    try {
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
    } catch (err) {
      console.error("FETCH ERROR:", err);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const reset = (): void => {
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
    setEditingId(null);
  };

  const submit = async (): Promise<void> => {
    if (!form.name) return;

    setLoading(true);

    try {
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
      } else {
        await api.post("/products", payload);
      }

      reset();
      await fetchAll();
    } catch (err) {
      console.error("SAVE ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: ID): Promise<void> => {
    await api.delete(`/products/${id}`);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const edit = (p: Product): void => {
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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Products</h1>

      <Input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Card>
        <CardContent className="p-4 grid md:grid-cols-3 gap-2">
          <Input
            placeholder="Name"
            value={form.name}
            onChange={(e) =>
              setForm((s) => ({ ...s, name: e.target.value }))
            }
          />

          <select
            value={form.categoryId}
            onChange={(e) =>
              setForm((s) => ({ ...s, categoryId: e.target.value }))
            }
            className="border p-2"
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
            onChange={(e) =>
              setForm((s) => ({ ...s, brandId: e.target.value }))
            }
            className="border p-2"
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
            onChange={(e) =>
              setForm((s) => ({ ...s, packagingId: e.target.value }))
            }
            className="border p-2"
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
            value={form.bottlesPerBox}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                bottlesPerBox: Number(e.target.value),
              }))
            }
          />

          <Input
            placeholder="Buy"
            value={form.boxBuyPrice}
            onChange={(e) =>
              setForm((s) => ({ ...s, boxBuyPrice: e.target.value }))
            }
          />

          <Input
            placeholder="Sell"
            value={form.boxSellPrice}
            onChange={(e) =>
              setForm((s) => ({ ...s, boxSellPrice: e.target.value }))
            }
          />

          <Input
            placeholder="Single"
            value={form.singleSellPrice}
            onChange={(e) =>
              setForm((s) => ({ ...s, singleSellPrice: e.target.value }))
            }
          />

          <Button onClick={submit} disabled={loading}>
            {editingId ? "Update" : "Create"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {filtered.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="flex justify-between p-4">
              <div>
                <p className="font-medium">{p.name}</p>
              </div>

              <div className="flex gap-2">
                <Button size="icon" onClick={() => edit(p)}>
                  <Pencil size={16} />
                </Button>

                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => remove(p.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}