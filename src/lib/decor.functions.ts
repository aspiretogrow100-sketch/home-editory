import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  buildProductList,
  buildPrompt,
  DEFAULT_IMAGE_PROMPT,
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

async function generateRoomImage(prompt: string): Promise<string> {
  const { generateRoomImage: generate } = await import("./imageai.server");
  return await generate(prompt);
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
    designType: input.designType ? String(input.designType).slice(0, 30) : "Full Room",
    decorCategory: input.decorCategory ? String(input.decorCategory).slice(0, 60) : null,
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
  provider: "rainforest" | "paapi" | "creators" | "scraperapi";
  trackingId: string;
  marketplace: string;
  rainforestKeyHint: string | null;
  scraperapiKeyHint: string | null;
  scraperapiKeyHints: string[];
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
      scraperapiKeyHint: hint(cfg.scraperapiApiKey),
      scraperapiKeyHints: splitKeys(cfg.scraperapiApiKey).map((k) => hint(k) ?? ""),
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
      scraperapiApiKey?: string;
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
            : input?.provider === "scraperapi"
              ? "scraperapi"
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
        scraperapiApiKey: clean(input.scraperapiApiKey),
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
    if (data.scraperapiApiKey)
      (patch as Record<string, unknown>)["scraperapi_api_key"] = data.scraperapiApiKey;
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
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email")
        .in("user_id", userIds);
      for (const profile of profiles ?? []) {
        if (profile.email) emails.set(profile.user_id, profile.email);
      }

      const missing = userIds.filter((id) => !emails.has(id));
      if (missing.length) {
        const users = await Promise.all(
          missing.map(async (id) => {
            try {
              const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
              if (error || !data?.user) return null;
              return { id, email: data.user.email };
            } catch {
              return null;
            }
          }),
        );
        for (const u of users) {
          if (u?.email) emails.set(u.id, u.email);
        }
      }
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        {
          setting_key: "unlock_price",
          setting_value: data.price.toFixed(2),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" },
      );
    if (error) throw new Error("Could not save the unlock price.");


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

/** Admin: read the current image prompt template. */
export const getImagePromptTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only.");

    const { data } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "image_prompt_template")
      .maybeSingle();

    return {
      template: data?.setting_value?.trim() ? data.setting_value : DEFAULT_IMAGE_PROMPT,
      isCustom: Boolean(data?.setting_value?.trim()),
      defaultTemplate: DEFAULT_IMAGE_PROMPT,
    };
  });

/** Admin: save (or reset) the image prompt template. */
export const setImagePromptTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { template: string }) => {
    const template = String(input?.template ?? "").trim();
    if (template && template.length < 20) throw new Error("The prompt is too short.");
    if (template.length > 4000) throw new Error("The prompt is too long (max 4000 characters).");
    return { template };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admins only.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const value = data.template || DEFAULT_IMAGE_PROMPT;
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert(
        { setting_key: "image_prompt_template", setting_value: value, updated_at: new Date().toISOString() },
        { onConflict: "setting_key" },
      );
    if (error) throw new Error("Could not save the prompt.");

    return { template: value };
  });

// ---------- AI image generator settings (admin only; keys never leave the server) ----------

export type AiSettingsView = {
  provider: "lovable" | "openai" | "replicate";
  replicateModel: string;
  openaiKeyHint: string | null;
  replicateKeyHint: string | null;
};

export const getAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiSettingsView> => {
    await assertAdmin(context);
    const { loadAiConfig } = await import("./imageai.server");
    const cfg = await loadAiConfig();
    return {
      provider: cfg.provider,
      replicateModel: cfg.replicateModel,
      openaiKeyHint: hint(cfg.openaiApiKey),
      replicateKeyHint: hint(cfg.replicateApiKey),
    };
  });

export const saveAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      provider: string;
      replicateModel?: string;
      openaiApiKey?: string;
      replicateApiKey?: string;
    }) => {
      const provider =
        input?.provider === "openai" ? "openai" : input?.provider === "replicate" ? "replicate" : "lovable";
      const clean = (v?: string) => {
        const s = String(v ?? "").trim();
        return s ? s.slice(0, 400) : null; // empty = keep existing
      };
      return {
        provider,
        replicateModel: String(input?.replicateModel ?? "").trim().slice(0, 200),
        openaiApiKey: clean(input.openaiApiKey),
        replicateApiKey: clean(input.replicateApiKey),
      };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { DEFAULT_REPLICATE_MODEL } = await import("./imageai.server");
    const patch: Database["public"]["Tables"]["ai_settings"]["Update"] = {
      active_image_provider: data.provider,
      replicate_model: data.replicateModel || DEFAULT_REPLICATE_MODEL,
    };
    if (data.openaiApiKey) patch.openai_api_key = data.openaiApiKey;
    if (data.replicateApiKey) patch.replicate_api_key = data.replicateApiKey;
    const { error } = await supabaseAdmin
      .from("ai_settings")
      .upsert({ id: 1, ...patch }, { onConflict: "id" });
    if (error) {
      console.error("[decorai] ai settings save failed", error.message);
      throw new Error("Could not save the AI generator settings.");
    }
    return { saved: true };
  });

// ---------- Social profile links ----------

export const SOCIAL_KEYS = ["facebook", "instagram", "tiktok", "pinterest"] as const;
export type SocialNetwork = (typeof SOCIAL_KEYS)[number];
export type SocialLinks = Record<SocialNetwork, string>;

const emptySocials = (): SocialLinks => ({ facebook: "", instagram: "", tiktok: "", pinterest: "" });

/** Public: read the social profile links shown in the footer. */
export const getSocialLinks = createServerFn({ method: "GET" }).handler(async (): Promise<SocialLinks> => {
  const { data } = await publicClient()
    .from("app_settings")
    .select("setting_key, setting_value")
    .in(
      "setting_key",
      SOCIAL_KEYS.map((k) => `social_${k}`),
    );

  const links = emptySocials();
  for (const row of data ?? []) {
    const key = row.setting_key.replace("social_", "") as SocialNetwork;
    if (SOCIAL_KEYS.includes(key)) links[key] = row.setting_value ?? "";
  }
  return links;
});

/** Admin: save the social profile links. */
export const setSocialLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<SocialLinks>) => {
    const out = emptySocials();
    for (const key of SOCIAL_KEYS) {
      const value = String(input?.[key] ?? "").trim().slice(0, 500);
      if (value && !/^https?:\/\//i.test(value)) {
        throw new Error(`The ${key} link must start with https://`);
      }
      out[key] = value;
    }
    return out;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("app_settings").upsert(
      SOCIAL_KEYS.map((key) => ({
        setting_key: `social_${key}`,
        setting_value: data[key],
        updated_at: now,
      })),
      { onConflict: "setting_key" },
    );
    if (error) throw new Error("Could not save the social links.");
    return data;
  });
