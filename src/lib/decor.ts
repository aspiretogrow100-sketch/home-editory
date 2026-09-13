export const ROOM_TYPES = [
  "Living Room",
  "Bedroom",
  "Bathroom",
  "Kitchen",
  "Office",
] as const;

export const ROOM_SIZES = ["Small", "Medium", "Large"] as const;

export const DESIGN_STYLES = [
  { name: "Boho", blurb: "Layered textiles, rattan, plants" },
  { name: "Minimalist", blurb: "Calm lines, negative space" },
  { name: "Artistic", blurb: "Bold color, gallery walls" },
  { name: "Industrial", blurb: "Brick, steel, raw wood" },
  { name: "Modern", blurb: "Clean forms, warm neutrals" },
] as const;

export const BUDGET_RANGES = ["$500 - $1,000", "$1,000 - $3,000", "$3,000+"] as const;

export const DISCOUNT_FILTERS = ["20% OFF", "30% OFF", "50% OFF", "Clearance"] as const;

export type DesignSelection = {
  roomType: string;
  roomSize?: string | null;
  itemDensity?: string | null;
  itemCount?: number | null;
  squareFeet?: number | null;
  designStyle: string;
  budgetRange: string;
  budgetAmount?: number | null;
  discountFilter?: string | null;
  discountPercent?: number | null;
};

export type AmazonProduct = {
  name: string;
  category: string;
  price: number;
  listPrice: number;
  discountLabel: string;
  rating: number;
  url: string;
  asin?: string | null;
  image?: string | null;
  description?: string | null;
  discountPercent?: number | null;
};

export function buildPrompt(sel: DesignSelection, products: AmazonProduct[] = []): string {
  const size = sel.roomSize ? `${sel.roomSize.toLowerCase()}-sized ` : "";
  const area = sel.squareFeet ? ` The room measures about ${sel.squareFeet} square feet — scale the furniture and layout to that footprint.` : "";
  const featured = products.length
    ? ` The room must feature these exact products, rendered faithfully to their real appearance, materials and colours: ${products
        .map((p, i) => `(${i + 1}) ${p.category}: ${p.name}${p.description ? ` — ${p.description}` : ""}`)
        .join("; ")}. Do not invent other major furniture pieces.`
    : "";
  const density = sel.itemDensity
    ? ` Styled as "${sel.itemDensity}" — roughly ${products.length || sel.itemCount || 6} key pieces in the room.`
    : "";
  return [
    `A professional, hyper-realistic interior design photograph of a ${size}${sel.designStyle.toLowerCase()} ${sel.roomType.toLowerCase()}.`,
    `Furnished to a ${sel.budgetRange} budget with cohesive furniture, lighting, textiles and decor.${density}${area}${featured}`,
    "Shot on a full-frame camera, 24mm lens, soft natural daylight, realistic shadows, magazine editorial quality, no people, no text, no watermarks.",
  ].join(" ");
}

const GENERIC_SLOTS = [
  { category: "Furniture", item: "furniture centerpiece" },
  { category: "Lighting", item: "floor lamp" },
  { category: "Textiles", item: "area rug" },
  { category: "Storage", item: "storage cabinet" },
  { category: "Decor", item: "wall art" },
  { category: "Decor", item: "decorative mirror" },
];

const SLOT_SHARES = [0.35, 0.2, 0.12, 0.13, 0.1, 0.1];

const EXTRA_SLOTS = [
  { category: "Decor", item: "accent side table" },
  { category: "Greenery", item: "large potted plant with planter" },
  { category: "Decor", item: "throw pillow and blanket set" },
  { category: "Lighting", item: "table lamp" },
];

/** How many products a design should include, based on the chosen room density. */
export function itemCountFor(sel: DesignSelection): number {
  const raw = Number(sel.itemCount);
  if (!Number.isFinite(raw) || raw <= 0) return 6;
  return Math.min(12, Math.max(2, Math.round(raw)));
}

/** Furniture slots for a room, trimmed or extended to match the chosen item count. */
export function slotsFor(sel: DesignSelection): { category: string; item: string }[] {
  const base = CATALOG[sel.roomType] ?? GENERIC_SLOTS;
  const count = itemCountFor(sel);
  const slots = base.slice(0, count);
  let i = 0;
  while (slots.length < count) {
    slots.push(EXTRA_SLOTS[i % EXTRA_SLOTS.length]!);
    i += 1;
  }
  return slots;
}

/** Search queries (one per furniture slot) used to fetch live Amazon products for a room. */
export function productQueriesFor(sel: DesignSelection): { category: string; query: string; share: number }[] {
  const slots = slotsFor(sel);
  const shares = slots.map((_, i) => SLOT_SHARES[i] ?? 0.1);
  const total = shares.reduce((sum, s) => sum + s, 0) || 1;
  return slots.map((slot, i) => ({
    category: slot.category,
    query: `${sel.designStyle} ${slot.item} ${sel.roomType}`.toLowerCase(),
    share: (shares[i] ?? 0.1) / total,
  }));
}


