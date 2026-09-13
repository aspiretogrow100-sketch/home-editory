import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — DecorAI" },
      {
        name: "description",
        content: "How DecorAI collects, uses and protects your account, design and payment data.",
      },
      { property: "og:title", content: "Privacy Policy — DecorAI" },
      { property: "og:description", content: "How DecorAI handles your personal data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl space-y-5 px-4 py-16 text-sm leading-relaxed text-muted-foreground">
      <h1 className="text-4xl text-foreground">Privacy Policy</h1>
      <p>Last updated: {new Date().getFullYear()}</p>

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
