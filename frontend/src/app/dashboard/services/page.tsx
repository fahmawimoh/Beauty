"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { ServiceCategory, ServiceOffering } from "@/types";

export default function ServicesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [offerings, setOfferings] = useState<ServiceOffering[]>([]);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showSvcForm, setShowSvcForm] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [svcForm, setSvcForm] = useState({ name: "", price: "", categoryId: "", durationMinutes: "30" });

  const load = async () => {
    const [cats, svcs] = await Promise.all([
      api.get<ServiceCategory[]>("/services/categories"),
      api.get<ServiceOffering[]>("/services/offerings"),
    ]);
    setCategories(cats);
    setOfferings(svcs);
  };

  useEffect(() => { load().catch(console.error); }, []);

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/services/categories", { ...catForm, sortOrder: categories.length });
    setCatForm({ name: "", description: "" });
    setShowCatForm(false);
    load();
  };

  const createOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/services/offerings", {
      name: svcForm.name,
      price: Number(svcForm.price),
      categoryId: svcForm.categoryId || null,
      durationMinutes: Number(svcForm.durationMinutes),
    });
    setSvcForm({ name: "", price: "", categoryId: "", durationMinutes: "30" });
    setShowSvcForm(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-sm text-slate-500">Configure your service catalog</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCatForm(!showCatForm)}><Plus className="h-4 w-4" /> Category</Button>
          <Button onClick={() => setShowSvcForm(!showSvcForm)}><Plus className="h-4 w-4" /> Service</Button>
        </div>
      </div>

      {showCatForm && (
        <Card>
          <CardHeader><h3 className="font-semibold">New Category</h3></CardHeader>
          <CardContent>
            <form onSubmit={createCategory} className="flex gap-3">
              <Input placeholder="Category name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required className="flex-1" />
              <Input placeholder="Description" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} className="flex-1" />
              <Button type="submit">Add</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {showSvcForm && (
        <Card>
          <CardHeader><h3 className="font-semibold">New Service</h3></CardHeader>
          <CardContent>
            <form onSubmit={createOffering} className="grid grid-cols-4 gap-3">
              <Input placeholder="Service name" value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} required />
              <Input placeholder="Price" type="number" step="0.01" value={svcForm.price} onChange={(e) => setSvcForm({ ...svcForm, price: e.target.value })} required />
              <select value={svcForm.categoryId} onChange={(e) => setSvcForm({ ...svcForm, categoryId: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Button type="submit">Add Service</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {offerings.map((s) => (
          <Card key={s.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{s.name}</h3>
                  {s.categoryName && <p className="text-xs text-violet-600 mt-0.5">{s.categoryName}</p>}
                  {s.description && <p className="text-sm text-slate-500 mt-1">{s.description}</p>}
                </div>
                <span className="text-lg font-bold text-violet-600">{formatCurrency(s.price)}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">{s.durationMinutes} min</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {offerings.length === 0 && <p className="text-center py-12 text-slate-400">No services yet. Add your first service above.</p>}
    </div>
  );
}
