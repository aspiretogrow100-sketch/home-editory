import { Lock } from "lucide-react";
import { FeaturedProducts } from "@/components/site/FeaturedProducts";
import { ProductGrid } from "@/components/site/ProductGrid";
import { splitFeatured } from "@/lib/partners";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { currency, type AmazonProduct } from "@/lib/decor";

type Props = {
  products: AmazonProduct[];
  unlocked: boolean;
  price: number;
  busy?: boolean;
  onUnlock: () => void;
};

export function ShoppingList({ products: allProducts, unlocked, price, busy, onUnlock }: Props) {
  const { featured, regular: products } = splitFeatured(allProducts);
  const total = products.reduce((sum, p) => sum + p.price, 0);
  const saved = products.reduce((sum, p) => sum + (p.listPrice - p.price), 0);

  return (
    <div className="overflow-hidden">
      {featured.length ? (
        <div className="px-4 pb-4">
          <FeaturedProducts products={featured} />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 className="text-xl">Amazon shopping list</h3>
          <p className="text-sm text-muted-foreground">
            {products.length} items · about {currency(total)} · you save {currency(saved)}
          </p>
        </div>
        {unlocked ? (
          <Badge className="bg-accent text-accent-foreground">Unlocked</Badge>
        ) : (
          <Badge variant="outline">Locked</Badge>
        )}
      </div>

      <div>
        <div
          className={
            unlocked
              ? "px-4 py-5"
              : "pointer-events-none select-none px-4 py-5 opacity-60 blur-[5px]"
          }
          aria-hidden={unlocked ? undefined : true}
        >
          <ProductGrid products={products} unlocked={unlocked} />
        </div>

        {!unlocked ? (
          <div className="border-t border-border px-5 py-5 text-center">
            <div className="mx-auto max-w-sm rounded-xl border border-primary/25 bg-primary/5 p-5">
              <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Lock className="size-5" />
              </span>
              <p className="mt-3 font-display text-xl">Unlock the shopping links</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Get direct Amazon links and itemised prices for every piece in this room.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-center">
                <div>
                  <p className="text-sm font-semibold">{products.length}</p>
                  <p className="text-[11px] text-muted-foreground">{products.length === 1 ? "item" : "items"}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{currency(total)}</p>
                  <p className="text-[11px] text-muted-foreground">total</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">{currency(saved)}</p>
                  <p className="text-[11px] text-muted-foreground">you save</p>
                </div>
              </div>
              <Button className="mt-4 w-full" onClick={onUnlock} disabled={busy}>
                {busy ? "Processing…" : `Unlock for ${currency(price)}`}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
