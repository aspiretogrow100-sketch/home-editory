import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgePercent,
  Goal,
  Heart,
  ImagePlus,
  Lock,
  Palette,
  Ruler,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Unlock,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AdSlot } from "@/components/site/AdSlot";
import { CheckoutDialog } from "@/components/site/CheckoutDialog";
import { ShoppingList } from "@/components/site/ShoppingList";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  currency,
  DESIGN_TYPES,
  SINGLE_ITEM_CATEGORIES,
  WALL_CATEGORIES,
  type DesignSelection,
} from "@/lib/decor";
import {
  generateDesign,
  getUnlockPrice,
  listDesignOptions,
  listPublicGallery,
  unlockGeneration,
  type DesignOption,
  type GalleryEntry,
  type GenerationResult,
} from "@/lib/decor.functions";
import { saveRoom } from "@/lib/saved.functions";
import heroJapandiMain from "@/assets/hero-japandi-main.jpg";
import heroBedroom from "@/assets/hero-bedroom.jpg";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Interior AI Designer — Design Your Room With AI, Shop It On Amazon" },
      {
        name: "description",
        content:
          "Pick a room, style and budget. Interior AI Designer generates a photoreal interior and a discounted Amazon shopping list to match.",
      },
      { property: "og:title", content: "Interior AI Designer — Design Your Room With AI" },
      {
        property: "og:description",
        content: "Photoreal AI interiors plus a shoppable, discounted Amazon product list.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How does the $2.00 unlock work?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Paying a one-time micro-payment of $2.00 unlocks the complete Amazon shopping list and itemized direct links for that specific room design.",
              },
            },
            {
              "@type": "Question",
              name: "Is the shopping list globally unlocked?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. If any user unlocks a room's shopping list, it becomes permanently visible and free to view for everyone browsing the public gallery.",
              },
            },
            {
              "@type": "Question",
              name: "Are these real products from Amazon?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Every item in the generated shopping list is fetched in real time via the Rainforest API, matching real products currently available on Amazon.",
              },
            },
            {
              "@type": "Question",
              name: "Can I customize how many items appear in my room?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Select your preferred furniture density or item count, from minimalist setups to fully furnished spaces, during the generation wizard.",
              },
            },
            {
              "@type": "Question",
              name: "What are Deal Preferences?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Tailor product matches by selecting Low Budget Finds, On Sale & Deals, or Regular Price to fit your financial preferences.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: StudioPage,
});

const STEPS = ["Type & Room", "Size", "Style", "Budget / Colour", "Deals"] as const;

const HERO_DEALS = [
  { name: "Linen 3-seater sofa, terracotta", was: 649, now: 479, off: "26% off" },
  { name: "Walnut oval coffee table", was: 210, now: 164, off: "22% off" },
  { name: "Arched rattan floor lamp", was: 95, now: 72, off: "24% off" },
] as const;

const TRUST_AUDIENCES = [
  "Homeowners",
  "Renters",
  "First-time decorators",
  "Budget-conscious shoppers",
  "Room makeovers",
  "Interior inspiration",
] as const;

const TRUST_STATS = [
  { value: "100k+", label: "Images Generated" },
  { value: "10k+", label: "Users Loved" },
  { value: "97%+", label: "Satisfaction Rate" },
] as const;

const HOW_IT_WORKS = [
  {
    title: "Pick your room",
    description: "Choose the room you're designing — living room, bedroom, kitchen and more.",
    label: "Living room · Medium",
    icon: Ruler,
  },
  {
    title: "Set style & budget",
    description: "Pick a style, colour palette and budget — we handle the deals for you.",
    label: "Warm modern · Under $1,500",
    icon: Palette,
  },
  {
    title: "Get your design",
    description: "In seconds, Interior AI Designer creates a photoreal room built around every choice.",
    label: "AI design ready",
    icon: Wand2,
  },
  {
    title: "Shop the exact look",
    description: "Open your shopping list with matching Amazon items and live savings.",
    label: "Real products · Live deals",
    icon: Search,
  },
] as const;

const FAQS = [
  {
    question: "How does the {price} unlock work?",
    answer:
      "Paying a one-time micro-payment of {price} unlocks the complete Amazon shopping list and itemized direct links for that specific room design.",

  },
  {
    question: "Is the shopping list globally unlocked?",
    answer:
      "Yes! Thanks to our community sharing model, if any user unlocks a room's shopping list, it becomes permanently visible and free to view for everyone browsing the public gallery.",
  },
  {
    question: "Are these real products from Amazon?",
    answer:
      "Absolutely. Every item in the generated shopping list is fetched in real-time via the Rainforest API, matching real products currently available on Amazon.",
  },
  {
    question: "Can I customize how many items appear in my room?",
    answer:
      "Yes, you can select your preferred furniture density or item count, ranging from minimalist setups to fully furnished spaces, during the generation wizard steps.",
  },
  {
    question: "What are Deal Preferences?",
    answer:
      "You can tailor your product matches by selecting options like Low Budget Finds, On Sale & Deals, or Regular Price to fit your financial preferences.",
  },
] as const;

