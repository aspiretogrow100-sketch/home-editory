import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ExternalLink, Image as ImageIcon, Lock } from "lucide-react";
import { toast } from "sonner";

import { AdSlot } from "@/components/site/AdSlot";
import { CheckoutDialog } from "@/components/site/CheckoutDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { currency } from "@/lib/decor";
import {
  getUnlockPrice,
  listPublicGallery,
  unlockGalleryDesign,
  type GalleryEntry,
} from "@/lib/decor.functions";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Inspiration Gallery — Interior AI Designer" },
      {
        name: "description",
        content:
          "Browse AI-generated room designs created by the Interior AI Designer community for interior inspiration.",
      },
      { property: "og:title", content: "Inspiration Gallery — Interior AI Designer" },
      {
        property: "og:description",
        content: "A public feed of AI interior designs made with Interior AI Designer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GalleryPage,
});

const TABS = [
  { id: "all", label: "All" },
  { id: "unlocked", label: "Unlocked" },
  { id: "popular", label: "Most Popular" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function summary(item: { itemCount: number; total: number; savings: number }) {
  const parts = [`${item.itemCount} items`];
  if (item.total > 0) parts.push(`about ${currency(item.total)}`);
  if (item.savings > 0) parts.push(`you save ${currency(item.savings)}`);
  return parts.join(" · ");
}

function GalleryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchGallery = useServerFn(listPublicGallery);
  const fetchPrice = useServerFn(getUnlockPrice);
  const runUnlock = useServerFn(unlockGalleryDesign);
  const [tab, setTab] = useState<TabId>("all");
  const [active, setActive] = useState<GalleryEntry | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const query = useQuery({
    queryKey: ["public-gallery"],
    queryFn: () => fetchGallery(),
  });

  const priceQuery = useQuery({ queryKey: ["unlock-price"], queryFn: () => fetchPrice() });
  const price = priceQuery.data?.price ?? 2;

  const unlock = useMutation({
    mutationFn: (generationId: string) => runUnlock({ data: { generationId } }),
    onSuccess: async () => {
      toast.success("Unlocked — this design's shopping list is now open to everyone.");
      setCheckoutOpen(false);
      const refreshed = await queryClient.fetchQuery({
        queryKey: ["public-gallery"],
        queryFn: () => fetchGallery(),
      });
      await queryClient.invalidateQueries({ queryKey: ["saved-rooms"] });
      setActive((prev) => (prev ? (refreshed.find((r) => r.id === prev.id) ?? prev) : prev));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = query.data ?? [];

  const visible = useMemo(() => {
    if (tab === "unlocked") return items.filter((i) => i.isUnlocked);
    if (tab === "popular")
      return [...items].sort(
        (a, b) => b.unlockCount - a.unlockCount || b.itemCount - a.itemCount,
      );
    return items;
  }, [items, tab]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14">
      <h1 className="text-4xl">Inspiration gallery</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Rooms designed by the Interior AI Designer community. Once anyone unlocks a design, its shopping list
        stays open for everyone.
      </p>

      <div className="my-8">
        <AdSlot />
      </div>

      <div className="mb-6 inline-flex rounded-full border border-border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="surface-card p-10 text-center">
          <p className="font-display text-2xl">No designs here yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Be the first to render a room in the studio.
          </p>
          <Button asChild className="mt-5">
            <Link to="/">Start designing</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item)}
              className="surface-card block w-full overflow-hidden text-left transition-shadow hover:shadow-lg"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={`${item.designStyle} ${item.roomType} generated with Interior AI Designer`}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-[4/3] w-full bg-muted" />
              )}
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-xl">
                    {item.designStyle} {item.roomType}
                  </p>
                  <Badge variant="secondary">{item.designStyle}</Badge>
                </div>
                <p className="text-sm">{summary(item)}</p>
                <p className="text-xs text-muted-foreground">
                  {item.budgetRange} · {new Date(item.createdAt).toLocaleDateString()}
                </p>
                {item.isUnlocked ? (
                  <Badge className="bg-accent text-accent-foreground">Unlocked</Badge>
                ) : (
                  <Badge variant="outline">
                    <Lock className="size-3" /> Locked · {currency(price)} unlock
                  </Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {active ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {active.designStyle} {active.roomType}
                </DialogTitle>
                <DialogDescription>
                  {active.budgetRange} · {summary(active)} ·{" "}
                  {active.isUnlocked ? "Unlocked" : "Locked"}
                </DialogDescription>
              </DialogHeader>

              {active.imageUrl ? (
                <img
                  src={active.imageUrl}
                  alt={`${active.designStyle} ${active.roomType}`}
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
              ) : null}

              {active.isUnlocked ? (
                <ul className="divide-y divide-border">
                  {active.products.map((product) => (
                    <li
                      key={product.asin ?? product.name}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          loading="lazy"
                          className="size-12 shrink-0 rounded-full border border-border bg-background object-cover"
                        />
                      ) : (
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                          <ImageIcon className="size-4" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-semibold">{currency(product.price)}</span>
                        <Button asChild size="sm" variant="outline">
                          <a href={product.url} target="_blank" rel="noopener noreferrer nofollow">
                            Buy <ExternalLink className="size-3.5" />
                          </a>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-4 rounded-lg border border-dashed border-border p-5 text-center">
                  <Lock className="mx-auto size-6 text-muted-foreground" />
                  <div>
                    <p className="font-display text-xl">{active.itemCount} items in this look</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Unlock once and the full shopping list opens for the whole community.
                    </p>
                  </div>
                  {user ? (
                    <Button className="w-full" onClick={() => setCheckoutOpen(true)}>
                      Unlock for {currency(price)}
                    </Button>
                  ) : (
                    <Button asChild className="w-full">
                      <Link to="/auth">Sign in to unlock</Link>
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <CheckoutDialog
        open={checkoutOpen}
        price={price}
        busy={unlock.isPending}
        onOpenChange={setCheckoutOpen}
        onConfirm={() => active && unlock.mutate(active.id)}
        generationId={active?.id ?? null}
        onPaid={async () => {
          const refreshed = await queryClient.fetchQuery({
            queryKey: ["public-gallery"],
            queryFn: () => fetchGallery(),
          });
          await queryClient.invalidateQueries({ queryKey: ["saved-rooms"] });
          setActive((prev) => (prev ? (refreshed.find((r) => r.id === prev.id) ?? prev) : prev));
        }}
      />
    </div>
  );
}
