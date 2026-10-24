import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trash2, ExternalLink, Lock } from "lucide-react";
import { toast } from "sonner";

import { AdSlot } from "@/components/site/AdSlot";
import { CheckoutDialog } from "@/components/site/CheckoutDialog";
import { FeaturedProducts } from "@/components/site/FeaturedProducts";
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
import { currency, type AmazonProduct } from "@/lib/decor";
import { splitFeatured } from "@/lib/partners";
import { getUnlockPrice, unlockGeneration } from "@/lib/decor.functions";
import { deleteSavedRoom, listSavedRooms, type SavedRoom } from "@/lib/saved.functions";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "My Saved Designs — Home Editory" },
      {
        name: "description",
        content:
          "Revisit the Home Editory room designs you bookmarked, with their shopping lists, totals and unlock status.",
      },
      { property: "og:title", content: "My Saved Designs — Home Editory" },
      {
        property: "og:description",
        content: "Your bookmarked AI room designs and their Amazon shopping lists.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SavedPage,
});

function SavedPage() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const fetchSaved = useServerFn(listSavedRooms);
  const removeSaved = useServerFn(deleteSavedRoom);
  const fetchPrice = useServerFn(getUnlockPrice);
  const runUnlock = useServerFn(unlockGeneration);
  const [active, setActive] = useState<(SavedRoom & { featured: AmazonProduct[] }) | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const query = useQuery({
    queryKey: ["saved-rooms", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchSaved(),
  });

  const priceQuery = useQuery({
    queryKey: ["unlock-price"],
    queryFn: () => fetchPrice(),
  });
  const price = priceQuery.data?.price ?? 2;

  const remove = useMutation({
    mutationFn: (id: string) => removeSaved({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed from your saved designs.");
      setActive(null);
      queryClient.invalidateQueries({ queryKey: ["saved-rooms"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const unlock = useMutation({
    mutationFn: (generationId: string) => runUnlock({ data: { generationId } }),
    onSuccess: async () => {
      toast.success("Payment complete — your Amazon links are unlocked.");
      setCheckoutOpen(false);
      setActive((prev) => (prev ? { ...prev, isUnlocked: true } : prev));
      await queryClient.invalidateQueries({ queryKey: ["saved-rooms"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24 text-center">
        <h1 className="text-3xl">My Saved</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to bookmark rooms and come back to them any time.
        </p>
        <Button asChild className="mt-6">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  // Featured partner items show on their own card; counts and the list use the regular items.
  const items = (query.data ?? []).map((item) => {
    const { featured, regular } = splitFeatured(item.products);
    return { ...item, products: regular, featured };
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14">
      <h1 className="text-4xl">My Saved</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The rooms you bookmarked, with their shopping lists and totals.
      </p>

      <div className="my-8">
        <AdSlot />
      </div>

      {query.isLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="surface-card p-10 text-center">
          <p className="font-display text-2xl">Nothing saved yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tap the heart on a finished room to keep it here.
          </p>
          <Button asChild className="mt-5">
            <Link to="/">Start designing</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const total = item.products.reduce((sum, p) => sum + p.price, 0);
            const listTotal = item.products.reduce(
              (sum, p) => sum + Number(p.listPrice ?? p.price),
              0,
            );
            const savings = Math.max(0, listTotal - total);
            return (
              <article key={item.id} className="surface-card overflow-hidden">
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => setActive(item)}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={`${item.style} ${item.roomType} saved in Home Editory`}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="aspect-[4/3] w-full bg-muted" />
                  )}
                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-xl">
                        {item.style} {item.roomType}
                      </p>
                      <Badge variant="secondary">{item.style}</Badge>
                    </div>
                    <p className="text-sm">
                      {item.products.length} items · about {currency(total)}
                      {savings > 0 ? ` · you save ${currency(savings)}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.budget} · {new Date(item.createdAt).toLocaleDateString()}
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
                <div className="flex items-center justify-end border-t border-border px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove.mutate(item.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {active ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {active.style} {active.roomType}
                </DialogTitle>
                <DialogDescription>
                  {active.budget} · saved {new Date(active.createdAt).toLocaleDateString()} ·{" "}
                  {active.isUnlocked ? "Unlocked" : "Locked"}
                </DialogDescription>
              </DialogHeader>

              {active.imageUrl ? (
                <img
                  src={active.imageUrl}
                  alt={`${active.style} ${active.roomType}`}
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
              ) : null}

              <FeaturedProducts products={active.featured} />

              {active.isUnlocked ? (
                <ul className="divide-y divide-border">
                  {active.products.map((product) => (
                    <li
                      key={product.asin ?? product.name}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
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
                    <p className="font-display text-xl">
                      {active.products.length} items in this list
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Product names, prices and shopping links stay hidden until you unlock this
                      design.
                    </p>
                  </div>
                  {active.generationId ? (
                    <Button className="w-full" onClick={() => setCheckoutOpen(true)}>
                      Unlock for {currency(price)}
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      This design can no longer be unlocked.
                    </p>
                  )}
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => remove.mutate(active.id)}
                disabled={remove.isPending}
              >
                <Trash2 className="size-4" /> Delete saved design
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <CheckoutDialog
        open={checkoutOpen}
        price={price}
        busy={unlock.isPending}
        onOpenChange={setCheckoutOpen}
        onConfirm={() => active?.generationId && unlock.mutate(active.generationId)}
        generationId={active?.generationId ?? null}
        onPaid={async () => {
          setActive((prev) => (prev ? { ...prev, isUnlocked: true } : prev));
          await queryClient.invalidateQueries({ queryKey: ["saved-rooms"] });
        }}
      />
    </div>
  );
}
