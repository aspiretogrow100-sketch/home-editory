import { createFileRoute } from "@tanstack/react-router";

type PaddleEvent = {
  event_type?: string;
  data?: {
    id?: string;
    status?: string;
    custom_data?: Record<string, unknown> | null;
    details?: { totals?: { total?: string } };
  };
};

export const Route = createFileRoute("/api/public/paddle-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();

        const { loadPaddleConfig, verifyPaddleSignature, isPaidStatus, applyPaddleUnlock, unlockPriceFallback } =
          await import("@/lib/paddle.server");

        const cfg = await loadPaddleConfig();
        if (!cfg.webhookSecret) {
          return new Response("Webhook not configured", { status: 503 });
        }

        const valid = await verifyPaddleSignature(
          raw,
          request.headers.get("paddle-signature"),
          cfg.webhookSecret,
        );
        if (!valid) return new Response("Invalid signature", { status: 401 });

        let event: PaddleEvent;
        try {
          event = JSON.parse(raw) as PaddleEvent;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const type = event.event_type ?? "";
        const data = event.data ?? {};
        const generationId = String(data.custom_data?.["generation_id"] ?? "");
        const userId = String(data.custom_data?.["user_id"] ?? "") || null;

        const paid =
          (type === "transaction.completed" || type === "transaction.paid") &&
          isPaidStatus(String(data.status ?? "completed"));

        if (paid && generationId) {
          const totalMinor = Number(data.details?.totals?.total ?? NaN);
          const amount = Number.isFinite(totalMinor) ? totalMinor / 100 : await unlockPriceFallback();
          try {
            await applyPaddleUnlock({
              generationId,
              transactionId: String(data.id ?? ""),
              userId,
              amount,
            });
          } catch (error) {
            console.error("[paddle] webhook unlock failed", error);
          }
        }

        return new Response("ok");
      },
    },
  },
});
