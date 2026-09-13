import { ExternalLink, Lock, Star } from "lucide-react";

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

export function ShoppingList({ products, unlocked, price, busy, onUnlock }: Props) {
  const total = products.reduce((sum, p) => sum + p.price, 0);
  const saved = products.reduce((sum, p) => sum + (p.listPrice - p.price), 0);

  return (
    <div className="surface-card overflow-hidden">
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

      <div className="relative">
        <ul className="divide-y divide-border">
          {products.map((product) => (
            <li key={product.asin ?? product.name} className="flex items-center justify-between gap-4 px-5 py-4">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  className="size-14 shrink-0 rounded-full border border-border bg-background object-cover"
                />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                  <ImageIcon className="size-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{product.category}</span>
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3 fill-current" />
                    {product.rating}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {product.discountLabel}
                  </Badge>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold">{currency(product.price)}</p>
                  <p className="text-xs text-muted-foreground line-through">
                    {currency(product.listPrice)}
                  </p>
                </div>
                {unlocked ? (
                  <Button asChild size="sm" variant="outline">
                    <a href={product.url} target="_blank" rel="noopener noreferrer nofollow">
                      Buy <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {!unlocked ? (
          <div className="absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-[6px]">
            <div className="mx-4 max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-sm">
              <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Lock className="size-5" />
              </span>
              <p className="mt-3 font-display text-xl">Unlock the shopping links</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Get direct Amazon links and itemised prices for every piece in this room.
              </p>
              <Button className="mt-4 w-full" onClick={onUnlock} disabled={busy}>
                {busy ? "Processing…" : `Buy from Amazon · Unlock for ${currency(price)}`}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
