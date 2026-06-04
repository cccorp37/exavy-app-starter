import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen, GraduationCap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Item {
  id: string;
  type: "ebook" | "training";
  title: string;
  description: string | null;
  category: string | null;
  price_fcfa: number;
  cover_url: string | null;
  download_url: string;
  is_published: boolean;
  created_at: string;
}

const emptyForm = {
  type: "ebook" as "ebook" | "training",
  title: "",
  description: "",
  category: "",
  price_fcfa: 0,
  cover_url: "",
  download_url: "",
  is_published: true,
};

export const AdminMarketplaceManager = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("marketplace_items")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erreur de chargement");
    setItems((data ?? []) as Item[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({
      type: item.type,
      title: item.title,
      description: item.description ?? "",
      category: item.category ?? "",
      price_fcfa: item.price_fcfa,
      cover_url: item.cover_url ?? "",
      download_url: item.download_url,
      is_published: item.is_published,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title || !form.download_url || form.price_fcfa < 0) {
      toast.error("Titre, lien de téléchargement et prix sont requis");
      return;
    }
    const payload = {
      ...form,
      description: form.description || null,
      category: form.category || null,
      cover_url: form.cover_url || null,
      created_by: user?.id,
    };
    const { error } = editing
      ? await (supabase as any).from("marketplace_items").update(payload).eq("id", editing.id)
      : await (supabase as any).from("marketplace_items").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Article mis à jour" : "Article publié");
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cet article ?")) return;
    const { error } = await (supabase as any).from("marketplace_items").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimé");
    load();
  };

  const togglePublish = async (item: Item) => {
    const { error } = await (supabase as any).from("marketplace_items")
      .update({ is_published: !item.is_published }).eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Gestion Marketplace</CardTitle>
        <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> Nouvel article</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucun article. Cliquez sur "Nouvel article" pour commencer.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = item.type === "training" ? GraduationCap : BookOpen;
              return (
                <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {item.cover_url
                      ? <img src={item.cover_url} alt="" className="w-full h-full object-cover" />
                      : <Icon className="w-6 h-6 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{item.title}</p>
                      <Badge variant={item.is_published ? "default" : "outline"}>
                        {item.is_published ? "Publié" : "Brouillon"}
                      </Badge>
                      <Badge variant="secondary">{item.type === "training" ? "Formation" : "Ebook"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.price_fcfa.toLocaleString()} FCFA</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={item.is_published} onCheckedChange={() => togglePublish(item)} />
                    <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'article" : "Nouvel article"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v: "ebook" | "training") => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ebook">Ebook</SelectItem>
                  <SelectItem value="training">Formation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Titre *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Catégorie</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex: Mathématiques" /></div>
              <div><Label>Prix FCFA *</Label><Input type="number" min={0} value={form.price_fcfa} onChange={(e) => setForm({ ...form, price_fcfa: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Affiche de couverture (URL)</Label><Input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Lien de téléchargement * (privé)</Label><Input value={form.download_url} onChange={(e) => setForm({ ...form, download_url: e.target.value })} placeholder="https://drive.google.com/..." /></div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pub">Publié</Label>
              <Switch id="pub" checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button className="flex-1" onClick={save}>{editing ? "Enregistrer" : "Publier"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