function roomSummary(item: GalleryEntry) {
  const parts = [`${item.itemCount} items`];
  if (item.total > 0) parts.push(`about ${currency(item.total)}`);
  if (item.savings > 0) parts.push(`you save ${currency(item.savings)}`);
  return parts.join(" · ");
}

function OptionCard({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string | undefined;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`lift-hover hover:lift-hover-on rounded-lg border px-3 py-2.5 text-left sm:px-4 sm:py-3 ${
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <span className="block text-sm font-medium">{label}</span>
      {hint ? <span className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{hint}</span> : null}
    </button>
  );
}

/** Reads a room photo and shrinks it in the browser so uploads stay small and fast. */
async function readRoomPhoto(file: File): Promise<string> {
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
    throw new Error("Please choose a PNG, JPG or WebP photo.");
  }
  if (file.size > 25 * 1024 * 1024) throw new Error("That photo is too large. Please pick a smaller one.");
  const bitmap = await createImageBitmap(file);
  const max = 1280;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("We couldn't read that photo. Please try another one.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

function StudioPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [selection, setSelection] = useState<Partial<DesignSelection>>({
    designType: "Full Room",
  });
  const [customStyle, setCustomStyle] = useState("");
  const [customBudget, setCustomBudget] = useState("");
  const [palette, setPalette] = useState<string | null>(null);
  const [squareFeet, setSquareFeet] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [communityRoom, setCommunityRoom] = useState("All rooms");
  const [roomPhoto, setRoomPhoto] = useState<string | null>(null);
  const scrollBeforeStep = useRef(0);

  // Keep the page exactly where it is when moving between wizard steps.
  function goToStep(next: number | ((s: number) => number)) {
    scrollBeforeStep.current = window.scrollY;
    setStep(next);
  }
  useEffect(() => {
    if (scrollBeforeStep.current) {
      window.scrollTo({ top: scrollBeforeStep.current });
      scrollBeforeStep.current = 0;
    }
  }, [step]);

  function scrollToDesignOnMobile() {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      document.getElementById("design-studio")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  async function handleRoomPhoto(file: File | undefined) {
    if (!file) return;
    try {
      setRoomPhoto(await readRoomPhoto(file));
      toast.success("Photo added — we'll redesign this exact room.");
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  const priceQuery = useQuery({
    queryKey: ["unlock-price"],
    queryFn: () => getUnlockPrice(),
  });
  const price = priceQuery.data?.price ?? 2;

  const optionsQuery = useQuery({
    queryKey: ["design-options"],
    queryFn: () => listDesignOptions(),
  });

  const options = useMemo(() => {
    const all: DesignOption[] = optionsQuery.data ?? [];
    const by = (kind: string) => all.filter((o) => o.kind === kind);
    return {
      rooms: by("room_type"),
      sizes: by("size"),
      densities: by("item_density"),
      styles: by("style"),
      budgets: by("budget_or_color"),
      palettes: by("color_palette"),
      discounts: by("deal_preference"),
    };
  }, [optionsQuery.data]);

  const designType = selection.designType ?? "Full Room";
  const categoryChoices: readonly string[] =
    designType === "Wall Decor" ? WALL_CATEGORIES : SINGLE_ITEM_CATEGORIES;
  const customRoom = options.rooms.some((room) => room.label === selection.roomType)
    ? ""
    : (selection.roomType ?? "");
  const customPiece = categoryChoices.includes(selection.decorCategory ?? "")
    ? ""
    : (selection.decorCategory ?? "");


  const runGenerate = useServerFn(generateDesign);
  const runUnlock = useServerFn(unlockGeneration);
  const fetchGallery = useServerFn(listPublicGallery);

  const galleryQuery = useQuery({
    queryKey: ["public-gallery"],
    queryFn: () => fetchGallery(),
  });

  const gallerySearch: { room?: string } =
    communityRoom === "All rooms" ? {} : { room: communityRoom };
  const communityRooms = ["All rooms", ...options.rooms.map((room) => room.label)];
  const recentRooms = (galleryQuery.data ?? [])
    .filter((room) => communityRoom === "All rooms" || room.roomType === communityRoom)
    .slice(0, 6);


  const generate = useMutation({
    mutationFn: (input: DesignSelection) => runGenerate({ data: input }),
    onSuccess: (data) => {
      setResult(data);
      setSaved(false);
      if (!data.saved && user) {
        toast.message("Design ready", { description: "We couldn't save it to your gallery this time." });
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const runSaveRoom = useServerFn(saveRoom);
  const save = useMutation({
    mutationFn: (generationId: string) => runSaveRoom({ data: { generationId } }),
    onSuccess: (data) => {
      setSaved(true);
      toast.success(
        data.alreadySaved ? "Already in your saved designs." : "Saved to your designs.",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const unlock = useMutation({
    mutationFn: (generationId: string) => runUnlock({ data: { generationId } }),
    onSuccess: () => {
      setResult((prev) => (prev ? { ...prev, isUnlocked: true } : prev));
      setCheckoutOpen(false);
      toast.success("Payment complete — your Amazon links are unlocked.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canContinue = [
    Boolean(selection.roomType),
    true,
    Boolean(selection.designStyle),
    Boolean(selection.budgetRange),
    true,
  ][step];

  const ready = Boolean(selection.roomType && selection.designStyle && selection.budgetRange);

  function handleUnlockClick() {
    if (!user) {
      toast.error("Sign in to unlock your shopping list.");
      navigate({ to: "/auth" });
      return;
    }
    if (!result?.generationId) {
      toast.error("Generate a design while signed in to unlock its links.");
      return;
    }
    setCheckoutOpen(true);
  }

  return (
    <div>
      <section className="relative min-h-[520px] overflow-hidden border-b border-border md:min-h-[600px] md:h-[72vh] md:max-h-[700px]">
        <img
          src={heroJapandiMain}
          alt="Sunlit Japandi living room generated with Interior AI Designer"
          width={1024}
          height={1280}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="hero-image-shade absolute inset-0" />
        <div className="relative mx-auto flex min-h-[520px] w-full max-w-7xl items-center px-4 pb-9 pt-20 sm:px-6 md:h-full md:min-h-0 md:pb-12 lg:px-8">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
            <div className="hero-reveal max-w-2xl text-background">
              <Badge className="mb-4 border-background/25 bg-foreground/45 text-background shadow-none backdrop-blur-md hover:bg-foreground/45">
                <Sparkles className="size-3.5 text-primary" /> AI rooms matched with real discounted Amazon finds
              </Badge>
              <h1 className="text-5xl leading-[0.94] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
                Design the room.<br />
                <span className="italic text-primary">Shop the look.</span>
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-background/80 md:text-lg">
                Set <span className="font-semibold text-background">your own budget</span> and deal
                filter — we design a photoreal room around it, then match every piece with real
                Amazon products at <span className="font-semibold text-background">today's discounts</span>.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  className="h-12 px-7 text-base shadow-[var(--shadow-lift)]"
                  onClick={() => document.getElementById("design-studio")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Start designing <ArrowRight />
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 border-background/35 bg-background/10 px-7 text-background shadow-none backdrop-blur-md hover:bg-background hover:text-foreground">
                  <Link to="/gallery">View real designs <ArrowUpRight /></Link>
                </Button>
              </div>
              <div className="mt-7 grid max-w-xl grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { icon: ShieldCheck, title: "No credit card", sub: "Designing is free" },
                  { icon: Goal, title: "Your budget", sub: "Rooms built to fit it" },
                  { icon: ShoppingBag, title: "Real Amazon", sub: "Live products & prices" },
                  { icon: BadgePercent, title: "Discounts", sub: "Deals surfaced first" },
                ].map(({ icon: Icon, title, sub }) => (
                  <div
                    key={title}
                    className="group rounded-xl border border-background/15 bg-background/10 px-3 py-3 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-background/15 hover:shadow-[0_14px_30px_-12px_rgba(0,0,0,0.55)]"
                  >
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary transition duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="size-4" strokeWidth={2.2} />
                    </span>
                    <p className="mt-2.5 text-[13px] font-semibold leading-tight text-background">{title}</p>
                    <p className="mt-1 text-xs leading-snug text-background/70">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="hero-reveal-delayed hidden lg:block">
              <div className="rounded-2xl border border-background/20 bg-foreground/40 p-5 shadow-[var(--shadow-lift)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-background/70">Straight from Amazon</p>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    <span className="size-1.5 rounded-full bg-primary" /> Live discounts
                  </span>
                </div>
                <div className="mt-4 space-y-2.5">
                  {HERO_DEALS.map((deal) => (
                    <div key={deal.name} className="flex items-center justify-between gap-3 rounded-lg border border-background/10 bg-background/10 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-background">{deal.name}</p>
                        <p className="mt-0.5 text-xs text-background/60">
                          <s>${deal.was}</s>{" "}
                          <span className="font-semibold text-background">${deal.now}</span>
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                        {deal.off}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t border-background/20 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-background/75">Total at your budget</span>
                    <span className="font-semibold text-background">
                      <s className="font-normal text-background/50">$954</s> $715
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/15">
                    <div className="h-full w-[75%] rounded-full bg-primary" />
                  </div>
                  <p className="mt-2 text-xs text-background/70">
                    Fits your $500–$800 budget — you save $239.
                  </p>
                </div>
                <p className="mt-3 text-center text-[11px] text-background/55">
                  What an unlocked shopping list looks like
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="design-studio"
        className="scroll-mt-16 border-b border-border bg-background py-5 lg:h-[calc(100svh-4rem)] lg:min-h-[600px]"
      >
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
          <div className="mb-4 shrink-0">
            <p className="text-xs font-semibold uppercase text-primary">Interior AI Designer studio</p>
            <h2 className="mt-1 text-3xl leading-none md:text-[2.15rem]">Make the room yours.</h2>
            <p className="mt-2 max-w-xl text-sm leading-5 text-muted-foreground">
              Choose your room, style and budget. We create the space and match every shoppable piece.
            </p>
          </div>
          <div
            className={`grid min-h-0 min-w-0 flex-1 gap-4 ${
              result || generate.isPending
                ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]"
                : "lg:grid-cols-[minmax(0,1fr)_220px]"
            }`}
          >
        <div className="min-h-0 min-w-0 space-y-6">
          <div className="surface-card flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-4 md:p-5">
            <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
              {STEPS.map((label, index) => {
                const done = index < step;
                const active = index === step;
                return (
                  <Button
                    key={label}
                    type="button"
                    size="sm"
                    variant={active ? "default" : done ? "secondary" : "outline"}
                    onClick={() => setStep(index)}
                    aria-current={active ? "step" : undefined}
                    className="h-7 shrink-0 gap-1.5 rounded-full border px-3 text-xs font-medium"
                  >
                    <span
                      className={`flex size-4 items-center justify-center rounded-full text-[10px] font-bold ${
                        active
                          ? "bg-primary-foreground text-primary"
                          : done
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted-foreground/15 text-muted-foreground"
                      }`}
                    >
                      {done ? "✓" : index + 1}
                    </span>
                    <span>{label}</span>
                  </Button>
                );
              })}
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] md:pr-3">
              {optionsQuery.isLoading ? <Skeleton className="h-40 w-full rounded-lg" /> : null}

              {step === 0 && !optionsQuery.isLoading ? (
                <div>
                  <h2 className="text-xl sm:text-2xl">What would you like to design?</h2>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {DESIGN_TYPES.map((type) => (
                      <OptionCard
                        key={type.label}
                        label={type.label}
                        hint={type.hint}
                        selected={designType === type.label}
                        onClick={() =>
                          setSelection((s) => ({ ...s, designType: type.label, decorCategory: null }))
                        }
                      />
                    ))}
                  </div>

                  <h3 className="mt-5 text-xl">
                    {designType === "Full Room"
                      ? "Which room are we designing?"
                      : designType === "Wall Decor"
                        ? "Which room is this wall in?"
                        : "Which room is this piece for?"}
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {options.rooms.map((room) => (
                      <OptionCard
                        key={room.id}
                        label={room.label}
                        hint={room.hint ?? undefined}
                        selected={selection.roomType === room.label}
                        onClick={() => setSelection((s) => ({ ...s, roomType: room.label }))}
                      />
                    ))}
                  </div>
                  {!options.rooms.length ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      No rooms available yet. Please check back soon.
                    </p>
                  ) : null}

                  <div className="mt-4 max-w-sm space-y-1.5">
                    <Label htmlFor="custom-room">Not listed? Type your own room</Label>
                    <Input
                      id="custom-room"
                      placeholder="e.g. Sunroom, Music Studio, Prayer Room"
                      value={customRoom}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSelection((s) => ({ ...s, roomType: value }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      We design and shop for exactly what you type here.
                    </p>
                  </div>

                  <div className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-3 sm:mt-6 sm:p-4">
                    <h3 className="text-base sm:text-lg">Use my room photo</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Optional — upload a photo and we redesign that exact room, keeping your walls,
                      windows and layout. No photo? We&apos;ll create the room for you.
                    </p>

                    {roomPhoto ? (
                      <div className="mt-3 flex items-center gap-3">
                        <img
                          src={roomPhoto}
                          alt="Your room photo"
                          className="size-20 rounded-lg object-cover"
                        />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Photo ready</p>
                          <div className="flex gap-2">
                            <Label
                              htmlFor="room-photo"
                              className="cursor-pointer text-xs font-medium text-primary underline"
                            >
                              Replace
                            </Label>
                            <button
                              type="button"
                              onClick={() => setRoomPhoto(null)}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <X className="size-3" /> Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Label
                        htmlFor="room-photo"
                        className="mt-3 flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium hover:border-primary"
                      >
                        <ImagePlus className="size-4" /> Upload a photo
                      </Label>
                    )}

                    <input
                      id="room-photo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => {
                        void handleRoomPhoto(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Best results: a bright, tidy photo taken from a corner of the room.
                    </p>
                  </div>



                  {designType !== "Full Room" ? (
                    <div className="mt-8">
                      <h3 className="text-base sm:text-xl">
                        {designType === "Wall Decor" ? "Lead the wall with" : "Which piece?"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {designType === "Wall Decor"
                          ? "Optional — we still add matching wall pieces around it."
                          : "Pick the single item you want to shop."}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
                        {categoryChoices.map((category) => (
                          <OptionCard
                            key={category}
                            label={category}
                            selected={selection.decorCategory === category}
                            onClick={() =>
                              setSelection((s) => ({
                                ...s,
                                decorCategory: s.decorCategory === category ? null : category,
                              }))
                            }
                          />
                        ))}
                      </div>
                      <div className="mt-5 max-w-sm space-y-1.5">
                        <Label htmlFor="custom-piece">Not listed? Type your own piece</Label>
                        <Input
                          id="custom-piece"
                          placeholder="e.g. Neon Sign, Macrame Hanger, Vintage Poster"
                          value={customPiece}
                          onChange={(event) => {
                            const value = event.target.value;
                            setSelection((s) => ({ ...s, decorCategory: value || null }));
                          }}
                        />
                        <p className="text-xs text-muted-foreground">
                          We design and shop for exactly what you type here.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {step === 1 && !optionsQuery.isLoading ? (
                <div>
                  <h2 className="text-xl sm:text-2xl">How big is the space?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Optional — skip if unsure.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
                    {options.sizes.map((size) => (
                      <OptionCard
                        key={size.id}
                        label={size.label}
                        hint={size.hint ?? undefined}
                        selected={selection.roomSize === size.label}
                        onClick={() =>
                          setSelection((s) => ({
                            ...s,
                            roomSize: s.roomSize === size.label ? null : size.label,
                          }))
                        }
                      />
                    ))}
                  </div>
                  {options.densities.length && designType !== "Single Item" ? (
                    <div className="mt-8">
                      <h3 className="text-base sm:text-xl">How full should the room be?</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Sets how many products we shop for.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
                        {options.densities.map((item) => (
                          <OptionCard
                            key={item.id}
                            label={item.label}
                            hint={item.hint ?? undefined}
                            selected={selection.itemDensity === item.label}
                            onClick={() =>
                              setSelection((s) => ({
                                ...s,
                                itemDensity: s.itemDensity === item.label ? null : item.label,
                                itemCount: s.itemDensity === item.label ? null : item.amount,
                              }))
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 max-w-xs space-y-1.5">
                    <Label htmlFor="sqft">Exact area (square feet)</Label>
                    <Input
                      id="sqft"
                      type="number"
                      min="1"
                      placeholder="e.g. 240"
                      value={squareFeet}
                      onChange={(e) => {
                        setSquareFeet(e.target.value);
                        const value = Number(e.target.value);
                        setSelection((s) => ({
                          ...s,
                          squareFeet: Number.isFinite(value) && value > 0 ? value : null,
                        }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      The design is scaled to this footprint when you fill it in.
                    </p>
                  </div>
                </div>
              ) : null}

              {step === 2 && !optionsQuery.isLoading ? (
                <div>
                  <h2 className="text-xl sm:text-2xl">Pick a design style</h2>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
                    {options.styles.map((style) => (
                      <OptionCard
                        key={style.id}
                        label={style.label}
                        hint={style.hint ?? undefined}
                        selected={selection.designStyle === style.label}
                        onClick={() => {
                          setCustomStyle("");
                          setSelection((s) => ({ ...s, designStyle: style.label }));
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-5 max-w-sm space-y-1.5">
                    <Label htmlFor="custom-style">Or describe your own style</Label>
                    <Input
                      id="custom-style"
                      placeholder="e.g. Japandi with warm oak"
                      value={customStyle}
                      onChange={(e) => {
                        setCustomStyle(e.target.value);
                        const value = e.target.value.trim();
                        setSelection((s) => ({ ...s, designStyle: value }));
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {step === 3 && !optionsQuery.isLoading ? (
                <div>
                  <h2 className="text-xl sm:text-2xl">What's your budget?</h2>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
                    {options.budgets.map((budget) => (
                      <OptionCard
                        key={budget.id}
                        label={budget.label}
                        hint={budget.hint ?? undefined}
                        selected={selection.budgetRange === budget.label}
                        onClick={() => {
                          setCustomBudget("");
                          setSelection((s) => ({
                            ...s,
                            budgetRange: budget.label,
                            budgetAmount: budget.amount,
                          }));
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-5 max-w-xs space-y-1.5">
                    <Label htmlFor="custom-budget">Or enter your own budget (USD)</Label>
                    <Input
                      id="custom-budget"
                      type="number"
                      min="1"
                      placeholder="e.g. 4500"
                      value={customBudget}
                      onChange={(e) => {
                        setCustomBudget(e.target.value);
                        const value = Number(e.target.value);
                        const valid = Number.isFinite(value) && value > 0;
                        setSelection((s) => ({
                          ...s,
                          budgetRange: valid ? `About $${value.toLocaleString("en-US")}` : "",
                          budgetAmount: valid ? value : null,
                        }));
                      }}
                    />
                  </div>

                  {options.palettes.length ? (
                    <div className="mt-8">
                      <h3 className="text-base sm:text-xl">Colour palette</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Optional — sets the mood of your room.</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-4 sm:gap-3">
                        {options.palettes.map((item) => (
                          <OptionCard
                            key={item.id}
                            label={item.label}
                            hint={item.hint ?? undefined}
                            selected={palette === item.label}
                            onClick={() => setPalette((p) => (p === item.label ? null : item.label))}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {step === 4 && !optionsQuery.isLoading ? (
                <div>
                  <h2 className="text-xl sm:text-2xl">Deal preferences</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Optional — how you want us to pick products.</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
                    {options.discounts.map((discount) => (
                      <OptionCard
                        key={discount.id}
                        label={discount.label}
                        hint={discount.hint ?? undefined}
                        selected={selection.discountFilter === discount.label}
                        onClick={() =>
                          setSelection((s) => ({
                            ...s,
                            discountFilter: s.discountFilter === discount.label ? null : discount.label,
                            discountPercent:
                              s.discountFilter === discount.label ? null : discount.amount,
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>


            <div className="mt-3 flex shrink-0 items-center justify-between gap-3 border-t border-border pt-3">
              <Button
                variant="ghost"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                <ArrowLeft className="size-4" /> Back
              </Button>

              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
                  Continue <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => generate.mutate({
                    ...(selection as DesignSelection),
                    roomPhoto,
                    designStyle: palette
                      ? `${selection.designStyle} with a ${palette.toLowerCase()} colour palette`
                      : (selection.designStyle as string),
                  })}
                  disabled={!ready || generate.isPending}
                >
                  <Wand2 className="size-4" />
                  {generate.isPending ? "Rendering your room…" : "Generate design"}
                </Button>
              )}
            </div>
          </div>

        </div>

        <aside
          className={`min-h-0 flex-col border-t border-border pt-4 lg:flex lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 ${
            result || generate.isPending ? "flex" : "hidden lg:flex"
          }`}
        >
          <p className="shrink-0 text-xs font-semibold uppercase text-primary">Your design</p>

          {!result && !generate.isPending ? (
            <>
              <p className="mt-3 font-display text-xl leading-tight">Five quick choices. One room made for you.</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Every option shapes both the finished image and its matching shopping list.</p>
              <div className="mt-auto pt-3"><AdSlot label="Sponsored" /></div>
            </>
          ) : null}


          {generate.isPending ? (
            <div className="mt-3">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Styling your {selection.designStyle?.toLowerCase()} {selection.roomType?.toLowerCase()}…
              </p>
            </div>
          ) : null}

          {result && !generate.isPending ? (
            <div className="mt-3 min-h-0 space-y-4 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] lg:flex-1">
              <figure className="surface-card overflow-hidden">
                <img
                  src={result.imageUrl}
                  alt={`AI generated ${selection.designStyle} ${selection.roomType} interior`}
                  className="aspect-[4/3] w-full object-cover"
                />
                <figcaption className="flex flex-wrap items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                  <Badge variant="secondary">{selection.roomType}</Badge>
                  {selection.roomSize ? <Badge variant="secondary">{selection.roomSize}</Badge> : null}
                  {selection.itemDensity ? (
                    <Badge variant="secondary">{selection.itemDensity}</Badge>
                  ) : null}
                  <Badge variant="secondary">{selection.designStyle}</Badge>
                  <Badge variant="secondary">{selection.budgetRange}</Badge>
                  {selection.discountFilter ? (
                    <Badge variant="secondary">{selection.discountFilter}</Badge>
                  ) : null}
                </figcaption>
              </figure>

              {result.generationId ? (
                <Button
                  className="w-full"
                  variant={saved ? "secondary" : "outline"}
                  onClick={() => save.mutate(result.generationId as string)}
                  disabled={save.isPending || saved}
                >
                  <Heart className={saved ? "size-4 fill-current" : "size-4"} />
                  {saved ? "Saved" : save.isPending ? "Saving…" : "Save design"}
                </Button>
              ) : null}

              {result.productsSource === "mock" ? (
                <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Showing sample items — live Amazon products appear once the Amazon integration is
                  configured in the admin dashboard.
                </p>
              ) : null}

              <ShoppingList
                products={result.products}
                unlocked={result.isUnlocked}
                price={price}
                busy={unlock.isPending}
                onUnlock={handleUnlockClick}
              />

              {!user ? (
                <p className="text-center text-xs text-muted-foreground">
                  <Link to="/auth" className="text-primary underline">
                    Create a free account
                  </Link>{" "}
                  to save this design and unlock its shopping links.
                </p>
              ) : null}

              <AdSlot label="Advertisement" />
            </div>
          ) : null}
        </aside>

          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background py-10 md:py-14" aria-labelledby="how-it-works-heading">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase text-primary">From idea to Amazon</p>
            <h2 id="how-it-works-heading" className="mt-2 text-4xl leading-none md:text-5xl">
              Your room, reimagined <span className="italic text-primary">in four steps.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
              No design experience needed. Choose what matters and Interior AI Designer handles the visualisation and product matching.
            </p>
          </div>

          <ol className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item, index) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="group min-w-[84%] snap-center sm:min-w-0">
                  <div className="surface-card overflow-hidden transition-transform duration-300 group-hover:-translate-y-1">
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted p-4">
                      {index === 2 ? (
                        <img src={heroBedroom} alt="Photoreal bedroom created by Interior AI Designer" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]" />
                      ) : index === 3 ? (
                        <div className="absolute inset-0 grid grid-cols-[0.9fr_1.1fr]">
                          <img src={heroJapandiMain} alt="Interior AI Designer room paired with Amazon products" loading="lazy" className="h-full w-full object-cover" />
                          <div className="flex flex-col justify-center gap-2 bg-card p-3">
                            {["Accent chair", "Floor lamp", "Wool rug"].map((product, productIndex) => (
                              <div key={product} className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{productIndex + 1}</span>
                                <span className="min-w-0 truncate text-[10px] font-medium">{product}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full flex-col justify-center rounded-md border border-border bg-card p-3 shadow-sm">
                          {index === 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                              {["Living room", "Bedroom", "Dining room", "Home office"].map((room, roomIndex) => (
                                <span key={room} className={`rounded-md border p-2 text-[10px] font-medium ${roomIndex === 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`}>{room}</span>
                              ))}
                            </div>
                          ) : (
                            <>
                              <p className="text-xs font-semibold">Warm modern</p>
                              <div className="mt-3 flex gap-2">
                                {["bg-primary", "bg-accent", "bg-secondary", "bg-foreground"].map((tone) => <span key={tone} className={`size-8 rounded-full border-2 border-card ring-1 ring-border ${tone}`} />)}
                              </div>
                              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full w-2/3 rounded-full bg-primary" /></div>
                              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>$500</span><span>$1,500</span><span>$3,000</span></div>
                            </>
                          )}
                        </div>
                      )}
                      <span className="absolute left-6 top-6 flex size-9 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background shadow-sm">
                        <Icon className="size-4" />
                      </span>
                      {index === 2 ? <span className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-background/90 px-3 py-1.5 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur">Design generated</span> : null}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{index + 1}</span>
                    <div className="min-w-0">
                      <h3 className="text-xl leading-tight">{item.title}</h3>
                      <p className="mt-2 text-sm leading-5 text-muted-foreground">{item.description}</p>
                      <p className="mt-3 text-[10px] font-semibold uppercase text-primary">{item.label}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>



      <section className="trust-grid border-b border-border py-10 md:py-14" aria-labelledby="trust-heading">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Designed for real homes</p>
            <h2 id="trust-heading" className="mx-auto mt-3 max-w-4xl text-3xl leading-tight md:text-5xl">
              A clearer way to turn inspiration into a room <span className="italic text-primary">you can actually shop.</span>
            </h2>
          </div>

          <div className="mt-8 grid divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="px-4 py-6 text-center md:py-8">
              <p className="font-display text-4xl text-primary md:text-5xl">Free</p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">Room design concepts</p>
            </div>
            <div className="px-4 py-6 text-center md:py-8">
              <p className="font-display text-4xl text-primary md:text-5xl">Real</p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">Amazon product matches</p>
            </div>
            <div className="px-4 py-6 text-center md:py-8">
              <p className="font-display text-4xl text-primary md:text-5xl">{currency(price)}</p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">One-time list unlock</p>
            </div>
          </div>

          <div className="mx-auto mt-7 flex max-w-5xl flex-wrap justify-center gap-2.5">
            {TRUST_AUDIENCES.map((audience) => (
              <span
                key={audience}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm"
              >
                {audience}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background py-12 md:py-16" aria-labelledby="stats-heading">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Trusted by professionals
            </p>
            <h2 id="stats-heading" className="mt-4 text-4xl leading-tight md:text-5xl">
              Join thousands of designers and room <span className="italic text-primary">owners.</span>
            </h2>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-8 text-center sm:grid-cols-3 md:mt-12">
            {TRUST_STATS.map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-5xl text-primary md:text-6xl">{stat.value}</p>
                <p className="mt-2 text-base font-medium text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/45 py-10 md:py-12" aria-labelledby="community-heading">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">Made by the community</p>
              <h2 id="community-heading" className="mt-2 text-3xl md:text-4xl">
                Recent rooms to inspire yours
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Explore fresh spaces from the Interior AI Designer community while you shape your own.
              </p>
            </div>
            <Button asChild variant="outline" className="hidden shrink-0 sm:inline-flex">
              <Link to="/gallery" search={gallerySearch}>View all rooms <ArrowUpRight /></Link>
            </Button>
          </div>

          <div className="mt-6 border-y border-border py-3">
            <div className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {communityRooms.map((room) => (
                <Button
                  key={room}
                  type="button"
                  size="sm"
                  variant={communityRoom === room ? "default" : "ghost"}
                  onClick={() => setCommunityRoom(room)}
                  className={`h-9 shrink-0 snap-start rounded-full px-4 ${
                    communityRoom === room ? "shadow-sm" : "border border-border bg-background"
                  }`}
                  aria-pressed={communityRoom === room}
                >
                  {room}
                </Button>
              ))}
            </div>
          </div>

          {galleryQuery.isLoading ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <Skeleton key={item} className="aspect-[4/3] w-full rounded-lg" />
              ))}
            </div>
          ) : recentRooms.length ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {recentRooms.map((item) => (
                <Link
                  key={item.id}
                  to="/gallery"
                  search={gallerySearch}
                  className="surface-card group overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]"
                  aria-label={`View ${item.designStyle} ${item.roomType} in the gallery`}
                >
                  {item.imageUrl ? (
                    <div className="overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={`${item.designStyle} ${item.roomType} created by the Interior AI Designer community`}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-muted" />
                  )}
                  <div className="p-2.5">
                    <div className="flex items-start justify-between gap-1.5">
                      <h3 className="text-sm leading-tight">{item.designStyle} {item.roomType}</h3>
                      <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      {roomSummary(item)}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      {item.isUnlocked ? <Unlock className="size-3" /> : <Lock className="size-3" />}
                      {item.isUnlocked ? "Unlocked" : currency(price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-8 border-y border-border py-10 text-center">
              <p className="font-display text-2xl">
                {communityRoom === "All rooms"
                  ? "The next inspiring room could be yours."
                  : `No ${communityRoom.toLowerCase()} designs yet.`}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {communityRoom === "All rooms"
                  ? "Create a room and share the inspiration."
                  : `Be the first to create a ${communityRoom.toLowerCase()} for the community.`}
              </p>
              <Button
                className="mt-4"
                onClick={() => document.getElementById("design-studio")?.scrollIntoView({ behavior: "smooth" })}
              >
                Start designing
              </Button>
            </div>
          )}

          <Button asChild variant="outline" className="mt-5 w-full sm:hidden">
            <Link to="/gallery" search={gallerySearch}>View all rooms <ArrowUpRight /></Link>
          </Button>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-border bg-background py-12 md:py-16" aria-labelledby="faq-heading">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 mx-auto h-px max-w-5xl bg-primary/55" />
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase text-primary">Good to know</p>
            <h2 id="faq-heading" className="mt-3 text-4xl leading-none md:text-5xl">
              Questions, <span className="italic text-primary">beautifully answered.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
              Everything you need to know about room generation, product matching and shared unlocks.
            </p>
          </div>
          <Accordion type="single" collapsible className="mx-auto mt-8 max-w-4xl border-t border-border md:mt-10">
            {FAQS.map((item, index) => (
              <AccordionItem key={item.question} value={`faq-${index}`} className="group border-border transition-colors data-[state=open]:border-primary/45">
                <AccordionTrigger className="relative justify-center gap-5 py-5 pl-12 pr-12 text-center hover:no-underline [&>svg]:absolute [&>svg]:right-4 [&>svg]:size-5 [&>svg]:text-primary md:py-6 md:pl-20 md:pr-20 md:[&>svg]:right-7">
                  <span className="absolute left-4 font-sans text-[0.65rem] font-semibold text-primary/70 md:left-7">
                    0{index + 1}
                  </span>
                  <h3 className="text-lg leading-tight transition-colors group-hover:text-primary md:text-xl">
                    {item.question.replaceAll("{price}", currency(price))}
                  </h3>
                </AccordionTrigger>
                <AccordionContent className="mx-auto max-w-2xl px-5 pb-6 text-center text-sm leading-6 text-muted-foreground md:px-10 md:text-base">
                  <span className="mx-auto mb-5 block h-px w-12 bg-primary/50" aria-hidden="true" />
                  {item.answer.replaceAll("{price}", currency(price))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <CheckoutDialog
        open={checkoutOpen}
        price={price}
        busy={unlock.isPending}
        onOpenChange={setCheckoutOpen}
        onConfirm={() => result?.generationId && unlock.mutate(result.generationId)}
        generationId={result?.generationId ?? null}
        onPaid={() => {
          setResult((prev) => (prev ? { ...prev, isUnlocked: true } : prev));
        }}
      />
    </div>
  );
}
