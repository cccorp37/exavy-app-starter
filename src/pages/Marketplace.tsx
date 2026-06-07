import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GradientIcon } from "@/components/ui/gradient-icon";
import { BookOpen, GraduationCap, Download, ShoppingBag, Sparkles } from "lucide-react";
import { MarketplacePaymentDialog } from "@/components/marketplace/MarketplacePaymentDialog";
import { MarketplaceCover } from "@/components/marketplace/MarketplaceCover";
import { useToast } from "@/hooks/use-toast";

interface Item {
  id: string;
  type: "ebook" | "training";
  title: string;
  description: string | null;
  category: string | null;
  price_fcfa: number;
  cover_url: string | null;
}

const Marketplace = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "ebook" | "training">("all");
  const [payItem, setPayItem] = useState<Item | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: itemsData }, { data: purchaseData }] = await Promise.all([
      (supabase as any).from("marketplace_items")
        .select("id, type, title, description, category, price_fcfa, cover_url")
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
      user
        ? (supabase as any).from("marketplace_purchases").select("item_id").eq("user_id", user.id).eq("status", "completed")
        : Promise.resolve({ data: [] as any[] }),
    ]);
    setItems((itemsData ?? []) as Item[]);
    setPurchased(new Set((purchaseData ?? []).map((p: any) => p.item_id)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const download = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("marketplace-sign-download", {
      body: { itemId: id },
    });
    if (error || !data?.url) {
      toast({ variant: "destructive", title: "Téléchargement indisponible", description: error?.message || data?.error });
      return;
    }
    window.open(data.url as string, "_blank", "noopener,noreferrer");
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <div className="flex items-center gap-4">
          <GradientIcon icon={ShoppingBag} gradient="from-fuchsia-500 via-pink-500 to-rose-500" size="xl" />
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Marketplace</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Ebooks & formations sélectionnés par l'équipe EXAVY
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {([
            { k: "all", label: "Tout" },
            { k: "ebook", label: "Ebooks" },
            { k: "training", label: "Formations" },
          ] as const).map((f) => (
            <Button key={f.k} size="sm" variant={filter === f.k ? "default" : "outline"} onClick={() => setFilter(f.k)}>
              {f.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Chargement…</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">Aucun article disponible pour le moment.</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item) => {
              const owned = purchased.has(item.id);
              const Icon = item.type === "training" ? GraduationCap : BookOpen;
              const gradient = item.type === "training"
                ? "from-indigo-500 via-violet-500 to-purple-600"
                : "from-amber-500 via-orange-500 to-rose-500";
              return (
                <Card key={item.id} className="overflow-hidden flex flex-col group hover:shadow-xl transition-shadow">
                  <div className="relative aspect-[16/10] bg-gradient-to-br from-muted to-muted/40 overflow-hidden">
                    <MarketplaceCover
                      value={item.cover_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      fallback={
                        <div className="w-full h-full flex items-center justify-center">
                          <GradientIcon icon={Icon} gradient={gradient} size="xl" />
                        </div>
                      }
                    />
                    <Badge className="absolute top-3 left-3 capitalize">{item.type === "training" ? "Formation" : "Ebook"}</Badge>
                  </div>
                  <CardContent className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-start gap-3">
                      <GradientIcon icon={Icon} gradient={gradient} size="md" />
                      <div className="min-w-0">
                        <h3 className="font-bold truncate">{item.title}</h3>
                        {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                      </div>
                    </div>
                    {item.description && <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="font-black text-lg">{item.price_fcfa.toLocaleString()} <span className="text-xs font-medium text-muted-foreground">FCFA</span></div>
                      {owned ? (
                        <Button size="sm" onClick={() => download(item.id)}>
                          <Download className="w-4 h-4 mr-1" /> Télécharger
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => setPayItem(item)}>Acheter</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {payItem && (
        <MarketplacePaymentDialog
          open={!!payItem}
          onOpenChange={(o) => !o && setPayItem(null)}
          itemId={payItem.id}
          itemTitle={payItem.title}
          priceFcfa={payItem.price_fcfa}
          onSuccess={load}
        />
      )}
    </MainLayout>
  );
};

export default Marketplace;
