import { createHash, createHmac } from "crypto";

import type { AmazonProduct, DesignSelection } from "./decor";
import { budgetTargetFor, productQueriesFor } from "./decor";

export type AmazonProvider = "rainforest" | "paapi" | "creators" | "scraperapi";

export type AmazonConfig = {
  provider: AmazonProvider;
  trackingId: string | null;
  rainforestApiKey: string | null;
  scraperapiApiKey: string | null;
  paapiAccessKey: string | null;
  paapiSecretKey: string | null;
  creatorsClientId: string | null;
  creatorsClientSecret: string | null;
  marketplace: string;
};

export async function loadAmazonConfig(): Promise<AmazonConfig> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("amazon_settings").select("*").eq("id", 1).maybeSingle();
  const row = (data ?? null) as (Record<string, string | null> & { provider?: string }) | null;
  const provider: AmazonProvider =
    row?.provider === "paapi"
      ? "paapi"
      : row?.provider === "creators"
        ? "creators"
        : row?.provider === "scraperapi"
          ? "scraperapi"
          : "rainforest";
  return {
    provider,
    trackingId: data?.tracking_id ?? null,
    rainforestApiKey: data?.rainforest_api_key ?? null,
    scraperapiApiKey: row?.["scraperapi_api_key"] ?? null,
    paapiAccessKey: data?.paapi_access_key ?? null,
    paapiSecretKey: data?.paapi_secret_key ?? null,
    creatorsClientId: data?.creators_client_id ?? null,
    creatorsClientSecret: data?.creators_client_secret ?? null,
    marketplace: data?.marketplace || "www.amazon.com",
  };
}

export function isAmazonConfigured(cfg: AmazonConfig): boolean {
  if (!cfg.trackingId) return false;
  if (cfg.provider === "rainforest") return Boolean(cfg.rainforestApiKey);
  if (cfg.provider === "creators") return Boolean(cfg.creatorsClientId && cfg.creatorsClientSecret);
  if (cfg.provider === "scraperapi") return Boolean(cfg.scraperapiApiKey);
  return Boolean(cfg.paapiAccessKey && cfg.paapiSecretKey);
}

// ---------- ScraperAPI (structured Amazon search) ----------

