"use client";

import { JSX, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trash2, Pencil } from "lucide-react";

interface Packaging {
  id: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function PackagingPage(): JSX.Element {
  const [items, setItems] = useState<Packaging[]>([]);
  const [name, setName] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");

  const fetchPackagings = async (): Promise<void> => {
    try {
      setError(null);
      const res = await api.get<Packaging[]>("/packagings");
      setItems(res.data);
    } catch (e) {
      setError("Failed to load packagings");
    }
  };

  useEffect(() => {
    fetchPackagings();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((p) =>
      p.type.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const resetForm = (): void => {
    setName("");
    setEditingId(null);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!name.trim()) return;

    try {
      setLoading(true);
      setError(null);

      if (editingId) {
        await api.put(`/packagings/${editingId}`, { type: name });
      } else {
        await api.post("/packagings", { type: name });
      }

      resetForm();
      await fetchPackagings();
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.message || "Failed to save packaging");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm("Delete this packaging?")) return;

    try {
      setError(null);
      await api.delete(`/packagings/${id}`);
      await fetchPackagings();
    } catch (e) {
      setError("Failed to delete packaging");
    }
  };

  const handleEdit = (item: Packaging): void => {
    setName(item.type);
    setEditingId(item.id);
  };

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