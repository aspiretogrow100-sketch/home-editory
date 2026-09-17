import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- shared types ----------

export type PaddleCheckoutInfo = {
  enabled: boolean;
  environment: "sandbox" | "production";
  clientToken: string | null;
  priceId: string | null;
};

export type PaddleSettingsView = {
  environment: "sandbox" | "production";
  clientToken: string | null;
  priceId: string | null;
  apiKeyHint: string | null;
  webhookSecretHint: string | null;
  webhookUrl: string;
};

function hint(value: string | null): string | null {
  if (!value) return null;
  return `••••••••${value.slice(-4)}`;
}

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data: isAdmin } = await (context.supabase.rpc as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: boolean | null }>)("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Admins only.");
}

/**
 * Public: only the browser-safe client token and price id.
 * The Paddle client token is a publishable value, like the Stripe publishable key.
 */
export const getPaddleCheckoutInfo = createServerFn({ method: "GET" }).handler(
  async (): Promise<PaddleCheckoutInfo> => {
    const { loadPaddleConfig } = await import("./paddle.server");
    const cfg = await loadPaddleConfig();
    return {
      enabled: Boolean(cfg.clientToken && cfg.priceId && cfg.apiKey),
      environment: cfg.environment,
      clientToken: cfg.clientToken,
      priceId: cfg.priceId,
    };
  },
);

export const getPaddleSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PaddleSettingsView> => {
    await assertAdmin(context as never);
    const { loadPaddleConfig } = await import("./paddle.server");
    const cfg = await loadPaddleConfig();
    const host = getRequestHeader("host") ?? "";
    const proto = host.startsWith("localhost") ? "http" : "https";
    const origin = host ? `${proto}://${host}` : "";
    return {
      environment: cfg.environment,
      clientToken: cfg.clientToken,
      priceId: cfg.priceId,
      apiKeyHint: hint(cfg.apiKey),
      webhookSecretHint: hint(cfg.webhookSecret),
      webhookUrl: `${origin}/api/public/paddle-webhook`,
    };
  });

export const savePaddleSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      environment?: string;
      clientToken?: string;
      priceId?: string;
      apiKey?: string;
      webhookSecret?: string;
    }) => {
      const clean = (value?: string) => {
        const s = String(value ?? "").trim();
        return s ? s.slice(0, 400) : null; // empty = keep the saved value
      };
      return {
        environment: input?.environment === "production" ? "production" : "sandbox",
        clientToken: clean(input?.clientToken),
        priceId: clean(input?.priceId),
        apiKey: clean(input?.apiKey),
        webhookSecret: clean(input?.webhookSecret),
      };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const patch: Record<string, unknown> = { id: 1, environment: data.environment };
    if (data.clientToken) patch["client_token"] = data.clientToken;
    if (data.priceId) patch["price_id"] = data.priceId;
    if (data.apiKey) patch["api_key"] = data.apiKey;
    if (data.webhookSecret) patch["webhook_secret"] = data.webhookSecret;

    const { error } = await supabaseAdmin
      .from("paddle_settings")
      .upsert(patch as never, { onConflict: "id" });

    if (error) {
      console.error("[paddle] settings save failed", error.message);
      throw new Error("Could not save the Paddle settings.");
    }
    return { saved: true };
  });

/** Called after Paddle's overlay reports a completed checkout; verifies with Paddle before unlocking. */
export const confirmPaddlePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { generationId: string; transactionId: string }) => {
    const generationId = String(input?.generationId ?? "").trim();
    const transactionId = String(input?.transactionId ?? "").trim();
    if (!generationId || generationId === "null" || generationId === "undefined") {
      throw new Error("Missing design reference.");
    }
    if (!transactionId || transactionId === "null" || transactionId === "undefined") {
      throw new Error("Missing payment reference.");
    }
    return {
      generationId,
      transactionId,
    };
  })
  .handler(async ({ data, context }) => {
    const {
      loadPaddleConfig,
      fetchPaddleTransaction,
      isPaidStatus,
      applyPaddleUnlock,
      unlockPriceFallback,
    } = await import("./paddle.server");

    const cfg = await loadPaddleConfig();
    if (!cfg.apiKey) throw new Error("Payments are not configured yet.");

    let transaction = await fetchPaddleTransaction(data.transactionId, cfg);
    // Paddle can take a moment to settle; give it two more looks before giving up.
    for (let attempt = 0; attempt < 2 && !isPaidStatus(transaction.status); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      transaction = await fetchPaddleTransaction(data.transactionId, cfg);
    }
    if (!isPaidStatus(transaction.status)) {
      throw new Error("This payment is not complete yet. Please try again in a moment.");
    }

    const paidFor = String(transaction.customData?.["generation_id"] ?? "");
    if (paidFor && paidFor !== data.generationId) {
      console.warn("[paddle] ignored stale checkout confirmation", {
        requestedGenerationId: data.generationId,
        paidGenerationId: paidFor,
        transactionId: transaction.id,
      });
      return { unlocked: false, amount: 0, reason: "design_mismatch" as const };
    }

    const amount = transaction.total ?? (await unlockPriceFallback());
    await applyPaddleUnlock({
      generationId: data.generationId,
      transactionId: transaction.id,
      userId: context.userId,
      amount,
    });

    return { unlocked: true, amount };
  });
