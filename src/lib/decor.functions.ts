import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  buildProductList,
  buildPrompt,
  type AmazonProduct,
  type DesignSelection,
} from "./decor";

type AnyClient = SupabaseClient<Database>;

function makeFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function publicClient(): AnyClient {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: makeFetch(key) },
  });
}

function tokenClient(token: string): AnyClient {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: makeFetch(key), headers: { Authorization: `Bearer ${token}` } },
  });
}

function bearerToken(): string | null {
  const header = getRequestHeader("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  return token.split(".").length === 3 ? token : null;
}

function gatewayUrl(): string {
  const base = (process.env["AGW_URL"] ?? "https://ai.gateway.lovable.dev").replace(/\/$/, "");
  return base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
}

async function generateRoomImage(prompt: string): Promise<string> {
  const response = await fetch(gatewayUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("[decorai] image generation failed", response.status, detail);
    if (response.status === 429) throw new Error("Too many requests right now. Try again in a moment.");
    if (response.status === 402) throw new Error("Image credits are exhausted. Please try again later.");
    throw new Error("The design engine could not create this room. Please try again.");
  }

  const payload = (await response.json()) as {
    choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
  };
  const dataUrl = payload.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl) throw new Error("The design engine returned no image. Please try again.");
  return dataUrl;
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const [meta, base64] = dataUrl.split(",");
  const contentType = meta?.match(/data:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
}

function validateSelection(input: DesignSelection): DesignSelection {
  if (!input?.roomType || !input?.designStyle || !input?.budgetRange) {
    throw new Error("Please complete every step before generating a design.");
  }
  const sqft = Number(input.squareFeet);
  const itemCount = Number(input.itemCount);
  const budgetAmount = Number(input.budgetAmount);
  const discountPercent = Number(input.discountPercent);
  return {
    roomType: String(input.roomType).slice(0, 60),
    roomSize: input.roomSize ? String(input.roomSize).slice(0, 30) : null,
    itemDensity: input.itemDensity ? String(input.itemDensity).slice(0, 40) : null,
    itemCount:
      Number.isFinite(itemCount) && itemCount > 0 ? Math.min(12, Math.max(2, Math.round(itemCount))) : null,
    squareFeet: Number.isFinite(sqft) && sqft > 0 ? Math.min(Math.round(sqft), 100000) : null,
    designStyle: String(input.designStyle).slice(0, 60),
    budgetRange: String(input.budgetRange).slice(0, 40),
    budgetAmount: Number.isFinite(budgetAmount) && budgetAmount > 0 ? budgetAmount : null,
    discountFilter: input.discountFilter ? String(input.discountFilter).slice(0, 40) : null,
    discountPercent:
      Number.isFinite(discountPercent) && discountPercent > 0 ? discountPercent : null,
  };
}

export type DesignOption = {
  id: string;
  kind: string;
  label: string;
  hint: string | null;
  amount: number | null;
  sortOrder: number;
  isActive: boolean;
};

function mapOption(row: {
  id: string;
  step_name: string;
  label: string;
  description: string | null;
  amount: number | null;
  sort_order: number;
  is_active: boolean;
}): DesignOption {
  return {
    id: row.id,
    kind: row.step_name,
    label: row.label,
    hint: row.description,
    amount: row.amount === null ? null : Number(row.amount),
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export const listDesignOptions = createServerFn({ method: "GET" }).handler(
  async (): Promise<DesignOption[]> => {
    const { data } = await publicClient()
      .from("wizard_options")
      .select("id, step_name, label, description, amount, sort_order, is_active")
      .eq("is_active", true)
      .order("step_name")
      .order("sort_order");
    return (data ?? []).map(mapOption);
  },
);

export const listAllDesignOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DesignOption[]> => {
    const { data } = await context.supabase
      .from("wizard_options")
      .select("id, step_name, label, description, amount, sort_order, is_active")
      .order("step_name")
      .order("sort_order");
    return (data ?? []).map(mapOption);
  });

const KINDS = [
  "room_type",
  "size",
  "item_density",
  "style",
  "budget_or_color",
  "color_palette",
  "deal_preference",
];

export const saveDesignOption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | null;
      kind: string;
      label: string;
      hint?: string | null;
      amount?: number | null;
      sortOrder?: number | null;
      isActive?: boolean;
    }) => {
      if (!KINDS.includes(input?.kind)) throw new Error("Unknown option type.");
      const label = String(input?.label ?? "").trim();
      if (!label) throw new Error("Please enter a name for this option.");
      const amount = Number(input?.amount);
      return {
        id: input.id ?? null,
        kind: input.kind,
        label: label.slice(0, 60),
        hint: input.hint ? String(input.hint).slice(0, 120) : null,
        amount: Number.isFinite(amount) && amount > 0 ? amount : null,
        sortOrder: Number(input.sortOrder) || 0,
        isActive: input.isActive !== false,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only.");

    const row = {
      step_name: data.kind,
      label: data.label,
      description: data.hint,
      amount: data.amount,
      sort_order: data.sortOrder,
      is_active: data.isActive,
    };

    const query = data.id
      ? supabase.from("wizard_options").update(row).eq("id", data.id)
      : supabase.from("wizard_options").insert(row);
    const { error } = await query;
    if (error) throw new Error("Could not save this option.");
    return { saved: true };
  });

