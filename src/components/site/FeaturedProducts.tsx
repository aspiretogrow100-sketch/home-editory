import { ExternalLink, Image as ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AmazonProduct } from "@/lib/decor";

/**
 * Sponsored partner products placed in a design (e.g. the TV mount in the room).
 * Always visible and always clickable — never behind the shopping-list unlock.
 */
export function FeaturedProducts({ products }: { products: AmazonProduct[] }) {
  if (!products.length) return null;
  return (
    <section aria-label="Featured in this design" className="space-y-3">
      {products.map((product) => (
        <div
          key={product.asin ?? product.url}
          className="flex gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4"
        >
          <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-contain"
              />
            ) : (
              <ImageIcon className="size-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">Featured partner</Badge>
              {product.partner ? (
                <span className="text-xs font-medium text-muted-foreground">{product.partner}</span>
              ) : null}
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-5" title={product.name}>
              {product.name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              As placed in this design · sponsored
            </p>
            <Button asChild size="sm" className="mt-3 w-full sm:w-auto sm:self-start">
              <a href={product.url} target="_blank" rel="noopener noreferrer sponsored nofollow">
                See price on Amazon <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}
