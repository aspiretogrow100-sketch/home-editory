import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { AdSlot } from "@/components/site/AdSlot";
import { Button } from "@/components/ui/button";
import { currency } from "@/lib/decor";
import { getUnlockPrice } from "@/lib/decor.functions";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Pay Only To Unlock Shopping Links | Home Editory" },
      {
        name: "description",
        content:
          "Generating room designs is free on Home Editory. Pay a small one-time fee only when you unlock a room's Amazon shopping links.",
      },
      { property: "og:title", content: "Home Editory Pricing" },
      {
        property: "og:description",
        content: "Free AI room designs. Small one-time fee to unlock shopping links.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const priceQuery = useQuery({ queryKey: ["unlock-price"], queryFn: () => getUnlockPrice() });
  const price = priceQuery.data?.price ?? 2;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl">Simple, pay-per-room pricing</h1>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Render as many concepts as you like. You only pay when you want the shopping links.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="surface-card p-7">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Design</p>
          <p className="mt-2 font-display text-5xl">Free</p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Unlimited room concepts",
              "All five design styles",
              "Budget and discount filters",
              "Saved to your gallery",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 text-accent" /> {item}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-7 w-full" variant="outline">
            <Link to="/">Start designing</Link>
          </Button>
        </div>

        <div className="surface-card border-primary/40 p-7">
          <p className="text-sm uppercase tracking-widest text-primary">Unlock</p>
          <p className="mt-2 font-display text-5xl">{currency(price)}</p>
          <p className="text-sm text-muted-foreground">per room, one-time</p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Direct Amazon product links",
              "Itemised prices and savings",
              "Discount-filtered picks",
              "Permanent access to that list",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="size-4 text-accent" /> {item}
              </li>
            ))}
          </ul>
          <Button asChild className="mt-7 w-full">
            <Link to="/">Generate a room</Link>
          </Button>
        </div>
      </div>

      <div className="mt-12">
        <AdSlot />
      </div>
    </div>
  );
}