const CATALOG: Record<string, { category: string; item: string }[]> = {
  "Living Room": [
    { category: "Seating", item: "3-Seat Fabric Sofa" },
    { category: "Table", item: "Solid Wood Coffee Table" },
    { category: "Lighting", item: "Arc Floor Lamp" },
    { category: "Textiles", item: "Hand-Woven Area Rug 8x10" },
    { category: "Decor", item: "Framed Wall Art Set of 3" },
    { category: "Storage", item: "Open Shelf Media Console" },
  ],
  Bedroom: [
    { category: "Bed", item: "Upholstered Platform Bed Frame" },
    { category: "Bedding", item: "Washed Cotton Duvet Set" },
    { category: "Lighting", item: "Ceramic Bedside Lamp Pair" },
    { category: "Storage", item: "6-Drawer Wide Dresser" },
    { category: "Textiles", item: "Blackout Linen Curtains" },
    { category: "Decor", item: "Round Arched Wall Mirror" },
  ],
  Bathroom: [
    { category: "Storage", item: "Freestanding Bamboo Cabinet" },
    { category: "Textiles", item: "Turkish Cotton Towel Set" },
    { category: "Lighting", item: "Brass Vanity Sconce Pair" },
    { category: "Decor", item: "Frameless LED Mirror" },
    { category: "Organization", item: "Stone Bath Accessory Set" },
    { category: "Textiles", item: "Non-Slip Bath Mat" },
  ],
  Kitchen: [
    { category: "Seating", item: "Counter Stool Set of 2" },
    { category: "Lighting", item: "Pendant Light Trio" },
    { category: "Storage", item: "Rolling Kitchen Island Cart" },
    { category: "Cookware", item: "Enameled Cast Iron Set" },
    { category: "Organization", item: "Glass Canister Set" },
    { category: "Decor", item: "Open Wall Spice Rack" },
  ],
  Office: [
    { category: "Desk", item: "Electric Standing Desk" },
    { category: "Seating", item: "Ergonomic Mesh Task Chair" },
    { category: "Lighting", item: "Adjustable LED Desk Lamp" },
    { category: "Storage", item: "Modular Bookshelf Unit" },
    { category: "Textiles", item: "Low-Pile Office Rug" },
    { category: "Decor", item: "Acoustic Wall Panel Set" },
  ],
};

const BUDGET_WEIGHT: Record<string, number> = {
  "$500 - $1,000": 0.45,
  "$1,000 - $3,000": 1,
  "$3,000+": 2.2,
};

const DISCOUNT_RATE: Record<string, number> = {
  "20% OFF": 0.2,
  "30% OFF": 0.3,
  "50% OFF": 0.5,
  Clearance: 0.62,
};

export function amazonSearchUrl(query: string): string {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=decorai-20`;
}

/** The spend ceiling for a whole room, from the exact amount or the chosen range. */
export function budgetTargetFor(sel: DesignSelection): number {
  const exact = Number(sel.budgetAmount);
  if (Number.isFinite(exact) && exact > 0) return exact;
  const numbers = (sel.budgetRange ?? "").match(/[\d,]+/g)?.map((n) => Number(n.replace(/,/g, ""))) ?? [];
  if (numbers.length >= 2) return numbers[1]!;
  if (numbers.length === 1) return numbers[0]! * (sel.budgetRange?.includes("+") ? 1.5 : 1);
  return (BUDGET_WEIGHT[sel.budgetRange] ?? 1) * 2000;
}

/** Per-slot spend allocation (sums to the room budget). */
export function budgetAllocationFor(sel: DesignSelection): number[] {
  const slots = slotsFor(sel);
  const budget = budgetTargetFor(sel);
  const shares = slots.map((_, i) => SLOT_SHARES[i] ?? 0.1);
  const total = shares.reduce((sum, s) => sum + s, 0) || 1;
  return shares.map((s) => (s / total) * budget);
}

export function buildProductList(sel: DesignSelection): AmazonProduct[] {
  const items = slotsFor(sel);
  const allocation = budgetAllocationFor(sel);
  const percent = sel.discountPercent;
  const rate =
    percent && percent > 0 && percent < 100
      ? percent / 100
      : sel.discountFilter
        ? (DISCOUNT_RATE[sel.discountFilter] ?? 0.2)
        : 0.2;

  return items.map((entry, i) => {
    const price = Math.round((allocation[i] ?? 0) * 100) / 100;
    const listPrice = Math.round((price / (1 - rate)) * 100) / 100;
    const name = `${sel.designStyle} ${entry.item}`;
    return {
      name,
      category: entry.category,
      price,
      listPrice,
      discountLabel: sel.discountFilter ?? "20% OFF",
      rating: Math.round((4.2 + ((i * 13) % 7) / 10) * 10) / 10,
      url: amazonSearchUrl(`${sel.designStyle} ${entry.item} ${sel.roomType}`),
    };
  });
}

export function currency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
