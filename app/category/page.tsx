"use client";

import { JSX, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trash2, Pencil } from "lucide-react";

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
 * COMPONENT
 * =====================
 */
export default function CategoryPage(): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
   * RESET
   * =====================
   */
  const resetForm = (): void => {
    setName("");
    setEditingId(null);
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

      const payload: { name: string } = {
        name: trimmed,
      };

      if (editingId) {
        await api.put(`/categories/${editingId}`, payload);
      } else {
        await api.post("/categories", payload);
      }

      resetForm();
      await fetchCategories();
    } catch (e: unknown) {
      const err = e as ApiError;

      setError(err?.response?.data?.message || "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  /**
   * =====================
   * DELETE
   * =====================
   */
  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm("Delete this category?")) return;

    try {
      setError(null);

      await api.delete(`/categories/${id}`);
      await fetchCategories();
    } catch {
      setError("Failed to delete category");
    }
  };

  /**
   * =====================
   * EDIT
   * =====================
   */
  const handleEdit = (cat: Category): void => {
    setName(cat.name);
    setEditingId(cat.id);
  };

  /**
   * =====================
   * UI
   * =====================
   */
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Category Manager</h1>

      {error && (
        <div className="mb-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* form */}
      <Card className="mb-6">
        <CardContent className="p-4 flex gap-2">
          <Input
            placeholder="Enter category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : editingId ? "Update" : "Add"}
          </Button>
        </CardContent>
      </Card>

      {/* empty state */}
      {categories.length === 0 && (
        <p className="text-center text-muted-foreground">
          No categories yet
        </p>
      )}

      {/* list */}
      <div className="grid gap-3">
        {categories.map((cat) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="flex justify-between items-center p-4">
              <span className="font-medium">{cat.name}</span>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleEdit(cat)}
                >
                  <Pencil size={16} />
                </Button>

                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(cat.id)}
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