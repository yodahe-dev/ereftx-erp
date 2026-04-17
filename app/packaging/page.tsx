"use client";

import { JSX, useEffect, useMemo, useState } from "react";
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
interface Packaging {
  id: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
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
export default function PackagingPage(): JSX.Element {
  const [items, setItems] = useState<Packaging[]>([]);
  const [name, setName] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");

  /**
   * =====================
   * FETCH
   * =====================
   */
  const fetchPackagings = async (): Promise<void> => {
    try {
      setError(null);

      const res = await api.get<Packaging[]>("/packagings");

      if (!Array.isArray(res.data)) {
        throw new Error("Invalid API response");
      }

      setItems(res.data);
    } catch (e: unknown) {
      const err = e as ApiError;

      setError(
        err?.response?.data?.message || "Failed to load packagings"
      );
    }
  };

  useEffect(() => {
    void fetchPackagings();
  }, []);

  /**
   * =====================
   * FILTER
   * =====================
   */
  const filteredItems = useMemo<Packaging[]>(() => {
    const q = search.toLowerCase();

    return items.filter((p) => p.type.toLowerCase().includes(q));
  }, [items, search]);

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
      setError("Type is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: { type: string } = {
        type: trimmed,
      };

      if (editingId) {
        await api.put(`/packagings/${editingId}`, payload);
      } else {
        await api.post("/packagings", payload);
      }

      resetForm();
      await fetchPackagings();
    } catch (e: unknown) {
      const err = e as ApiError;

      setError(err?.response?.data?.message || "Failed to save packaging");
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
    if (!confirm("Delete this packaging?")) return;

    try {
      setError(null);
      await api.delete(`/packagings/${id}`);
      await fetchPackagings();
    } catch (e: unknown) {
      setError("Failed to delete packaging");
    }
  };

  /**
   * =====================
   * EDIT
   * =====================
   */
  const handleEdit = (item: Packaging): void => {
    setName(item.type);
    setEditingId(item.id);
  };

  /**
   * =====================
   * UI
   * =====================
   */
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-semibold">Packagings</h1>

      {error && <div className="text-sm text-red-500">{error}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex gap-2">
            <Input
              placeholder="Packaging type"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : editingId ? "Update" : "Add"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      {filteredItems.length === 0 && (
        <p className="text-center text-muted-foreground">
          No packaging found
        </p>
      )}

      <div className="grid gap-3">
        {filteredItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="flex justify-between items-center p-4">
              <div className="flex flex-col">
                <span className="font-medium">{item.type}</span>

                {item.createdAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleEdit(item)}
                >
                  <Pencil size={16} />
                </Button>

                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(item.id)}
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