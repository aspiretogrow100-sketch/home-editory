import { ExternalLink, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currency, type AmazonProduct } from "@/lib/decor";

export function ProductGrid({ products, unlocked = true }: { products: AmazonProduct[]; unlocked?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4" aria-label="Room products">
      {products.map((product) => (
        <li key={product.asin ?? product.name} className="flex min-w-0 flex-col">
          <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-background">
            {product.image ? (
              <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-contain" />
            ) : (
              <ImageIcon className="size-8 text-muted-foreground" />
            )}
          </div>
          <p className="mt-3 line-clamp-2 min-h-10 text-sm font-medium leading-5" title={product.name}>{product.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{product.category}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-semibold text-primary">{currency(product.price)}</span>
            {product.listPrice > product.price ? (
              <span className="text-xs text-muted-foreground line-through">{currency(product.listPrice)}</span>
            ) : null}
          </div>
          {unlocked ? (
            <Button asChild size="sm" variant="outline" className="mt-3 w-full">
              <a href={product.url} target="_blank" rel="noopener noreferrer nofollow">
                Buy <ExternalLink className="size-3.5" />
              </a>
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}