export const deleteDesignOption = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Missing option.");
    return { id: String(input.id) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only.");
    const { error } = await supabase.from("wizard_options").delete().eq("id", data.id);
    if (error) throw new Error("Could not delete this option.");
    return { deleted: true };
  });


export type GenerationResult = {
  generationId: string | null;
  imageUrl: string;
  products: AmazonProduct[];
  productsSource: "amazon" | "mock";
  isUnlocked: boolean;
  saved: boolean;
};

export const generateDesign = createServerFn({ method: "POST" })
  .inputValidator((input: DesignSelection) => validateSelection(input))
  .handler(async ({ data }): Promise<GenerationResult> => {
    // 1. Real Amazon products first (when the admin has configured the integration).
    const amazon = await import("./amazon.server");
    const cfg = await amazon.loadAmazonConfig();
    let products: AmazonProduct[] = [];
    let productsSource: "amazon" | "mock" = "mock";
    if (amazon.isAmazonConfigured(cfg)) {
      try {
        products = await amazon.fetchAmazonProducts(data, cfg);
        if (products.length) productsSource = "amazon";
      } catch (error) {
        console.error("[decorai] amazon fetch failed", error);
      }
    }
    if (!products.length) products = buildProductList(data);

    // 2. Image prompt built from the exact products (admin-editable template).
    const { data: promptSetting } = await publicClient()
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "image_prompt_template")
      .maybeSingle();
    const dataUrl = await generateRoomImage(
      buildPrompt(data, products, promptSetting?.setting_value ?? null),
    );
    const base: GenerationResult = {
      generationId: null,
      imageUrl: dataUrl,
      products,
      productsSource,
      isUnlocked: false,
      saved: false,
    };

    const token = bearerToken();
    if (!token) return base;

    const supabase = tokenClient(token);
    const { data: claims } = await supabase.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (!userId) return base;

    const { bytes, contentType } = dataUrlToBytes(dataUrl);
    const path = `${userId}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("designs")
      .upload(path, bytes, { contentType, upsert: false });

    if (uploadError) {
      console.error("[decorai] upload failed", uploadError.message);
      return base;
    }

    const { data: row, error: insertError } = await supabase
      .from("generations")
      .insert({
        user_id: userId,
        room_type: data.roomType,
        room_size: data.roomSize ?? null,
        square_feet: data.squareFeet ?? null,
        design_style: data.designStyle,
        budget_range: data.budgetRange,
        discount_filter: data.discountFilter ?? null,
        image_url: path,
        amazon_products: products as unknown as never,
        products_source: productsSource,
      })
      .select("id")
      .single();

    if (insertError || !row) {
      console.error("[decorai] insert failed", insertError?.message);
      return base;
    }

    const { data: signed } = await supabase.storage.from("designs").createSignedUrl(path, 60 * 60 * 24 * 7);

    return { ...base, generationId: row.id, imageUrl: signed?.signedUrl ?? dataUrl, saved: true };
  });

// ---------- Amazon integration settings (admin only; secrets never leave the server) ----------

export type AmazonSettingsView = {
  provider: "rainforest" | "paapi" | "creators";
  trackingId: string;
  marketplace: string;
  rainforestKeyHint: string | null;
  paapiAccessKeyHint: string | null;
  paapiSecretKeyHint: string | null;
  creatorsClientIdHint: string | null;
  creatorsClientSecretHint: string | null;
};

function hint(value: string | null | undefined): string | null {
  if (!value) return null;
  return `••••${value.slice(-4)}`;
}

async function assertAdmin(context: { supabase: AnyClient; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Admins only.");
}

export const getAmazonSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AmazonSettingsView> => {
    await assertAdmin(context);
    const { loadAmazonConfig } = await import("./amazon.server");
    const cfg = await loadAmazonConfig();
    return {
      provider: cfg.provider,
      trackingId: cfg.trackingId ?? "",
      marketplace: cfg.marketplace,
      rainforestKeyHint: hint(cfg.rainforestApiKey),
      paapiAccessKeyHint: hint(cfg.paapiAccessKey),
      paapiSecretKeyHint: hint(cfg.paapiSecretKey),
      creatorsClientIdHint: hint(cfg.creatorsClientId),
      creatorsClientSecretHint: hint(cfg.creatorsClientSecret),
    };
  });

export const saveAmazonSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      provider: string;
      trackingId: string;
      marketplace: string;
      rainforestApiKey?: string;
      paapiAccessKey?: string;
      paapiSecretKey?: string;
      creatorsClientId?: string;
      creatorsClientSecret?: string;
    }) => {
      const provider =
        input?.provider === "paapi"
          ? "paapi"
          : input?.provider === "creators"
            ? "creators"
            : "rainforest";
      const trackingId = String(input?.trackingId ?? "").trim().slice(0, 60);
      const marketplace = String(input?.marketplace ?? "www.amazon.com")
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "");
      if (!/^(www\.)?amazon\.[a-z.]+$/.test(marketplace)) throw new Error("Enter a valid Amazon marketplace, e.g. www.amazon.com");
      const clean = (v?: string) => {
        const s = String(v ?? "").trim();
        return s ? s.slice(0, 400) : null; // empty = keep existing
      };
      return {
        provider,
        trackingId,
        marketplace: marketplace.startsWith("www.") ? marketplace : `www.${marketplace}`,
        rainforestApiKey: clean(input.rainforestApiKey),
        paapiAccessKey: clean(input.paapiAccessKey),
        paapiSecretKey: clean(input.paapiSecretKey),
        creatorsClientId: clean(input.creatorsClientId),
        creatorsClientSecret: clean(input.creatorsClientSecret),
      };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Database["public"]["Tables"]["amazon_settings"]["Update"] = {
      provider: data.provider,
      tracking_id: data.trackingId || null,
      marketplace: data.marketplace,
    };
    if (data.rainforestApiKey) patch.rainforest_api_key = data.rainforestApiKey;
    if (data.paapiAccessKey) patch.paapi_access_key = data.paapiAccessKey;
    if (data.paapiSecretKey) patch.paapi_secret_key = data.paapiSecretKey;
    if (data.creatorsClientId) patch.creators_client_id = data.creatorsClientId;
    if (data.creatorsClientSecret) patch.creators_client_secret = data.creatorsClientSecret;
    const { error } = await supabaseAdmin
      .from("amazon_settings")
      .upsert({ id: 1, ...patch }, { onConflict: "id" });
    if (error) {
      console.error("[decorai] amazon settings save failed", error.message);
      throw new Error("Could not save the Amazon settings.");
    }
    return { saved: true };
  });


export type AmazonTestResult = {
  ok: boolean;
  message: string;
  count: number;
  sample?: string;
  url?: string;
};

export const testAmazonConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AmazonTestResult> => {
    await assertAdmin(context);
    const amazon = await import("./amazon.server");
    const cfg = await amazon.loadAmazonConfig();
    if (!amazon.isAmazonConfigured(cfg)) {
      return { ok: false, count: 0, message: "Add your Tracking ID and API keys first." };
    }
    let products: AmazonProduct[] = [];
    try {
      products = await amazon.fetchAmazonProducts(
        { roomType: "Living Room", designStyle: "Modern", budgetRange: "$1,000 - $3,000", budgetAmount: 2000 },
        cfg,
      );
    } catch (error) {
      console.error("[decorai] amazon test failed", error);
      return {
        ok: false,
        count: 0,
        message: error instanceof Error ? error.message : "The product API request failed.",
      };
    }
    if (!products.length) {
      return {
        ok: false,
        count: 0,
        message: "Connected, but no products came back. Check the keys and marketplace.",
      };
    }
    return {
      ok: true,
      count: products.length,
      message: `Connected — ${products.length} live products found.`,
      sample: products[0]!.name,
      url: products[0]!.url,
    };
  });


export const getUnlockPrice = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicClient()
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", "unlock_price")
    .maybeSingle();
  const price = Number(data?.setting_value ?? "2.00");
  return { price: Number.isFinite(price) ? price : 2 };
});

export const unlockGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { generationId: string }) => {
    if (!input?.generationId) throw new Error("Missing design reference.");
    return { generationId: String(input.generationId) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: generation, error } = await supabase
      .from("generations")
      .select("id, user_id, is_unlocked")
      .eq("id", data.generationId)
      .maybeSingle();

    if (error || !generation || generation.user_id !== userId) {
      throw new Error("This design could not be found in your account.");
    }

    const { data: setting } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "unlock_price")
      .maybeSingle();
    const amount = Number(setting?.setting_value ?? "2.00");

    await supabase.from("transactions").insert({
      user_id: userId,
      generation_id: generation.id,
      amount,
      payment_status: "completed",
    });

    await supabase.from("generations").update({ is_unlocked: true }).eq("id", generation.id);
    await supabase
      .from("saved_rooms")
      .update({ is_unlocked: true })
      .eq("user_id", userId)
      .eq("generation_id", generation.id);

    return { unlocked: true, amount };
  });

export type GalleryEntry = {
  id: string;
  roomType: string;
  designStyle: string;
  budgetRange: string;
  createdAt: string;
  imageUrl: string | null;
  itemCount: number;
  total: number;
  savings: number;
  isUnlocked: boolean;
  unlockCount: number;
  products: AmazonProduct[];
};

export const listPublicGallery = createServerFn({ method: "GET" }).handler(
  async (): Promise<GalleryEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data } = await supabaseAdmin
      .from("generations")
      .select(
        "id, room_type, design_style, budget_range, created_at, image_url, amazon_products, is_unlocked",
      )
      .not("image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(60);

    const rows = data ?? [];
    const paths = rows.map((r) => r.image_url).filter(Boolean) as string[];
    const signedMap = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await supabaseAdmin.storage
        .from("designs")
        .createSignedUrls(paths, 60 * 60);
      for (const entry of signed ?? []) {
        if (entry.path && entry.signedUrl) signedMap.set(entry.path, entry.signedUrl);
      }
    }

    const unlockCounts = new Map<string, number>();
    if (rows.length) {
      const { data: txns } = await supabaseAdmin
        .from("transactions")
        .select("generation_id")
        .eq("payment_status", "completed")
        .in(
          "generation_id",
          rows.map((r) => r.id),
        );
      for (const t of txns ?? []) {
        if (!t.generation_id) continue;
        unlockCounts.set(t.generation_id, (unlockCounts.get(t.generation_id) ?? 0) + 1);
      }
    }

    return rows.map((row) => {
      const products = (Array.isArray(row.amazon_products)
        ? (row.amazon_products as unknown as AmazonProduct[])
        : []) as AmazonProduct[];
      const total = products.reduce((sum, p) => sum + Number(p.price ?? 0), 0);
      const list = products.reduce((sum, p) => sum + Number(p.listPrice ?? p.price ?? 0), 0);
      return {
        id: row.id,
        roomType: row.room_type,
        designStyle: row.design_style,
        budgetRange: row.budget_range,
        createdAt: row.created_at,
        imageUrl: row.image_url ? (signedMap.get(row.image_url) ?? null) : null,
        itemCount: products.length,
        total: Math.round(total * 100) / 100,
        savings: Math.round(Math.max(0, list - total) * 100) / 100,
        isUnlocked: Boolean(row.is_unlocked),
        unlockCount: unlockCounts.get(row.id) ?? 0,
        products: row.is_unlocked ? products : [],
      };
    });
  },
);

/** Any signed-in user can unlock a gallery design; the unlock then applies globally. */
export const unlockGalleryDesign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { generationId: string }) => {
    if (!input?.generationId) throw new Error("Missing design reference.");
    return { generationId: String(input.generationId) };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: generation } = await supabaseAdmin
      .from("generations")
      .select("id, is_unlocked")
      .eq("id", data.generationId)
      .maybeSingle();
    if (!generation) throw new Error("This design could not be found.");

    const { data: setting } = await supabaseAdmin
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "unlock_price")
      .maybeSingle();
    const amount = Number(setting?.setting_value ?? "2.00");

    if (!generation.is_unlocked) {
      await supabaseAdmin.from("transactions").insert({
        user_id: context.userId,
        generation_id: generation.id,
        amount,
        payment_status: "completed",
      });
      await supabaseAdmin.from("generations").update({ is_unlocked: true }).eq("id", generation.id);
      await supabaseAdmin
        .from("saved_rooms")
        .update({ is_unlocked: true })
        .eq("generation_id", generation.id);
    }

    return { unlocked: true, amount };
  });

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [users, generations, transactions, setting] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("generations").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("transactions")
        .select("id, amount, payment_status, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "unlock_price")
        .maybeSingle(),
    ]);

    const rows = transactions.data ?? [];
    const emails = new Map<string, string>();
    if (rows.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email")
        .in("user_id", Array.from(new Set(rows.map((r) => r.user_id))));
      for (const profile of profiles ?? []) emails.set(profile.user_id, profile.email ?? "unknown");
    }

    const revenue = rows
      .filter((r) => r.payment_status === "completed")
      .reduce((sum, r) => sum + Number(r.amount), 0);

    return {
      totalUsers: users.count ?? 0,
      totalGenerations: generations.count ?? 0,
      totalRevenue: Math.round(revenue * 100) / 100,
      unlockPrice: Number(setting.data?.setting_value ?? "2.00"),
      transactions: rows.map((r) => ({
        id: r.id,
        email: emails.get(r.user_id) ?? "unknown",
        amount: Number(r.amount),
        status: r.payment_status,
        createdAt: r.created_at,
      })),
    };
  });

export const setUnlockPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { price: number }) => {
    const price = Number(input?.price);
    if (!Number.isFinite(price) || price < 0 || price > 999) throw new Error("Enter a price between 0 and 999.");
    return { price: Math.round(price * 100) / 100 };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only.");

    await supabase
      .from("app_settings")
      .update({ setting_value: data.price.toFixed(2), updated_at: new Date().toISOString() })
      .eq("setting_key", "unlock_price");

    return { price: data.price };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) > 0) throw new Error("An administrator already exists for this app.");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error("Could not grant admin access.");

    return { granted: true };
  });