type ScraperApiItem = {
  asin?: string;
  name?: string;
  title?: string;
  image?: string;
  url?: string;
  price?: number | string;
  price_string?: string;
  original_price?: { price?: number | string } | number | string;
  stars?: number;
  rating?: number;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function scraperapiCountry(marketplace: string): string {
  const m = marketplace.replace(/^www\./, "");
  const map: Record<string, string> = {
    "amazon.com": "us",
    "amazon.ca": "ca",
    "amazon.co.uk": "uk",
    "amazon.de": "de",
    "amazon.fr": "fr",
    "amazon.it": "it",
    "amazon.es": "es",
    "amazon.in": "in",
    "amazon.co.jp": "jp",
    "amazon.com.au": "au",
    "amazon.com.br": "br",
    "amazon.com.mx": "mx",
  };
  return map[m] ?? "us";
}

async function scraperapiSearch(cfg: AmazonConfig, term: string): Promise<ScraperApiItem[]> {
  const url = new URL("https://api.scraperapi.com/structured/amazon/search");
  url.searchParams.set("api_key", cfg.scraperapiApiKey!);
  url.searchParams.set("query", term);
  url.searchParams.set("country", scraperapiCountry(cfg.marketplace));
  url.searchParams.set("tld", cfg.marketplace.replace(/^www\.amazon\./, ""));
  const res = await fetch(url);
  const raw = await res.text();
  if (!res.ok) {
    console.error("[amazon] scraperapi error", res.status, raw.slice(0, 500));
    throw new Error(`ScraperAPI returned ${res.status}: ${raw.slice(0, 200)}`);
  }
  const json = (() => {
    try {
      return JSON.parse(raw) as { results?: ScraperApiItem[] };
    } catch {
      return {} as { results?: ScraperApiItem[] };
    }
  })();
  return json.results ?? [];
}

function scraperapiToProduct(
  item: ScraperApiItem,
  category: string,
  cfg: AmazonConfig,
): AmazonProduct | null {
  const price = toNumber(item.price) ?? toNumber(item.price_string);
  const name = item.name ?? item.title;
  if (!item.asin || !name || !price) return null;
  const orig =
    typeof item.original_price === "object" && item.original_price
      ? toNumber(item.original_price.price)
      : toNumber(item.original_price);
  const listPrice = orig && orig > price ? orig : price;
  const percent = listPrice > price ? Math.round(((listPrice - price) / listPrice) * 100) : 0;
  return {
    asin: item.asin,
    name: String(name).slice(0, 160),
    category,
    price,
    listPrice,
    discountLabel: percent > 0 ? `${percent}% OFF` : "Deal",
    discountPercent: percent,
    rating: item.stars ?? item.rating ?? 0,
    image: item.image ?? null,
    description: null,
    url: affiliateUrl(cfg.marketplace, item.asin, cfg.trackingId),
  };
}


export function affiliateUrl(marketplace: string, asin: string, trackingId: string | null): string {
  const url = new URL(`https://${marketplace}/dp/${asin}`);
  if (trackingId) url.searchParams.set("tag", trackingId);
  return url.toString();
}

// ---------- Rainforest API ----------

type RainforestItem = {
  asin?: string;
  title?: string;
  link?: string;
  image?: string;
  rating?: number;
  price?: { value?: number };
  prices?: { name?: string; value?: number }[];
  rrp?: { value?: number };
  is_prime?: boolean;
};

async function rainforestSearch(
  cfg: AmazonConfig,
  term: string,
  minPrice: number | null,
  maxPrice: number | null,
): Promise<RainforestItem[]> {
  const url = new URL("https://api.rainforestapi.com/request");
  url.searchParams.set("api_key", cfg.rainforestApiKey!);
  url.searchParams.set("type", "search");
  url.searchParams.set("amazon_domain", cfg.marketplace.replace(/^www\./, ""));
  url.searchParams.set("search_term", term);
  url.searchParams.set("sort_by", "featured");
  if (minPrice) url.searchParams.set("min_price", String(Math.floor(minPrice)));
  if (maxPrice) url.searchParams.set("max_price", String(Math.ceil(maxPrice)));
  const res = await fetch(url);
  if (!res.ok) {
    console.error("[amazon] rainforest error", res.status, await res.text());
    throw new Error(`Rainforest API returned ${res.status}`);
  }
  const json = (await res.json()) as { search_results?: RainforestItem[] };
  return json.search_results ?? [];
}

function rainforestToProduct(
  item: RainforestItem,
  category: string,
  cfg: AmazonConfig,
): AmazonProduct | null {
  const price = item.price?.value;
  if (!item.asin || !item.title || !price) return null;
  const listCandidate =
    item.rrp?.value ??
    item.prices?.find((p) => /list|was|typical|rrp/i.test(p.name ?? ""))?.value ??
    Math.max(...(item.prices ?? []).map((p) => p.value ?? 0), 0);
  const listPrice = listCandidate && listCandidate > price ? listCandidate : price;
  const percent = listPrice > price ? Math.round(((listPrice - price) / listPrice) * 100) : 0;
  return {
    asin: item.asin,
    name: item.title.slice(0, 160),
    category,
    price,
    listPrice,
    discountLabel: percent > 0 ? `${percent}% OFF` : "Deal",
    discountPercent: percent,
    rating: item.rating ?? 0,
    image: item.image ?? null,
    description: null,
    url: affiliateUrl(cfg.marketplace, item.asin, cfg.trackingId),
  };
}

// ---------- Product Advertising API 5.0 ----------

const PAAPI_HOSTS: Record<string, { host: string; region: string }> = {
  "www.amazon.com": { host: "webservices.amazon.com", region: "us-east-1" },
  "www.amazon.ca": { host: "webservices.amazon.ca", region: "us-east-1" },
  "www.amazon.com.mx": { host: "webservices.amazon.com.mx", region: "us-east-1" },
  "www.amazon.com.br": { host: "webservices.amazon.com.br", region: "us-east-1" },
  "www.amazon.co.uk": { host: "webservices.amazon.co.uk", region: "eu-west-1" },
  "www.amazon.de": { host: "webservices.amazon.de", region: "eu-west-1" },
  "www.amazon.fr": { host: "webservices.amazon.fr", region: "eu-west-1" },
  "www.amazon.it": { host: "webservices.amazon.it", region: "eu-west-1" },
  "www.amazon.es": { host: "webservices.amazon.es", region: "eu-west-1" },
  "www.amazon.in": { host: "webservices.amazon.in", region: "eu-west-1" },
  "www.amazon.ae": { host: "webservices.amazon.ae", region: "eu-west-1" },
  "www.amazon.co.jp": { host: "webservices.amazon.co.jp", region: "us-west-2" },
  "www.amazon.com.au": { host: "webservices.amazon.com.au", region: "us-west-2" },
  "www.amazon.sg": { host: "webservices.amazon.sg", region: "us-west-2" },
};

type PaapiItem = {
  ASIN?: string;
  DetailPageURL?: string;
  ItemInfo?: { Title?: { DisplayValue?: string }; Features?: { DisplayValues?: string[] } };
  Images?: { Primary?: { Medium?: { URL?: string } } };
  Offers?: {
    Listings?: {
      Price?: { Amount?: number; Savings?: { Amount?: number; Percentage?: number } };
      SavingBasis?: { Amount?: number };
    }[];
  };
};

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

async function paapiSearch(
  cfg: AmazonConfig,
  keywords: string,
  minPrice: number | null,
  maxPrice: number | null,
  minSavingPercent: number | null,
): Promise<PaapiItem[]> {
  const target = PAAPI_HOSTS[cfg.marketplace] ?? PAAPI_HOSTS["www.amazon.com"]!;
  const path = "/paapi5/searchitems";
  const body = JSON.stringify({
    Keywords: keywords,
    SearchIndex: "HomeAndKitchen",
    ItemCount: 5,
    PartnerTag: cfg.trackingId,
    PartnerType: "Associates",
    Marketplace: cfg.marketplace,
    ...(minPrice ? { MinPrice: Math.round(minPrice * 100) } : {}),
    ...(maxPrice ? { MaxPrice: Math.round(maxPrice * 100) } : {}),
    ...(minSavingPercent ? { MinSavingPercent: Math.round(minSavingPercent) } : {}),
    Resources: [
      "ItemInfo.Title",
      "ItemInfo.Features",
      "Images.Primary.Medium",
      "Offers.Listings.Price",
      "Offers.Listings.SavingBasis",
    ],
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const service = "ProductAdvertisingAPI";
  const amzTarget = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";

  const canonicalHeaders =
    `content-encoding:amz-1.0\n` +
    `content-type:application/json; charset=utf-8\n` +
    `host:${target.host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${amzTarget}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = ["POST", path, "", canonicalHeaders, signedHeaders, sha256Hex(body)].join("\n");
  const scope = `${dateStamp}/${target.region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${cfg.paapiSecretKey}`, dateStamp);
  const kRegion = hmac(kDate, target.region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.paapiAccessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${target.host}${path}`, {
    method: "POST",
    headers: {
      "content-encoding": "amz-1.0",
      "content-type": "application/json; charset=utf-8",
      host: target.host,
      "x-amz-date": amzDate,
      "x-amz-target": amzTarget,
      Authorization: authorization,
    },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as {
    SearchResult?: { Items?: PaapiItem[] };
    Errors?: { Code?: string; Message?: string }[];
  };
  if (!res.ok) {
    console.error("[amazon] paapi error", res.status, JSON.stringify(json.Errors ?? json));
    if (json.Errors?.[0]?.Code === "NoResults") return [];
    throw new Error(json.Errors?.[0]?.Message ?? `PA-API returned ${res.status}`);
  }
  return json.SearchResult?.Items ?? [];
}

function paapiToProduct(item: PaapiItem, category: string, cfg: AmazonConfig): AmazonProduct | null {
  const listing = item.Offers?.Listings?.[0];
  const price = listing?.Price?.Amount;
  const title = item.ItemInfo?.Title?.DisplayValue;
  if (!item.ASIN || !title || !price) return null;
  const listPrice = listing?.SavingBasis?.Amount && listing.SavingBasis.Amount > price ? listing.SavingBasis.Amount : price;
  const percent =
    listing?.Price?.Savings?.Percentage ??
    (listPrice > price ? Math.round(((listPrice - price) / listPrice) * 100) : 0);
  const features = item.ItemInfo?.Features?.DisplayValues ?? [];
  return {
    asin: item.ASIN,
    name: title.slice(0, 160),
    category,
    price,
    listPrice,
    discountLabel: percent > 0 ? `${percent}% OFF` : "Deal",
    discountPercent: percent,
    rating: 0,
    image: item.Images?.Primary?.Medium?.URL ?? null,
    description: features.slice(0, 2).join(" ").slice(0, 240) || null,
    url: item.DetailPageURL ?? affiliateUrl(cfg.marketplace, item.ASIN, cfg.trackingId),
  };
}

// ---------- Amazon Creators API (OAuth 2.0 client credentials) ----------

const CREATORS_BASE = "https://creatorsapi.amazon";

function creatorsTokenEndpoint(marketplace: string): string {
  const m = marketplace.replace(/^www\./, "");
  if (/amazon\.(co\.uk|de|fr|it|es|nl|se|pl|com\.tr|ae|sa|in|eg)$/.test(m)) {
    return "https://api.amazon.co.uk/auth/o2/token";
  }
  if (/amazon\.(co\.jp|com\.au|sg)$/.test(m)) return "https://api.amazon.co.jp/auth/o2/token";
  return "https://api.amazon.com/auth/o2/token";
}

let creatorsToken: { value: string; expiresAt: number } | null = null;

async function creatorsAccessToken(cfg: AmazonConfig): Promise<string> {
  if (creatorsToken && creatorsToken.expiresAt - 60_000 > Date.now()) return creatorsToken.value;
  const endpoint = creatorsTokenEndpoint(cfg.marketplace);
  // Login with Amazon expects application/x-www-form-urlencoded, not JSON.
  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: cfg.creatorsClientId ?? "",
    client_secret: cfg.creatorsClientSecret ?? "",
    scope: "creatorsapi::default",
  });
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: form.toString(),
  });
  const rawBody = await res.text();
  const json = (() => {
    try {
      return JSON.parse(rawBody) as {
        access_token?: string;
        expires_in?: number;
        error_description?: string;
        error?: string;
      };
    } catch {
      return {} as Record<string, never>;
    }
  })();
  if (!res.ok || !json.access_token) {
    console.error(
      "[amazon] creators token error",
      JSON.stringify({ endpoint, status: res.status, body: rawBody.slice(0, 2000) }),
    );
    throw new Error(
      `Amazon token request failed (${res.status}): ${
        json.error_description ?? json.error ?? (rawBody.slice(0, 300) || "no response body")
      }`,
    );
  }
  creatorsToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return creatorsToken.value;
}

async function creatorsSearch(
  cfg: AmazonConfig,
  keywords: string,
  minPrice: number | null,
  maxPrice: number | null,
  minSavingPercent: number | null,
  retry = true,
): Promise<PaapiItem[]> {
  const token = await creatorsAccessToken(cfg);
  const marketplace = cfg.marketplace.startsWith("www.") ? cfg.marketplace : `www.${cfg.marketplace}`;
  const url = `${CREATORS_BASE}/catalog/v1/searchItems`;
  const payload = {
    keywords,
    searchIndex: "HomeAndKitchen",
    itemCount: 5,
    partnerTag: cfg.trackingId,
    partnerType: "Associates",
    marketplace,
    ...(minPrice ? { minPrice: Math.round(minPrice * 100) } : {}),
    ...(maxPrice ? { maxPrice: Math.round(maxPrice * 100) } : {}),
    ...(minSavingPercent ? { minSavingPercent: Math.round(minSavingPercent) } : {}),
    resources: [
      "itemInfo.title",
      "itemInfo.features",
      "images.primary.medium",
      "offersV2.listings.price",
      "offersV2.listings.dealDetails",
    ],
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json",
      "x-marketplace": marketplace,
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401 && retry) {
    creatorsToken = null;
    return creatorsSearch(cfg, keywords, minPrice, maxPrice, minSavingPercent, false);
  }

  const rawBody = await res.text();
  const json = (() => {
    try {
      return JSON.parse(rawBody) as {
        searchResult?: { items?: PaapiItem[] };
        SearchResult?: { Items?: PaapiItem[] };
        errors?: { code?: string; message?: string }[];
        Errors?: { Code?: string; Message?: string }[];
      };
    } catch {
      return {} as Record<string, never>;
    }
  })();
  if (!res.ok) {
    const err = (json.errors?.[0] ?? json.Errors?.[0]) as
      | { code?: string; Code?: string; message?: string; Message?: string }
      | undefined;
    const code = err?.code ?? err?.Code;
    if (code === "NoResults") return [];
    console.error(
      "[amazon] creators search error",
      JSON.stringify({
        url,
        status: res.status,
        requestKeys: Object.keys(payload),
        partnerTag: cfg.trackingId,
        marketplace,
        body: rawBody.slice(0, 2000),
      }),
    );
    throw new Error(
      `Creators API ${res.status}: ${
        err?.message ?? err?.Message ?? (rawBody.slice(0, 300) || "no response body")
      }`,
    );
  }
  const raw = (json.searchResult?.items ?? json.SearchResult?.Items ?? []) as unknown[];
  return raw.map(normalizeCreatorsItem);
}


/** Creators API may return camelCase keys; map them onto the PA-API shape we already parse. */
function normalizeCreatorsItem(raw: unknown): PaapiItem {
  const i = raw as Record<string, any>;
  if (i["ASIN"] || i["ItemInfo"]) return i as PaapiItem;
  const listing = i["offersV2"]?.listings?.[0] ?? i["offers"]?.listings?.[0];
  return {
    ASIN: i["asin"],
    DetailPageURL: i["detailPageURL"] ?? i["detailPageUrl"],
    ItemInfo: {
      Title: { DisplayValue: i["itemInfo"]?.title?.displayValue },
      Features: { DisplayValues: i["itemInfo"]?.features?.displayValues },
    },
    Images: { Primary: { Medium: { URL: i["images"]?.primary?.medium?.url } } },
    Offers: listing
      ? {
          Listings: [
            {
              Price: {
                Amount: listing.price?.amount,
                Savings: { Percentage: listing.price?.savings?.percentage },
              },
              SavingBasis: { Amount: listing.savingBasis?.amount },
            },
          ],
        }
      : {},
  };
}

// ---------- Orchestration ----------


/**
 * Fetches one live Amazon product for each furniture slot of the selected room,
 * honouring the budget (per-item price band) and the minimum discount the user picked.
 */
export async function fetchAmazonProducts(
  sel: DesignSelection,
  cfg: AmazonConfig,
): Promise<AmazonProduct[]> {
  const queries = productQueriesFor(sel);
  const budget = budgetTargetFor(sel);
  const prioritizeDiscount = sel.discountFilter === "On Sale & Deals";
  const minDiscount = sel.discountPercent && sel.discountPercent > 0 ? sel.discountPercent : 0;
  let lastError: unknown = null;

  // One candidate pool per furniture slot, already capped to that slot's share of the budget.
  const pools = await Promise.all(
    queries.map(async ({ category, query, share }) => {
      const cap = Math.max(20, Math.round(budget * share * 1.15));
      const minPrice = cap > 120 ? Math.round(cap * 0.2) : null;
      try {
        let candidates: AmazonProduct[] = [];
        if (cfg.provider === "creators") {
          const items = await creatorsSearch(cfg, query, minPrice, cap, minDiscount || null);
          candidates = items.map((i) => paapiToProduct(i, category, cfg)).filter(Boolean) as AmazonProduct[];
        } else if (cfg.provider === "scraperapi") {
          const items = await scraperapiSearch(cfg, query);
          candidates = items
            .map((i) => scraperapiToProduct(i, category, cfg))
            .filter(Boolean) as AmazonProduct[];
        } else if (cfg.provider === "paapi") {
          const items = await paapiSearch(cfg, query, minPrice, cap, minDiscount || null);
          candidates = items.map((i) => paapiToProduct(i, category, cfg)).filter(Boolean) as AmazonProduct[];
        } else {
          const items = await rainforestSearch(cfg, query, minPrice, cap);
          candidates = items.map((i) => rainforestToProduct(i, category, cfg)).filter(Boolean) as AmazonProduct[];
        }
        // Hard client-side cap: providers often ignore or loosen the price filter.
        const withinCap = candidates.filter((c) => c.price > 0 && c.price <= cap);
        const usable = withinCap.length ? withinCap : candidates.filter((c) => c.price > 0);
        const discounted = usable.filter((c) => (c.discountPercent ?? 0) >= minDiscount);
        const base = discounted.length ? discounted : usable;
        // "On Sale & Deals" maximizes discount first; everything else optimizes price fit.
        const pool = prioritizeDiscount
          ? base.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0))
          : base.sort((a, b) => a.price - b.price);
        return pool;
      } catch (error) {
        lastError = error;
        console.error("[amazon] search failed for", query, error);
        return [] as AmazonProduct[];
      }
    }),
  );

  if (pools.every((p) => p.length === 0) && lastError) throw lastError;

  // Initial pick: best value for the mode (price fit normally, highest discount when deals-first).
  const seen = new Set<string>();
  const picks: { pool: AmazonProduct[]; index: number }[] = [];
  pools.forEach((pool, i) => {
    const allocation = budget * (queries[i]?.share ?? 0.1);
    const available = pool.filter((c) => !seen.has(c.asin ?? c.name));
    if (!available.length) return;
    const fitting = available.filter((c) => c.price <= allocation);
    const chosen = prioritizeDiscount
      ? fitting[0] ?? available[0]!
      : fitting.length
        ? fitting[fitting.length - 1]!
        : available[0]!;
    seen.add(chosen.asin ?? chosen.name);
    picks.push({ pool: available, index: available.indexOf(chosen) });
  });

  // Trim down until the basket total fits the user's budget (price-sorted pools only).
  if (!prioritizeDiscount) {
    const total = () => picks.reduce((sum, p) => sum + (p.pool[p.index]?.price ?? 0), 0);
    let guard = 0;
    while (total() > budget && guard < 200) {
      guard += 1;
      let best: { pick: (typeof picks)[number]; saving: number } | null = null;
      for (const pick of picks) {
        if (pick.index === 0) continue;
        const saving = (pick.pool[pick.index]?.price ?? 0) - (pick.pool[pick.index - 1]?.price ?? 0);
        if (saving > 0 && (!best || saving > best.saving)) best = { pick, saving };
      }
      if (!best) break;
      best.pick.index -= 1;
    }
  }

  return picks.map((p) => p.pool[p.index]!).filter(Boolean);
}
