import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const WHOP_API = "https://api.whop.com/api/v1";

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data } = await (context.supabase.rpc as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: boolean | null }>)("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Admins only.");
}

async function loadWhop() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("whop_settings")
    .select("enabled, api_key, plan_id")
    .eq("id", 1)
    .maybeSingle();
  const apiKey = data?.api_key?.trim() || null;
  const planId = data?.plan_id?.trim() || null;
  return { enabled: Boolean(data?.enabled && apiKey && planId), apiKey, planId, toggled: Boolean(data?.enabled) };
}

function origin() {
  const host = getRequestHeader("host") ?? "";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

/** Public: only tells the browser whether Whop checkout is available. */
export const getWhopCheckoutInfo = createServerFn({ method: "GET" }).handler(async () => {
  const cfg = await loadWhop();
  return { enabled: cfg.enabled };
});

export const getWhopSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const cfg = await loadWhop();
    return {
      enabled: cfg.toggled,
      planId: cfg.planId,
      apiKeyHint: cfg.apiKey ? `••••••••${cfg.apiKey.slice(-4)}` : null,
    };
  });

export const saveWhopSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { enabled?: boolean; planId?: string; apiKey?: string }) => ({
    enabled: Boolean(input?.enabled),
    planId: String(input?.planId ?? "").trim().slice(0, 200) || null,
    apiKey: String(input?.apiKey ?? "").trim().slice(0, 400) || null,
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { id: 1, enabled: data.enabled };
    if (data.planId) patch["plan_id"] = data.planId;
    if (data.apiKey) patch["api_key"] = data.apiKey;
    const { error } = await supabaseAdmin.from("whop_settings").upsert(patch as never, { onConflict: "id" });
    if (error) throw new Error("Could not save the Whop settings.");
    return { saved: true };
  });

/** Creates a Whop checkout tied to one design and returns the hosted checkout URL. */
export const createWhopCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { generationId: string }) => {
    const generationId = String(input?.generationId ?? "").trim();
    if (!generationId) throw new Error("Missing design reference.");
    return { generationId };
  })
  .handler(async ({ data, context }) => {
    const cfg = await loadWhop();
    if (!cfg.enabled || !cfg.apiKey) throw new Error("Whop checkout is not configured yet.");
    const res = await fetch(`${WHOP_API}/checkout_configurations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_id: cfg.planId,
        mode: "payment",
        metadata: { generation_id: data.generationId, user_id: context.userId },
        redirect_url: `${origin()}/payment/whop?gen=${encodeURIComponent(data.generationId)}`,
      }),
    });
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    const url = body?.["purchase_url"];
    if (!res.ok || typeof url !== "string") {
      console.error("[whop] checkout create failed", res.status, JSON.stringify(body)?.slice(0, 500));
      throw new Error("Could not start Whop checkout. Please try again.");
    }
    return { url };
  });

/** Verifies a Whop payment with Whop's API before unlocking the design. */
export const confirmWhopPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { paymentId: string; generationId: string }) => {
    const paymentId = String(input?.paymentId ?? "").trim();
    const generationId = String(input?.generationId ?? "").trim();
    if (!paymentId || !generationId) throw new Error("Missing payment reference.");
    return { paymentId, generationId };
  })
  .handler(async ({ data, context }) => {
    const cfg = await loadWhop();
    if (!cfg.apiKey) throw new Error("Whop is not configured yet.");

    let payment: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await fetch(`${WHOP_API}/payments/${encodeURIComponent(data.paymentId)}`, {
        headers: { Authorization: `Bearer ${cfg.apiKey}` },
      });
      payment = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (res.ok && payment && isPaid(payment)) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    if (!payment || !isPaid(payment)) {
      throw new Error("This payment is not complete yet. Please try again in a moment.");
    }

    const meta = (payment["metadata"] as Record<string, unknown> | null) ?? {};
    const paidFor = String(meta["generation_id"] ?? "");
    if (paidFor !== data.generationId) {
      throw new Error("This payment does not belong to this design.");
    }

    const { applyPaddleUnlock, unlockPriceFallback } = await import("./paddle.server");
    const total = Number(payment["total"] ?? payment["usd_total"]);
    const amount = Number.isFinite(total) && total > 0 ? total : await unlockPriceFallback();
    await applyPaddleUnlock({
      generationId: data.generationId,
      transactionId: String(payment["id"] ?? data.paymentId),
      userId: context.userId,
      amount,
    });
    return { unlocked: true };
  });

function isPaid(p: Record<string, unknown>) {
  return p["status"] === "paid" || p["substatus"] === "succeeded" || Boolean(p["paid_at"]);
}
