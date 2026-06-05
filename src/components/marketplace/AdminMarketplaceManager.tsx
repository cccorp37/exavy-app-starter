import { useEffect, useRef, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen, GraduationCap, Upload, Link as LinkIcon, Image as ImageIcon, FileUp, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface DownloadRow {
  download_url: string | null;
  storage_path: string | null;
}

interface Item {
  id: string;
  type: "ebook" | "training";
  title: string;
  description: string | null;
  category: string | null;
  price_fcfa: number;
  cover_url: string | null;
  is_published: boolean;
  created_at: string;
  marketplace_item_downloads?: DownloadRow | DownloadRow[] | null;
  download_url?: string;
  storage_path?: string;
}

type Mode = "url" | "upload";

const emptyForm = {
  type: "ebook" as "ebook" | "training",
  title: "",
  description: "",
  category: "",
  price_fcfa: 0,
  cover_url: "",
  download_url: "",
  storage_path: "",
  is_published: true,
};

export const AdminMarketplaceManager = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [mode, setMode] = useState<Mode>("url");
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("marketplace_items")
      .select("id, type, title, description, category, price_fcfa, cover_url, is_published, created_at, marketplace_item_downloads(download_url, storage_path)")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erreur de chargement");
    const normalized = (data ?? []).map((item: Item) => {
      const rel = Array.isArray(item.marketplace_item_downloads)
        ? item.marketplace_item_downloads[0]
        : item.marketplace_item_downloads;
      return {
        ...item,
        download_url: rel?.download_url ?? "",
        storage_path: rel?.storage_path ?? "",
      };
    });
    setItems(normalized as Item[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setMode("url");
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
      download_url: item.download_url ?? "",
      storage_path: item.storage_path ?? "",
      is_published: item.is_published,
    });
    setMode(item.storage_path ? "upload" : "url");
    setDialogOpen(true);
  };

  const uploadCover = async (file: File) => {
    if (!user) return;
    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("marketplace-covers").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("marketplace-covers").getPublicUrl(path);
      setForm((f) => ({ ...f, cover_url: pub.publicUrl }));
      toast.success("Couverture téléversée");
    } catch (e: any) {
      toast.error(e.message || "Erreur téléversement");
    } finally {
      setUploadingCover(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!user) return;
    setUploadingFile(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("marketplace-files").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type,
      });
      if (error) throw error;
      setForm((f) => ({ ...f, storage_path: path, download_url: "" }));
      toast.success(`Fichier téléversé (${(file.size / 1024 / 1024).toFixed(2)} Mo)`);
    } catch (e: any) {
      toast.error(e.message || "Erreur téléversement");
    } finally {
      setUploadingFile(false);
    }
  };

  const save = async () => {
    if (!form.title || form.price_fcfa < 0) {
      toast.error("Titre et prix requis");
      return;
    }
    const hasUrl = mode === "url" && form.download_url.trim().length > 0;
    const hasPath = mode === "upload" && form.storage_path.trim().length > 0;
    if (!hasUrl && !hasPath) {
      toast.error("Fournis un lien externe OU téléverse un fichier");
      return;
    }
    setSaving(true);
    try {
      const { download_url, storage_path, ...itemForm } = form;
      const payload = {
        ...itemForm,
        description: form.description || null,
        category: form.category || null,
        cover_url: form.cover_url || null,
        created_by: user?.id,
      };
      const saved = editing
        ? await (supabase as any).from("marketplace_items").update(payload).eq("id", editing.id).select("id").single()
        : await (supabase as any).from("marketplace_items").insert(payload).select("id").single();
      if (saved.error) throw saved.error;
      const itemId = saved.data.id;

      const downloadPayload = {
        item_id: itemId,
        download_url: hasUrl ? download_url : null,
        storage_path: hasPath ? storage_path : null,
      };
      const { error: dErr } = await (supabase as any)
        .from("marketplace_item_downloads")
        .upsert(downloadPayload, { onConflict: "item_id" });
      if (dErr) throw dErr;

      toast.success(editing ? "Article mis à jour" : "Article publié");
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
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
                      {item.storage_path ? <Badge variant="outline" className="gap-1"><FileUp className="w-3 h-3" />Fichier</Badge> : item.download_url ? <Badge variant="outline" className="gap-1"><LinkIcon className="w-3 h-3" />Lien</Badge> : null}
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

            {/* Cover upload or URL */}
            <div className="space-y-2">
              <Label>Affiche de couverture</Label>
              <div className="flex gap-2">
                <Input className="flex-1" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://… ou téléverser →" />
                <input ref={coverRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
                <Button type="button" variant="outline" disabled={uploadingCover} onClick={() => coverRef.current?.click()}>
                  {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                </Button>
              </div>
              {form.cover_url && (
                <img src={form.cover_url} alt="" className="w-full h-32 object-cover rounded border" />
              )}
            </div>

            {/* Download source: URL or Upload */}
            <div className="space-y-2">
              <Label>Source du téléchargement *</Label>
              <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="url"><LinkIcon className="w-4 h-4 mr-1" /> Lien externe</TabsTrigger>
                  <TabsTrigger value="upload"><Upload className="w-4 h-4 mr-1" /> Téléverser fichier</TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="pt-2">
                  <Input value={form.download_url} onChange={(e) => setForm({ ...form, download_url: e.target.value, storage_path: "" })} placeholder="https://drive.google.com/…" />
                  <p className="text-xs text-muted-foreground mt-1">Lien privé Google Drive / Mega / Dropbox</p>
                </TabsContent>
                <TabsContent value="upload" className="pt-2 space-y-2">
                  <input ref={fileRef} type="file" accept="application/pdf,application/zip,application/epub+zip,audio/*,video/*,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                  <Button type="button" variant="outline" className="w-full" disabled={uploadingFile} onClick={() => fileRef.current?.click()}>
                    {uploadingFile ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Téléversement…</> : <><FileUp className="w-4 h-4 mr-2" /> Choisir un fichier (PDF, audio, vidéo, ZIP…)</>}
                  </Button>
                  {form.storage_path && (
                    <p className="text-xs text-emerald-600 break-all">✓ Fichier prêt : {form.storage_path.split("/").pop()}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Le fichier reste privé. Un lien signé temporaire est généré après paiement.</p>
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="pub">Publié</Label>
              <Switch id="pub" checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button className="flex-1" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Enregistrer" : "Publier"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
