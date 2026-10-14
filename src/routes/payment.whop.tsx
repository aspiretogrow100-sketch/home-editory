import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { confirmWhopPayment } from "@/lib/whop.functions";

type Search = {
  gen?: string | undefined;
  payment?: string | undefined;
  payment_id?: string | undefined;
  status?: string | undefined;
};

export const Route = createFileRoute("/payment/whop")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    gen: typeof s["gen"] === "string" ? s["gen"] : undefined,
    payment: typeof s["payment"] === "string" ? s["payment"] : undefined,
    payment_id: typeof s["payment_id"] === "string" ? s["payment_id"] : undefined,
    status: typeof s["status"] === "string" ? s["status"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Confirming payment — Interior AI Designer" },
      { name: "description", content: "Confirming your Whop payment and unlocking your shopping links." },
      { property: "og:title", content: "Confirming payment — Interior AI Designer" },
      { property: "og:description", content: "Confirming your Whop payment and unlocking your shopping links." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WhopReturn,
});

function WhopReturn() {
  const search = Route.useSearch();
  const { user, loading } = useAuth() as { user: unknown; loading?: boolean };
  const confirm = useServerFn(confirmWhopPayment);
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("Confirming your payment…");
  const started = useRef(false);

  useEffect(() => {
    if (started.current || loading || !user) return;
    const paymentId = search.payment ?? search.payment_id;
    if (!search.gen) {
      setState("error");
      setMessage("Payment reference missing. If you were charged, contact us with your Whop receipt.");
      return;
    }
    started.current = true;
    // Always ask Whop directly — the URL status is not reliable (e.g. coupon checkouts).
    const declined = search.status === "failed" || search.status === "canceled";
    confirm({ data: { paymentId, generationId: search.gen } })
      .then(() => {
        setState("done");
        setMessage("Payment received — your Amazon links are unlocked.");
      })
      .catch((e: Error) => {
        setState("error");
        setMessage(declined ? "The payment was not completed. You have not been charged." : e.message);
      });
  }, [user, loading, search, confirm]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl">
        {state === "done" ? "You're all set" : state === "error" ? "Payment issue" : "One moment"}
      </h1>
      <p className="mt-3 text-muted-foreground">{!user && !loading ? "Please sign in to finish unlocking." : message}</p>
      {state !== "working" ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {state === "done" ? (
            <Button asChild>
              <Link to="/unlocked" search={{ gen: search.gen }}>View my unlocked design</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link to="/unlocked" search={{}}>All unlocked</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/gallery">Gallery</Link>
          </Button>
        </div>
      ) : null}
    </main>
  );
}
