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

/** What the user wants to design: a whole room, one wall, or a single piece. */
export const DESIGN_TYPES = [
  { label: "Full Room", hint: "Design the whole space, furniture and all" },
  { label: "Wall Decor", hint: "Style one wall — art, frames, shelves, mirrors" },
  { label: "Single Item", hint: "Shop one decor piece for your space" },
] as const;

export type DesignType = (typeof DESIGN_TYPES)[number]["label"];

/** Wall-only slots used when the design type is Wall Decor. */
export const WALL_SLOTS: { category: string; item: string }[] = [
  { category: "Wall Art", item: "framed wall art set" },
  { category: "Gallery Frames", item: "gallery wall picture frame set" },
  { category: "Mirror", item: "decorative wall mirror" },
  { category: "Shelving", item: "floating wall shelf set" },
  { category: "Lighting", item: "wall sconce pair" },
  { category: "Accent", item: "woven wall hanging" },
];

/** Categories offered for Wall Decor and Single Item designs. */
export const WALL_CATEGORIES = [
  "Wall Art",
  "Gallery Frames",
  "Wall Mirror",
  "Floating Shelf",
  "Wall Clock",
  "Tapestry / Wall Hanging",
  "Wall Sconce",
  "Wall Planter",
] as const;

export const SINGLE_ITEM_CATEGORIES = [
  ...WALL_CATEGORIES,
  "Table Lamp",
  "Floor Lamp",
  "Vase",
  "Throw Pillow",
  "Area Rug",
  "Potted Plant",
  "Sculpture / Figurine",
  "Storage Basket",
] as const;

export type DesignSelection = {
  designType?: DesignType | string | null;
  decorCategory?: string | null;
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

export function designTypeOf(sel: DesignSelection): DesignType {
  const value = String(sel.designType ?? "").toLowerCase();
  if (value.startsWith("wall")) return "Wall Decor";
  if (value.startsWith("single")) return "Single Item";
  return "Full Room";
}

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

/** Editable image prompt template. Admins can change this from the Admin page. */
export const DEFAULT_IMAGE_PROMPT = [
  "A professional, hyper-realistic interior design photograph of a {size}{style} {roomType}.",
  "Furnished to a {budget} budget with cohesive furniture, lighting, textiles and decor.{density}{area}{featured}",
  "Shot on a full-frame camera, 24mm lens, soft natural daylight, realistic shadows, magazine editorial quality, no people, no watermarks. Compose with generous headroom: the entire room and all furniture must be fully visible inside the frame, with at least 10% empty margin around every edge.",
  "{labels}",
].join(" ");

/** Wall-decor prompt: one styled wall inside the real room, never a white studio backdrop. */
export const DEFAULT_WALL_PROMPT = [
  "A professional, hyper-realistic interior photograph of one decorated feature wall in a {size}{style} {roomType}.",
  "The camera faces the wall straight on, showing the real room around it — floor, existing furniture edges, natural daylight and realistic shadows. Never a plain white studio background, never a product cut-out or collage.{area}{featured}",
  "Mount and arrange the wall pieces on the wall exactly as they would hang in a real home, balanced and correctly scaled, within a {budget} budget.",
  "Shot on a full-frame camera, 35mm lens, magazine editorial quality, no people, no watermarks. Every wall piece must be fully visible inside the frame with at least 10% empty margin on all four sides.",
  "{labels}",
].join(" ");

/** Single-item prompt: the chosen piece styled in a real room corner, no white background. */
export const DEFAULT_SINGLE_PROMPT = [
  "A professional, hyper-realistic interior photograph of a single {style} decor piece styled inside a real {size}{roomType}.",
  "The piece is the hero of the frame but sits in a genuine lived-in setting — real wall, floor, soft natural daylight, realistic shadows and gentle depth of field. Never a plain white studio background, never a cut-out product shot.{area}{featured}",
  "Keep it faithful to the real product's shape, materials and colours, correctly scaled for the space, within a {budget} budget.",
  "Shot on a full-frame camera, 50mm lens, magazine editorial quality, no people, no watermarks. The piece must be fully visible inside the frame with at least 10% empty margin on all four sides.",
  "{labels}",
].join(" ");


/** Placeholders available inside the prompt template, with a short explanation. */
export const PROMPT_PLACEHOLDERS: { token: string; hint: string }[] = [
  { token: "{roomType}", hint: "Chosen room, e.g. living room" },
  { token: "{style}", hint: "Chosen design style" },
  { token: "{size}", hint: "Room size prefix, e.g. large-sized" },
  { token: "{budget}", hint: "Chosen budget range" },
  { token: "{area}", hint: "Square feet sentence, when given" },
  { token: "{density}", hint: "Item density sentence" },
  { token: "{featured}", hint: "The exact product list to render" },
  { token: "{labels}", hint: "Text label + layout rules for each product" },
];

export function buildPrompt(
  sel: DesignSelection,
  products: AmazonProduct[] = [],
  template?: string | null,
): string {
  const size = sel.roomSize ? `${sel.roomSize.toLowerCase()}-sized ` : "";
  const area = sel.squareFeet ? ` The room measures about ${sel.squareFeet} square feet — scale the furniture and layout to that footprint.` : "";
  const type = designTypeOf(sel);
  const subject =
    type === "Wall Decor" ? "wall" : type === "Single Item" ? "scene" : "room";
  const featured = products.length
    ? ` The ${subject} must feature these exact products, rendered faithfully to their real appearance, materials and colours: ${products
        .map((p, i) => `(${i + 1}) ${p.category}: ${p.name}${p.description ? ` — ${p.description}` : ""}`)
        .join("; ")}. Do not invent other major ${type === "Full Room" ? "furniture" : "decor"} pieces.`
    : "";
  const density = sel.itemDensity
    ? ` Styled as "${sel.itemDensity}" — roughly ${products.length || sel.itemCount || 6} key pieces in the room.`
    : "";
  const labels = products.length
    ? ` Add a short, neat text label next to each featured product naming it (${products
        .map((p) => p.name)
        .join(", ")}). Strict layout rules: every product and every text label must sit completely inside the image with a clear empty margin on all four sides — nothing may touch or be cut off by the top, bottom, left or right edge. Keep all labels horizontal, fully legible, not overlapping each other or the products, and pull wall-edge items slightly inward so the whole composition breathes.`
    : "";

  const values: Record<string, string> = {
    size,
    style: sel.designStyle.toLowerCase(),
    roomType: sel.roomType.toLowerCase(),
    budget: sel.budgetRange,
    area,
    density,
    featured,
    labels,
  };

  const fallback =
    type === "Wall Decor"
      ? DEFAULT_WALL_PROMPT
      : type === "Single Item"
        ? DEFAULT_SINGLE_PROMPT
        : DEFAULT_IMAGE_PROMPT;
  // The admin-editable template only drives full-room designs; wall and single-item
  // designs use their own dedicated prompts.
  const source = type === "Full Room" && template?.trim() ? template : fallback;
  return source
    .replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? values[key]! : match))
    .replace(/[ \t]+/g, " ")
    .trim();
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

