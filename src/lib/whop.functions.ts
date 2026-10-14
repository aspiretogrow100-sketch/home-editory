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

/**
 * Verifies a Whop payment with Whop's API before unlocking the design.
 * The payment ID from the return URL is optional: Whop does not always append it
 * (e.g. 100% coupon checkouts), so we fall back to finding a paid payment whose
 * metadata matches this design and this user.
 */
export const confirmWhopPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { paymentId?: string | undefined; generationId: string }) => {
    const paymentId = String(input?.paymentId ?? "").trim().slice(0, 100);
    const generationId = String(input?.generationId ?? "").trim();
    if (!generationId) throw new Error("Missing design reference.");
    return { paymentId, generationId };
  })
  .handler(async ({ data, context }) => {
    const cfg = await loadWhop();
    if (!cfg.apiKey) throw new Error("Whop is not configured yet.");
    const headers = { Authorization: `Bearer ${cfg.apiKey}` };

    const belongs = (p: Record<string, unknown>) => {
      const meta = (p["metadata"] as Record<string, unknown> | null) ?? {};
      return (
        String(meta["generation_id"] ?? "") === data.generationId &&
        String(meta["user_id"] ?? "") === context.userId
      );
    };

    let payment: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 3 && !payment; attempt += 1) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
      if (data.paymentId) {
        const res = await fetch(`${WHOP_API}/payments/${encodeURIComponent(data.paymentId)}`, { headers });
        const p = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        if (res.ok && p && isPaid(p)) payment = p;
      }
      if (!payment) {
        const res = await fetch(`${WHOP_API}/payments?first=25`, { headers });
        const body = (await res.json().catch(() => null)) as { data?: Record<string, unknown>[] } | null;
        if (!res.ok) console.error("[whop] list payments failed", res.status, JSON.stringify(body)?.slice(0, 300));
        payment = body?.data?.find((p) => isPaid(p) && belongs(p)) ?? null;
      }
    }
    if (!payment) {
      throw new Error("This payment is not complete yet. Please try again in a moment.");
    }
    if (!belongs(payment)) {
      throw new Error("This payment does not belong to this design.");
    }

    const { applyPaddleUnlock } = await import("./paddle.server");
    await applyPaddleUnlock({
      generationId: data.generationId,
      transactionId: String(payment["id"] ?? data.paymentId),
      userId: context.userId,
      amount: paidAmount(payment),
    });
    return { unlocked: true };
  });

/** Only a settled payment counts — "open/blocked" payments also carry paid_at. */
function isPaid(p: Record<string, unknown>) {
  return p["status"] === "paid" && p["substatus"] !== "blocked";
}

/** Whop returns totals as { amount: "5.00" }; coupons can make it 0. */
function paidAmount(p: Record<string, unknown>) {
  const raw = p["usd_total"] ?? p["total"];
  const value = typeof raw === "object" && raw ? (raw as Record<string, unknown>)["amount"] : raw;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
