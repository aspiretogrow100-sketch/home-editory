import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — DecorAI" },
      {
        name: "description",
        content: "The terms that govern your use of DecorAI, including unlock payments and content rights.",
      },
      { property: "og:title", content: "Terms & Conditions — DecorAI" },
      { property: "og:description", content: "Terms governing the use of DecorAI." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-3xl space-y-5 px-4 py-16 text-sm leading-relaxed text-muted-foreground">
      <h1 className="text-4xl text-foreground">Terms &amp; Conditions</h1>

      <h2 className="pt-4 text-2xl text-foreground">Using the service</h2>
      <p>
        DecorAI generates illustrative interior design concepts. You must be able to form a binding
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