/** How many products a design should include, based on design type and room density. */
export function itemCountFor(sel: DesignSelection): number {
  const type = designTypeOf(sel);
  if (type === "Single Item") return 1;
  const raw = Number(sel.itemCount);
  if (type === "Wall Decor") {
    if (!Number.isFinite(raw) || raw <= 0) return 4;
    return Math.min(6, Math.max(2, Math.round(raw)));
  }
  if (!Number.isFinite(raw) || raw <= 0) return 6;
  return Math.min(12, Math.max(2, Math.round(raw)));
}

/** Product slots for the design, trimmed or extended to match the chosen item count. */
export function slotsFor(sel: DesignSelection): { category: string; item: string }[] {
  const type = designTypeOf(sel);
  const category = sel.decorCategory?.trim() || null;

  if (type === "Single Item") {
    const label = category ?? "decor accent";
    return [{ category: category ?? "Decor", item: label.toLowerCase() }];
  }

  if (type === "Wall Decor") {
    const count = itemCountFor(sel);
    const wall = [...WALL_SLOTS];
    if (category) {
      const match = wall.findIndex((s) => s.category.toLowerCase() === category.toLowerCase());
      if (match > 0) wall.unshift(...wall.splice(match, 1));
      else if (match < 0) wall.unshift({ category, item: category.toLowerCase() });
    }
    return wall.slice(0, count);
  }

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
  const rate = (() => {
    if (sel.discountFilter === "On Sale & Deals") return 0.35;
    if (sel.discountFilter === "Regular Price") return 0;
    if (percent && percent > 0 && percent < 100) return percent / 100;
    if (sel.discountFilter) return DISCOUNT_RATE[sel.discountFilter] ?? 0.2;
    return 0.2;
  })();

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
      discountPercent: Math.round(rate * 100),
      rating: Math.round((4.2 + ((i * 13) % 7) / 10) * 10) / 10,
      url: amazonSearchUrl(`${sel.designStyle} ${entry.item} ${sel.roomType}`),
    };
  });
}

export function currency(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
