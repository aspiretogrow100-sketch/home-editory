import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: "Refund Policy — DecorAI" },
      {
        name: "description",
        content:
          "DecorAI refund policy for the one-time $2.00 room shopping list unlock: digital content is delivered instantly and unlocks are final.",
      },
      { property: "og:title", content: "Refund Policy — DecorAI" },
      {
        property: "og:description",
        content: "Digital shopping list unlocks are delivered instantly and are non-refundable.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-16">
      <h1 className="text-4xl">Refund Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: September 2026</p>

      <div className="prose-sm mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-lg font-medium text-foreground">Digital content unlocks</h2>
          <p>
            DecorAI sells a one-time micro-payment (currently $2.00) that unlocks the complete
            Amazon shopping list and itemized purchase links for a specific generated room design.
            This is digital content that is delivered to your account immediately after a
            successful payment.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">No refunds after unlock</h2>
          <p>
            Because the shopping list is digital content delivered instantly,{" "}
            <strong className="text-foreground">
              all unlock payments are final and non-refundable
            </strong>{" "}
            once the content has been delivered to your account. By completing payment, you
            acknowledge that delivery begins immediately and you waive any right of withdrawal for
            digital content that has been fully delivered.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">Faulty or undelivered unlocks</h2>
          <p>
            If you were charged but the shopping list was not delivered — for example because of a
            technical error on our side — contact us within 7 days and we will either deliver the
            unlock or issue a full refund.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">Amazon purchases</h2>
          <p>
            Products linked from DecorAI shopping lists are sold and shipped by Amazon or its
            third-party sellers, not by DecorAI. Returns, refunds, and warranty claims for those
            products are governed by Amazon's own returns policy and must be handled through your
            Amazon account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">How to request help</h2>
          <p>
            Email us at{" "}
            <a
              href="mailto:moumunira00@gmail.com"
              className="text-primary underline underline-offset-2"
            >
              moumunira00@gmail.com
            </a>{" "}
            or call{" "}
            <a href="tel:+8801334920949" className="text-primary underline underline-offset-2">
              +880 1334-920949
            </a>{" "}
            with your payment receipt and the design you tried to unlock. We usually reply within
            two business days.
          </p>
        </section>
      </div>
    </article>
  );
}
