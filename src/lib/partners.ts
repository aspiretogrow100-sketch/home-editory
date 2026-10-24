/**
 * Partner (sponsored) products — e.g. CondoMounts and ZeboZap TV mounts.
 *
 * The admin adds products from the client's Amazon store and says which rooms each
 * one fits. When a full-room design is generated for one of those rooms, one
 * matching product is placed in the AI image and shown as a "Featured" card that
 * stays visible even while the rest of the shopping list is locked.
 *
 * Shared by the browser (admin UI, featured card) and the server (generation).
 */
import type { AmazonProduct } from "./decor";

export type PartnerProduct = {
  id: string;
  /** Brand shown on the card, e.g. "CondoMounts" or "ZeboZap". */
  brand: string;
  name: string;
  asin: string | null;
  /** Amazon product link as pasted by the admin. */
  url: string;
  image: string | null;
  /** Room labels this product fits, matched case-insensitively against the chosen room. */
  rooms: string[];
  /** How the product should appear in the AI image. */
  promptHint: string;
  active: boolean;
};

export const PARTNER_SETTING_KEY = "partner_products";
export const MAX_PARTNER_PRODUCTS = 60;

/** Ready-made setups the admin can start from, one per kind of room. */
export const PARTNER_PRESETS: {
  label: string;
  brand: string;
  rooms: string[];
  promptHint: string;
}[] = [
  {
    label: "Indoor pillar TV mount",
    brand: "CondoMounts",
    rooms: ["Living Room", "Family Room", "Basement", "Media Room", "Game Room"],
    promptHint:
      "a large flat-screen TV mounted on a round structural column in the room with a black no-drill strap-on full-motion pillar TV mount, angled toward the seating",
  },
  {
    label: "Bedroom wall TV mount",
    brand: "CondoMounts",
    rooms: ["Bedroom", "Master Bedroom", "Guest Bedroom"],
    promptHint:
      "a flat-screen TV on the wall facing the bed, held by a slim black full-motion articulating wall mount",
  },
  {
    label: "Kitchen corner TV mount",
    brand: "CondoMounts",
    rooms: ["Kitchen"],
    promptHint:
      "a small 32-inch TV high in a corner on a black full-motion corner wall mount, angled toward the kitchen island",
  },
  {
    label: "Office pillar monitor mount",
    brand: "CondoMounts",
    rooms: ["Office", "Home Office", "Study"],
    promptHint:
      "a computer monitor on a black gas-spring arm clamped to a structural column beside the desk",
  },
  {
    label: "Outdoor gazebo TV mount",
    brand: "ZeboZap",
    rooms: ["Patio", "Gazebo", "Pergola", "Backyard", "Deck", "Porch", "Pool"],
    promptHint:
      "a weatherproof flat-screen TV mounted on a gazebo or pergola post with a black no-drill strap-on outdoor full-motion TV mount, angled toward the outdoor seating",
  },
  {
    label: "Gazebo post fan",
    brand: "ZeboZap",
    rooms: ["Patio", "Gazebo", "Pergola", "Backyard", "Deck", "Porch", "Pool"],
    promptHint:
      "a black waterproof 18-inch fan strapped onto a gazebo post, angled toward the seating",
  },
];

/** Pull the 10-character ASIN out of an Amazon product link (or accept a bare ASIN). */
export function parseAsin(input: string): string | null {
  const value = String(input ?? "").trim();
  if (/^[A-Z0-9]{10}$/i.test(value)) return value.toUpperCase();
  const match =
    value.match(/\/(?:dp|gp\/product|gp\/aw\/d|exec\/obidos\/ASIN)\/([A-Z0-9]{10})(?:[/?#]|$)/i) ??
    value.match(/[?&](?:asin|ASIN|lp_context_asin)=([A-Z0-9]{10})(?:&|$)/);
  return match ? match[1]!.toUpperCase() : null;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Does this room label belong to the product's room list? ("Patio" also matches "Patio / Deck"). */
export function roomMatches(rooms: string[], roomType: string): boolean {
  const room = normalize(roomType);
  if (!room) return false;
  return rooms.some((entry) => {
    const rule = normalize(entry);
    if (!rule) return false;
    return room === rule || ` ${room} `.includes(` ${rule} `) || ` ${rule} `.includes(` ${room} `);
  });
}

/** Active partner products that fit a room. */
export function partnersForRoom(products: PartnerProduct[], roomType: string): PartnerProduct[] {
  return products.filter((p) => p.active && p.url && roomMatches(p.rooms, roomType));
}

/** Pick one fitting product at random so repeat designs rotate between products. */
export function pickPartnerProduct(
  products: PartnerProduct[],
  roomType: string,
  random: () => number = Math.random,
): PartnerProduct | null {
  const fitting = partnersForRoom(products, roomType);
  if (!fitting.length) return null;
  return fitting[Math.floor(random() * fitting.length)] ?? fitting[0]!;
}

/** Parse the stored JSON safely; bad or missing data means "no partner products". */
export function parsePartnerProducts(raw: string | null | undefined): PartnerProduct[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list.map(sanitizePartnerProduct).filter((p): p is PartnerProduct => Boolean(p));
  } catch {
    return [];
  }
}

/** Clean one product from admin input or storage; returns null when unusable. */
export function sanitizePartnerProduct(input: unknown): PartnerProduct | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Partial<Record<keyof PartnerProduct, unknown>>;
  const url = String(row.url ?? "")
    .trim()
    .slice(0, 1000);
  if (!/^https:\/\//i.test(url)) return null;
  const image = String(row.image ?? "")
    .trim()
    .slice(0, 1000);
  const rooms = (Array.isArray(row.rooms) ? row.rooms : String(row.rooms ?? "").split(","))
    .map((r) => String(r).trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 20);
  const asin = parseAsin(String(row.asin ?? "")) ?? parseAsin(url);
  return {
    id:
      String(row.id ?? "")
        .trim()
        .slice(0, 64) || crypto.randomUUID(),
    brand:
      String(row.brand ?? "")
        .trim()
        .slice(0, 60) || "Partner",
    name:
      String(row.name ?? "")
        .trim()
        .slice(0, 200) || "Featured product",
    asin,
    url,
    image: /^https:\/\//i.test(image) ? image : null,
    rooms,
    promptHint: String(row.promptHint ?? "")
      .trim()
      .slice(0, 400),
    active: row.active !== false,
  };
}

/** Turn a partner product into the featured first item of a design's product list. */
export function partnerToFeaturedItem(partner: PartnerProduct, url: string): AmazonProduct {
  return {
    name: partner.name,
    category: partner.brand,
    // Price is not stored for partner items: shoppers see today's price on Amazon.
    price: 0,
    listPrice: 0,
    discountLabel: "Featured",
    rating: 0,
    url,
    asin: partner.asin,
    image: partner.image,
    description: partner.promptHint || null,
    featured: true,
    partner: partner.brand,
  };
}

export function isFeatured(product: AmazonProduct): boolean {
  return product.featured === true;
}

/** Split a design's products into the always-visible featured items and the regular list. */
export function splitFeatured(products: AmazonProduct[]): {
  featured: AmazonProduct[];
  regular: AmazonProduct[];
} {
  const list = Array.isArray(products) ? products : [];
  return { featured: list.filter(isFeatured), regular: list.filter((p) => !isFeatured(p)) };
}
