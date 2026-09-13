// Paddle helpers. Server-only: the API key and webhook secret never reach the browser.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PaddleEnvironment = "sandbox" | "production";

export type PaddleConfig = {
  environment: PaddleEnvironment;
  clientToken: string | null;
  apiKey: string | null;
  priceId: string | null;
  webhookSecret: string | null;
};

export const EMPTY_PADDLE_CONFIG: PaddleConfig = {
  environment: "sandbox",
  clientToken: null,
  apiKey: null,
  priceId: null,
  webhookSecret: null,
};

function clean(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

export async function loadPaddleConfig(): Promise<PaddleConfig> {
  const { data, error } = await supabaseAdmin
    .from("paddle_settings")
    .select("environment, client_token, api_key, price_id, webhook_secret")
    .eq("id", 1)
    .maybeSingle();

  if (error) console.error("[paddle] settings read failed", error.message);
  if (!data) return { ...EMPTY_PADDLE_CONFIG };

  return {
    environment: data.environment === "production" ? "production" : "sandbox",
    clientToken: clean(data.client_token),
    apiKey: clean(data.api_key),
    priceId: clean(data.price_id),
    webhookSecret: clean(data.webhook_secret),
  };
}

export function paddleApiBase(environment: PaddleEnvironment): string {
  return environment === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
}

type PaddleTransaction = {
  id: string;
  status: string;
  customData: Record<string, unknown> | null;
  total: number | null;
  currencyCode: string | null;
};

/** Reads a transaction straight from Paddle so the unlock never trusts the browser. */
export async function fetchPaddleTransaction(
  transactionId: string,
  cfg: PaddleConfig,
): Promise<PaddleTransaction> {
  if (!cfg.apiKey) throw new Error("Paddle is not configured yet.");

  const response = await fetch(
    `${paddleApiBase(cfg.environment)}/transactions/${encodeURIComponent(transactionId)}`,
    { headers: { Authorization: `Bearer ${cfg.apiKey}`, Accept: "application/json" } },
  );

  const body = (await response.json().catch(() => null)) as
    | { data?: Record<string, unknown>; error?: { detail?: string } }
    | null;

  if (!response.ok || !body?.data) {
    const detail = body?.error?.detail ?? `Paddle returned ${response.status}.`;
    console.error("[paddle] transaction lookup failed", detail);
    throw new Error("We could not verify this payment with Paddle.");
  }

  const data = body.data;
  const details = data["details"] as { totals?: { total?: string; currency_code?: string } } | undefined;
  const total = details?.totals?.total ? Number(details.totals.total) / 100 : null;

  return {
    id: String(data["id"] ?? transactionId),
    status: String(data["status"] ?? "unknown"),
    customData: (data["custom_data"] as Record<string, unknown> | null) ?? null,
    total: Number.isFinite(total) ? total : null,
    currencyCode: details?.totals?.currency_code ?? null,
  };
}

export function isPaidStatus(status: string): boolean {
  return status === "completed" || status === "paid";
}

/** Paddle-Signature: ts=<unix>;h1=<hmac sha256 of `${ts}:${rawBody}`> */
export async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const parts = new Map<string, string>();
  for (const chunk of signatureHeader.split(";")) {
    const [key, value] = chunk.split("=");
    if (key && value) parts.set(key.trim(), value.trim());
  }
  const ts = parts.get("ts");
  const h1 = parts.get("h1");
  if (!ts || !h1) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${ts}:${rawBody}`));
  const expected = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== h1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ h1.charCodeAt(i);
  return diff === 0;
}

/** Marks a design (and any saved copies) as unlocked and records the payment once. */
export async function applyPaddleUnlock(input: {
  generationId: string;
  transactionId: string;
  userId: string | null;
  amount: number;
}): Promise<{ unlocked: boolean }> {
  const { data: generation } = await supabaseAdmin
    .from("generations")
    .select("id, user_id, is_unlocked")
    .eq("id", input.generationId)
    .maybeSingle();

  if (!generation) throw new Error("This design could not be found.");

  const { data: existing } = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("generation_id", generation.id)
    .eq("payment_status", "completed")
    .limit(1);

  if (!existing?.length) {
    await supabaseAdmin.from("transactions").insert({
      user_id: input.userId ?? generation.user_id,
      generation_id: generation.id,
      amount: input.amount,
      payment_status: "completed",
    });
  }

  await supabaseAdmin.from("generations").update({ is_unlocked: true }).eq("id", generation.id);
  await supabaseAdmin
    .from("saved_rooms")
    .update({ is_unlocked: true })
    .eq("generation_id", generation.id);

  return { unlocked: true };
}

export async function unlockPriceFallback(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", "unlock_price")
    .maybeSingle();
  const amount = Number(data?.setting_value ?? "2.00");
  return Number.isFinite(amount) ? amount : 2;
}
