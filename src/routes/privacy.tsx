import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Interior AI Designer" },
      {
        name: "description",
        content: "How Interior AI Designer collects, uses and protects your account, design and payment data.",
      },
      { property: "og:title", content: "Privacy Policy — Interior AI Designer" },
      { property: "og:description", content: "How Interior AI Designer handles your personal data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl space-y-5 px-4 py-16 text-sm leading-relaxed text-muted-foreground">
      <h1 className="text-4xl text-foreground">Privacy Policy</h1>
      <p>Last updated: September 2026</p>

      <h2 className="pt-4 text-2xl text-foreground">Who is responsible</h2>
      <p>
        Interior AI Designer is operated by Nahidul, Dhaka, Bangladesh. For any privacy question or data deletion
        request, email{" "}
        <a href="mailto:moumunira00@gmail.com" className="text-primary underline underline-offset-2">
          moumunira00@gmail.com
        </a>{" "}
        or call{" "}
        <a href="tel:+8801334920949" className="text-primary underline underline-offset-2">
          +880 1334-920949
        </a>
        .
      </p>

      <h2 className="pt-4 text-2xl text-foreground">Payment data</h2>
      <p>
        Payments are handled by Paddle.com Market Ltd, our merchant of record. Card details are
        entered on Paddle's secure checkout and are never stored by Interior AI Designer. We only receive a record
        that a payment succeeded.
      </p>


      <h2 className="pt-4 text-2xl text-foreground">Information we collect</h2>
      <p>
        When you create an account we store your email address and a display name. When you generate
        a design we store your selections, the generated image and the matching product list.
        Payments made to unlock a shopping list are recorded as a transaction record.
      </p>

      <h2 className="pt-4 text-2xl text-foreground">How we use it</h2>
      <p>
        We use this data to show you your gallery, to keep unlocked lists available to you, and to
        operate and improve the service. We do not sell your personal data.
      </p>

      <h2 className="pt-4 text-2xl text-foreground">Advertising</h2>
      <p>
        This site displays advertising, including Google AdSense. Third-party vendors, including
        Google, may use cookies to serve ads based on your prior visits to this or other websites.
        You can opt out of personalised advertising in your Google Ads Settings.
      </p>

      <h2 className="pt-4 text-2xl text-foreground">Affiliate links</h2>
      <p>
        Unlocked product lists contain Amazon affiliate links. Clicking them may share standard
        referral information with Amazon.
      </p>

      <h2 className="pt-4 text-2xl text-foreground">Your choices</h2>
      <p>
        You can request deletion of your account and associated designs at any time through our
        contact page.
      </p>
    </article>
  );
}
