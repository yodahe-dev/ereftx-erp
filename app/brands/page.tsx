"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Trash2, Pencil } from "lucide-react";

interface Brand {
  id: string;
  name: string;
}

export default function BrandPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [name, setName] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");

  const fetchBrands = async (): Promise<void> => {
    try {
      const res = await api.get<Brand[]>("/brands");
      setBrands(res.data);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleSubmit = async (): Promise<void> => {
    if (!name.trim()) return;

    try {
      setLoading(true);

      if (editingId) {
        await api.put(`/brands/${editingId}`, { name });
        setEditingId(null);
      } else {
        await api.post("/brands", { name });
      }

      setName("");
      await fetchBrands();
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm("Delete this brand?")) return;

    try {
      await api.delete(`/brands/${id}`);
      await fetchBrands();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleEdit = (brand: Brand): void => {
    setName(brand.name);
    setEditingId(brand.id);
  };

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-3xl font-semibold">Brand Manager</h1>

      {/* top controls */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex gap-2">
            <Input
              placeholder="Brand name"
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
              placeholder="Search brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      {/* empty */}
      {filteredBrands.length === 0 && (
        <p className="text-center text-muted-foreground">
          No brands found
        </p>
      )}

      {/* list */}
      <div className="grid gap-3">
        {filteredBrands.map((brand) => (
          <motion.div
            key={brand.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="flex justify-between items-center p-4">
              <span className="font-medium">{brand.name}</span>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleEdit(brand)}
                >
                  <Pencil size={16} />
                </Button>

                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(brand.id)}
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
