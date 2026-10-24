import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Unlock } from "lucide-react";

import { ProductGrid } from "@/components/site/ProductGrid";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { currency } from "@/lib/decor";
import { listUnlockedDesigns, type UnlockedDesign } from "@/lib/saved.functions";

export const Route = createFileRoute("/unlocked")({
  validateSearch: (s: Record<string, unknown>): { gen?: string | undefined } => ({
    gen: typeof s["gen"] === "string" ? s["gen"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "My Unlocked Designs — Home Editory" },
      { name: "description", content: "The room designs you unlocked, with their full Amazon shopping links." },
      { property: "og:title", content: "My Unlocked Designs — Home Editory" },
      { property: "og:description", content: "Your unlocked AI room designs and shopping links." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UnlockedPage,
});

function UnlockedPage() {
  const { gen } = Route.useSearch();
  const { user, loading } = useAuth();
  const fetchUnlocked = useServerFn(listUnlockedDesigns);
  const [active, setActive] = useState<UnlockedDesign | null>(null);
  const query = useQuery({
    queryKey: ["unlocked-designs", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchUnlocked(),
  });

  useEffect(() => {
    if (gen && query.data) {
      const match = query.data.find((d) => d.generationId === gen);
      if (match) setActive(match);
    }
  }, [gen, query.data]);

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-16"><Skeleton className="h-64 w-full rounded-xl" /></div>;
  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-3xl">My Unlocked</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to see the designs you unlocked.</p>
        <Button asChild className="mt-6"><Link to="/auth">Sign in</Link></Button>
      </div>
    );

  const items = query.data ?? [];
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14">
      <h1 className="text-4xl">My Unlocked</h1>
      <p className="mt-2 text-sm text-muted-foreground">Designs you paid to unlock, with their shopping links.</p>
      <div className="mt-8">
        {query.isLoading ? (
          <div className="grid gap-6 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <div className="surface-card p-10 text-center">
            <p className="font-display text-2xl">No unlocked designs yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Unlock a design to see its full shopping list here.</p>
            <Button asChild className="mt-5"><Link to="/">Start designing</Link></Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const total = item.products.reduce((s, p) => s + p.price, 0);
              return (
                <button key={item.generationId} type="button" onClick={() => setActive(item)} className="surface-card overflow-hidden text-left">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={`${item.style} ${item.roomType}`} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  ) : <div className="aspect-[4/3] w-full bg-muted" />}
                  <div className="space-y-1 p-4">
                    <p className="font-display text-xl">{item.style} {item.roomType}</p>
                    <p className="text-sm">{item.products.length} items · about {currency(total)}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Unlock className="size-3" /> Unlocked {new Date(item.unlockedAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={Boolean(active)} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="flex h-[92dvh] max-h-[92dvh] w-[calc(100vw-1rem)] flex-col overflow-hidden sm:max-w-5xl">
          {active ? (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle>{active.style} {active.roomType}</DialogTitle>
                <DialogDescription>{active.budget} · {active.products.length} items</DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
                {active.imageUrl ? (
                  <div className="mx-auto mb-7 flex h-[30dvh] min-h-36 max-h-72 w-full max-w-2xl items-center justify-center">
                    <img src={active.imageUrl} alt={`${active.style} ${active.roomType}`} className="h-full w-full object-contain" />
                  </div>
                ) : null}
                <ProductGrid products={active.products} />
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
