import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";

import { ProductGrid } from "@/components/site/ProductGrid";
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
      { title: "Inspiration Gallery — Home Editory" },
      {
        name: "description",
        content:
          "Browse AI-generated room designs created by the Home Editory community for interior inspiration.",
      },
      { property: "og:title", content: "Inspiration Gallery — Home Editory" },
      {
        property: "og:description",
        content: "A public feed of AI interior designs made with Home Editory.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { room?: string } => {
    const room = search["room"];
    return typeof room === "string" && room ? { room } : {};
  },
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
  const { room: roomParam } = Route.useSearch();
  const navigate = Route.useNavigate();
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
  const roomFilter = roomParam ?? "All rooms";
  const roomOptions = useMemo(
    () => ["All rooms", ...Array.from(new Set(items.map((i) => i.roomType))).sort()],
    [items],
  );
  const setRoomFilter = (room: string) =>
    navigate({ search: room === "All rooms" ? {} : { room }, replace: true });

  const visible = useMemo(() => {
    const scoped =
      roomFilter === "All rooms" ? items : items.filter((i) => i.roomType === roomFilter);
    if (tab === "unlocked") return scoped.filter((i) => i.isUnlocked);
    if (tab === "popular")
      return [...scoped].sort(
        (a, b) => b.unlockCount - a.unlockCount || b.itemCount - a.itemCount,
      );
    return scoped;
  }, [items, tab, roomFilter]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14">
      <h1 className="text-4xl">Inspiration gallery</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Rooms designed by the Home Editory community. Once anyone unlocks a design, its shopping list
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

      {roomOptions.length > 1 ? (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {roomOptions.map((room) => (
            <Button
              key={room}
              type="button"
              size="sm"
              variant={roomFilter === room ? "default" : "ghost"}
              onClick={() => setRoomFilter(room)}
              className={`h-9 shrink-0 rounded-full px-4 ${
                roomFilter === room ? "shadow-sm" : "border border-border bg-background"
              }`}
              aria-pressed={roomFilter === room}
            >
              {room}
            </Button>
          ))}
        </div>
      ) : null}

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
                  alt={`${item.designStyle} ${item.roomType} generated with Home Editory`}
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
        <DialogContent className="flex h-[92dvh] max-h-[92dvh] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)]">
          {active ? (
            <>
              <DialogHeader className="shrink-0 px-4 pb-3 pt-5 pr-12 sm:px-6 sm:pb-4 sm:pt-6 sm:pr-14">
                <DialogTitle>
                  {active.designStyle} {active.roomType}
                </DialogTitle>
                <DialogDescription>
                  {active.budgetRange} · {summary(active)} ·{" "}
                  {active.isUnlocked ? "Unlocked" : "Locked"}
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-6 sm:px-6">
              {active.imageUrl ? (
                <div className="mx-auto mb-7 flex h-[30dvh] min-h-36 max-h-72 w-full max-w-2xl items-center justify-center">
                  <img src={active.imageUrl} alt={`${active.designStyle} ${active.roomType}`} className="block h-full w-full object-contain" />
                </div>
              ) : null}

              {active.isUnlocked ? (
                <ProductGrid products={active.products} />
              ) : (
                <div className="mx-4 mb-4 mt-4 shrink-0 space-y-4 rounded-lg border border-dashed border-border p-5 text-center sm:mx-6 sm:mb-6">
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
              </div>
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
