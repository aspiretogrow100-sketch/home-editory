import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { currency } from "@/lib/decor";
import { getUnlockPrice } from "@/lib/decor.functions";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Interior AI Designer" },
      {
        name: "description",
        content: "The terms that govern your use of Interior AI Designer, including unlock payments and content rights.",
      },
      { property: "og:title", content: "Terms & Conditions — Interior AI Designer" },
      { property: "og:description", content: "Terms governing the use of Interior AI Designer." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const priceQuery = useQuery({ queryKey: ["unlock-price"], queryFn: () => getUnlockPrice() });
  const price = currency(priceQuery.data?.price ?? 2);

  return (
    <article className="mx-auto w-full max-w-3xl space-y-5 px-4 py-16 text-sm leading-relaxed text-muted-foreground">
      <h1 className="text-4xl text-foreground">Terms &amp; Conditions</h1>
      <p>Last updated: September 2026</p>

      <h2 className="pt-4 text-2xl text-foreground">Who we are</h2>
      <p>
        Interior AI Designer is operated by Nahidul, Dhaka, Bangladesh. You can reach us at{" "}
        <a href="mailto:moumunira00@gmail.com" className="text-primary underline underline-offset-2">
          moumunira00@gmail.com
        </a>{" "}
        or{" "}
        <a href="tel:+8801334920949" className="text-primary underline underline-offset-2">
          +880 1334-920949
        </a>
        .
      </p>

      <h2 className="pt-4 text-2xl text-foreground">What we sell</h2>
      <p>
        Interior AI Designer generates AI interior design concepts for a room you describe. A one-time payment of{" "}
        {price} USD unlocks the full itemized shopping list and product links for that design. There is
        no subscription and no recurring charge.
      </p>

      <h2 className="pt-4 text-2xl text-foreground">Merchant of record</h2>
      <p>
        Payments are processed by Paddle.com Market Ltd, which acts as the merchant of record for all
        orders. Paddle handles billing, tax and payment support, and will appear on your bank or card
        statement.
      </p>


      <h2 className="pt-4 text-2xl text-foreground">Using the service</h2>
      <p>
        Interior AI Designer generates illustrative interior design concepts. You must be able to form a binding
        contract to use paid features, and you agree not to misuse or attempt to disrupt the service.
      </p>

      <h2 className="pt-4 text-2xl text-foreground">Payments</h2>
      <p>
        Unlocking a room's shopping list is a one-time charge shown before you confirm. Because
        unlocked links are delivered immediately, unlock payments are non-refundable except where
        required by law.
      </p>

      <h2 className="pt-4 text-2xl text-foreground">Generated content</h2>
      <p>
        You may use the images you generate for personal planning and inspiration. Generated images
        are produced by an AI model and may contain inaccuracies or impossible details.
      </p>

      <h2 className="pt-4 text-2xl text-foreground">Third-party products</h2>
      <p>
        Product names, prices and availability are indicative and provided for convenience. Amazon
        is the seller of any product you purchase and its terms apply to that purchase.
      </p>

      <h2 className="pt-4 text-2xl text-foreground">Changes</h2>
      <p>
        We may update these terms and the unlock price at any time. Continued use after a change
        constitutes acceptance.
      </p>
    </article>
  );
}
