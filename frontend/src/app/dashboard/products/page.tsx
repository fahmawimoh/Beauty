"use client";

import { useEffect, useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import type { Product } from "@/types";

export default function ProductsPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sku: "", name: "", price: "", costPrice: "", stockQuantity: "", lowStockThreshold: "5" });

  const branchParam = user?.branchId ? `?branchId=${user.branchId}` : "?";
  const load = async () => {
    const [all, low] = await Promise.all([
      api.get<{ items: Product[] }>(`/products${branchParam}&pageSize=100`),
      api.get<Product[]>(`/products/low-stock${user?.branchId ? `?branchId=${user.branchId}` : ""}`),
    ]);
    setProducts(all.items);
    setLowStock(low);
  };

  useEffect(() => { load().catch(console.error); }, [user?.branchId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/products", {
      branchId: user?.branchId || null,
      sku: form.sku,
      name: form.name,
      price: Number(form.price),
      costPrice: Number(form.costPrice),
      stockQuantity: Number(form.stockQuantity),
      lowStockThreshold: Number(form.lowStockThreshold),
    });
    setForm({ sku: "", name: "", price: "", costPrice: "", stockQuantity: "", lowStockThreshold: "5" });
    setShowForm(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products & Inventory</h1>
          <p className="text-sm text-slate-500">Track stock and product catalog</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> Add Product</Button>
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800"><strong>{lowStock.length} products</strong> are running low on stock</p>
        </div>
      )}

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleCreate} className="grid grid-cols-3 gap-4">
              <Input placeholder="SKU *" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
              <Input placeholder="Product name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="col-span-2" />
              <Input placeholder="Price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              <Input placeholder="Cost price" type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required />
              <Input placeholder="Stock quantity" type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} required />
              <div className="col-span-3 flex gap-2">
                <Button type="submit">Save Product</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">SKU</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Price</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Cost</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Stock</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{formatCurrency(p.price)}</td>
                <td className="px-4 py-3 text-slate-500">{formatCurrency(p.costPrice)}</td>
                <td className="px-4 py-3">
                  <span className={p.isLowStock ? "text-amber-600 font-medium" : ""}>{p.stockQuantity}</span>
                </td>
                <td className="px-4 py-3">
                  {p.isLowStock ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      <AlertTriangle className="h-3 w-3" /> Low
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">In stock</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
