import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookmarkCheck,
  Heart,
  Image as ImageIcon,
  Lock,
  ShoppingBag,
  Sparkles,
  Unlock,
  Wand2,
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


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DecorAI — Design Your Room With AI, Shop It On Amazon" },
      {
        name: "description",
        content:
          "Pick a room, style and budget. DecorAI generates a photoreal interior and a discounted Amazon shopping list to match.",
      },
      { property: "og:title", content: "DecorAI — Design Your Room With AI" },
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

const FEATURES = [
  {
    title: "AI Photorealistic Renders",
    description: "High-quality room designs created around your style, space and budget in seconds.",
    icon: ImageIcon,
  },
  {
    title: "Direct Amazon Shopping",
    description: "One-click access to the exact matching items selected for your finished room.",
    icon: ShoppingBag,
  },
  {
    title: "Save & Unlock",
    description: "Save favourites and benefit from shopping lists unlocked by the DecorAI community.",
    icon: BookmarkCheck,
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
      className={`lift-hover hover:lift-hover-on rounded-lg border px-4 py-3 text-left ${
        selected
          ? "border-primary bg-primary/10 ring-1 ring-primary"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <span className="block text-sm font-medium">{label}</span>
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </button>
  );
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

  const recentRooms = (galleryQuery.data ?? []).slice(0, 6);


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
          alt="Sunlit Japandi living room generated with DecorAI"
          width={1024}
          height={1280}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="hero-image-shade absolute inset-0" />
        <div className="relative mx-auto flex min-h-[520px] w-full max-w-7xl items-end px-4 pb-9 pt-20 sm:px-6 md:h-full md:min-h-0 md:items-center md:pb-12 lg:px-8">
          <div className="hero-reveal max-w-2xl text-background">
            <Badge className="mb-4 border-background/25 bg-foreground/45 text-background shadow-none backdrop-blur-md hover:bg-foreground/45">
              <Sparkles className="size-3.5 text-primary" /> AI interior design + real product matches
            </Badge>
            <h1 className="text-5xl leading-[0.94] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
              Design the room.<br />
              <span className="italic text-primary">Shop the look.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-background/80 md:text-lg">
              Create a photoreal interior around your space, style and budget—then discover the
              matching pieces on Amazon.
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
            <div className="mt-6 grid max-w-xl grid-cols-3 border-t border-background/25 pt-4 text-background/75">
              <div><p className="text-xs font-semibold uppercase">Create</p><p className="mt-1 text-sm">Photoreal rooms</p></div>
              <div className="border-l border-background/25 pl-4"><p className="text-xs font-semibold uppercase">Match</p><p className="mt-1 text-sm">Real products</p></div>
              <div className="border-l border-background/25 pl-4"><p className="text-xs font-semibold uppercase">Shop</p><p className="mt-1 text-sm">Direct on Amazon</p></div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="design-studio"
        className={`scroll-mt-16 border-b border-border bg-background py-5 ${
          result || generate.isPending ? "" : "h-[calc(100svh-4rem)] min-h-[560px]"
        }`}
      >
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
          <div className="mb-4 grid shrink-0 gap-2 md:grid-cols-[0.8fr_1.2fr] md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">DecorAI studio</p>
              <h2 className="mt-1 text-3xl leading-none md:text-[2.15rem]">Make the room yours.</h2>
            </div>
            <p className="max-w-xl text-sm leading-5 text-muted-foreground md:justify-self-end">
              Choose your room, style and budget. We create the space and match every shoppable piece.
            </p>
          </div>
          <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-h-0 min-w-0 space-y-6">
          <div className="surface-card flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-4 md:p-5">
            <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
              {STEPS.map((label, index) => (
                <Button
                  key={label}
                  type="button"
                  size="sm"
                  variant={index === step ? "default" : "ghost"}
                  onClick={() => setStep(index)}
                  className={`h-7 shrink-0 rounded-full px-3 text-xs ${
                    index < step ? "text-accent-foreground" : ""
                  }`}
                >
                  <span className="font-semibold">{index + 1}</span>
                  <span>{label}</span>
                </Button>
              ))}
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] md:pr-3">
              {optionsQuery.isLoading ? <Skeleton className="h-40 w-full rounded-lg" /> : null}

              {step === 0 && !optionsQuery.isLoading ? (
                <div>
                  <h2 className="text-2xl">What would you like to design?</h2>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
                  <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
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

                  {designType !== "Full Room" ? (
                    <div className="mt-8">
                      <h3 className="text-xl">
                        {designType === "Wall Decor" ? "Lead the wall with" : "Which piece?"}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {designType === "Wall Decor"
                          ? "Optional — we still add matching wall pieces around it."
                          : "Pick the single item you want to shop."}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                  <h2 className="text-2xl">How big is the space?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Optional — skip if unsure.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                      <h3 className="text-xl">How full should the room be?</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Sets how many products we shop for.
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                  <h2 className="text-2xl">Pick a design style</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                  <h2 className="text-2xl">What's your budget?</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                      <h3 className="text-xl">Colour palette</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Optional — sets the mood of your room.</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
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
                  <h2 className="text-2xl">Deal preferences</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Optional — how you want us to pick products.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
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

          {generate.isPending ? (
            <div className="surface-card p-6">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Styling your {selection.designStyle?.toLowerCase()} {selection.roomType?.toLowerCase()}…
              </p>
            </div>
          ) : null}

          {result && !generate.isPending ? (
            <div className="space-y-6">
              <figure className="surface-card overflow-hidden">
                <img
                  src={result.imageUrl}
                  alt={`AI generated ${selection.designStyle} ${selection.roomType} interior`}
                  className="aspect-[4/3] w-full object-cover"
                />
                <figcaption className="flex flex-wrap items-center gap-2 px-5 py-4 text-xs text-muted-foreground">
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
                  variant={saved ? "secondary" : "outline"}
                  onClick={() => save.mutate(result.generationId as string)}
                  disabled={save.isPending || saved}
                >
                  <Heart className={saved ? "size-4 fill-current" : "size-4"} />
                  {saved ? "Saved" : save.isPending ? "Saving…" : "Save design"}
                </Button>
              ) : null}

              {result.productsSource === "mock" ? (
                <p className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
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
                <p className="text-center text-sm text-muted-foreground">
                  <Link to="/auth" className="text-primary underline">
                    Create a free account
                  </Link>{" "}
                  to save this design and unlock its shopping links.
                </p>
              ) : null}

              <AdSlot label="Advertisement" />
            </div>
          ) : null}
        </div>

        <aside className="hidden min-h-0 lg:flex lg:flex-col lg:border-l lg:border-border lg:pl-5">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">How it works</p>
            <ol className="mt-3 space-y-3">
              <li className="border-t border-border pt-2"><span className="text-xs text-muted-foreground">01</span><h3 className="text-base">Set your vision</h3><p className="text-xs leading-4 text-muted-foreground">Room, style, budget and deals.</p></li>
              <li className="border-t border-border pt-2"><span className="text-xs text-muted-foreground">02</span><h3 className="text-base">See the design</h3><p className="text-xs leading-4 text-muted-foreground">A photoreal concept made for you.</p></li>
              <li className="border-t border-border pt-2"><span className="text-xs text-muted-foreground">03</span><h3 className="text-base">Shop the room</h3><p className="text-xs leading-4 text-muted-foreground">Open exact Amazon matches.</p></li>
            </ol>
          </div>
          <div className="mt-auto pt-3"><AdSlot label="Sponsored" /></div>
        </aside>
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
                Explore fresh spaces from the DecorAI community while you shape your own.
              </p>
            </div>
            <Button asChild variant="outline" className="hidden shrink-0 sm:inline-flex">
              <Link to="/gallery">View all rooms <ArrowUpRight /></Link>
            </Button>
          </div>

          {galleryQuery.isLoading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="aspect-[4/3] w-full rounded-lg" />
              ))}
            </div>
          ) : recentRooms.length ? (
            <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
              {recentRooms.map((item) => (
                <Link
                  key={item.id}
                  to="/gallery"
                  className="surface-card group min-w-[82%] snap-start overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)] sm:min-w-0"
                  aria-label={`View ${item.designStyle} ${item.roomType} in the gallery`}
                >
                  {item.imageUrl ? (
                    <div className="overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={`${item.designStyle} ${item.roomType} created by the DecorAI community`}
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-muted" />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl leading-tight">{item.designStyle} {item.roomType}</h3>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{roomSummary(item)}</p>
                      </div>
                      <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                    <Badge
                      variant={item.isUnlocked ? "secondary" : "outline"}
                      className="mt-3"
                    >
                      {item.isUnlocked ? <Unlock className="size-3" /> : <Lock className="size-3" />}
                      {item.isUnlocked ? "Unlocked" : `Locked · ${currency(price)}`}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-8 border-y border-border py-10 text-center">
              <p className="font-display text-2xl">The next inspiring room could be yours.</p>
              <Button
                className="mt-4"
                onClick={() => document.getElementById("design-studio")?.scrollIntoView({ behavior: "smooth" })}
              >
                Start designing
              </Button>
            </div>
          )}

          <Button asChild variant="outline" className="mt-5 w-full sm:hidden">
            <Link to="/gallery">View all rooms <ArrowUpRight /></Link>
          </Button>
        </div>
      </section>

      <section className="feature-showcase py-10 text-primary-foreground md:py-14" aria-labelledby="features-heading">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 border-b border-primary-foreground/20 pb-7 md:grid-cols-[0.55fr_1.45fr] md:items-end md:pb-8">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">From idea to finished room</p>
              <p className="mt-3 max-w-xs text-sm leading-6 text-primary-foreground/60">
                One considered path from inspiration to a room you can actually bring home.
              </p>
            </div>
            <h2 id="features-heading" className="max-w-4xl text-3xl leading-[1.02] md:text-5xl">
              Everything you need to design and shop <span className="italic text-primary">with confidence.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="feature-item group relative border-b border-primary-foreground/20 py-6 md:min-h-60 md:border-b-0 md:border-r md:px-7 md:py-8 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
                >
                  <div className="flex items-start justify-between gap-6">
                    <span className="font-display text-5xl italic text-primary-foreground/12 transition-colors duration-500 group-hover:text-primary/35">
                      0{index + 1}
                    </span>
                    <span className="flex size-11 items-center justify-center rounded-full border border-primary-foreground/25 text-primary transition-colors duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="size-5" />
                    </span>
                  </div>
                  <div className="mt-7 md:mt-10">
                    <h3 className="text-2xl">{feature.title}</h3>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-primary-foreground/60 md:text-base">
                      {feature.description}
                    </p>
                  </div>
                  <span aria-hidden="true" className="absolute bottom-0 left-0 h-px w-0 bg-primary transition-all duration-500 group-hover:w-full" />
                </article>
              );
            })}
          </div>
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
