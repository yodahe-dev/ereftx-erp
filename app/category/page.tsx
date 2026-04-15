"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trash2, Pencil } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // fetch
  const fetchCategories = async () => {
    try {
      const res = await api.get<Category[]>("/categories");
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // create / update
  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      setLoading(true);

      if (editingId) {
        await api.put(`/categories/${editingId}`, { name });
        setEditingId(null);
      } else {
        await api.post("/categories", { name });
      }

      setName("");
      fetchCategories();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // delete
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;

    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  // edit
  const handleEdit = (cat: Category) => {
    setName(cat.name);
    setEditingId(cat.id);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Category Manager</h1>

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