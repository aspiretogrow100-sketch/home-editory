import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  listDesignOptions,
  listPartnerProducts,
  lookupPartnerProduct,
  savePartnerProducts,
} from "@/lib/decor.functions";
import { PARTNER_PRESETS, parseAsin, partnersForRoom, type PartnerProduct } from "@/lib/partners";

type Draft = PartnerProduct & { roomsText: string };

function toDraft(product: PartnerProduct): Draft {
  return { ...product, roomsText: "" };
}

function newDraft(preset?: (typeof PARTNER_PRESETS)[number]): Draft {
  return {
    id: crypto.randomUUID(),
    brand: preset?.brand ?? "CondoMounts",
    name: "",
    asin: null,
    url: "",
    image: null,
    rooms: preset ? [...preset.rooms] : [],
    promptHint: preset?.promptHint ?? "",
    active: true,
    roomsText: "",
  };
}

/** Rooms typed in the free-text box are added to the product's room list. */
function withTypedRooms(draft: Draft): PartnerProduct {
  const typed = draft.roomsText
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  const rooms = [...draft.rooms];
  for (const room of typed) {
    if (!rooms.some((r) => r.toLowerCase() === room.toLowerCase())) rooms.push(room);
  }
  const { roomsText: _roomsText, ...product } = draft;
  return { ...product, rooms };
}

export function PartnerProductsPanel() {
  const queryClient = useQueryClient();
  const load = useServerFn(listPartnerProducts);
  const save = useServerFn(savePartnerProducts);
  const lookup = useServerFn(lookupPartnerProduct);

  const productsQuery = useQuery({
    queryKey: ["admin-partner-products"],
    queryFn: () => load({ data: undefined }),
  });
  const roomsQuery = useQuery({ queryKey: ["design-options"], queryFn: () => listDesignOptions() });

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [dirty, setDirty] = useState(false);
  const [lookingUp, setLookingUp] = useState<string | null>(null);

  useEffect(() => {
    if (productsQuery.data && !dirty) setDrafts(productsQuery.data.map(toDraft));
  }, [productsQuery.data, dirty]);

  const wizardRooms = useMemo(
    () => (roomsQuery.data ?? []).filter((o) => o.kind === "room_type").map((o) => o.label),
    [roomsQuery.data],
  );

  const update = (id: string, patch: Partial<Draft>) => {
    setDirty(true);
    setDrafts((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { products: drafts.map(withTypedRooms) } }),
    onSuccess: (saved) => {
      toast.success("Partner products saved.");
      setDirty(false);
      setDrafts(saved.map(toDraft));
      queryClient.invalidateQueries({ queryKey: ["admin-partner-products"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function fetchDetails(draft: Draft) {
    if (!parseAsin(draft.url)) {
      toast.error("Paste the Amazon product link first (the page of one product, not the store).");
      return;
    }
    setLookingUp(draft.id);
    try {
      const result = await lookup({ data: { url: draft.url } });
      update(draft.id, {
        asin: result.asin,
        name: result.name ?? draft.name,
        image: result.image ?? draft.image,
      });
      if (result.note) toast.message(result.note);
      else toast.success("Name and photo filled in from Amazon.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lookup failed.");
    } finally {
      setLookingUp(null);
    }
  }

  // Which product a design of each room would get (coverage overview).
  const coverageRooms = useMemo(() => {
    const extra = drafts.flatMap((d) => d.rooms);
    const all = [...wizardRooms];
    for (const room of extra) {
      if (!all.some((r) => r.toLowerCase() === room.toLowerCase())) all.push(room);
    }
    const current = drafts.map(withTypedRooms);
    return all.map((room) => ({ room, products: partnersForRoom(current, room) }));
  }, [drafts, wizardRooms]);

  return (
    <div className="mt-4 space-y-6">
      <div className="surface-card p-6">
        <h2 className="text-2xl">Partner products</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Products from a client's Amazon store (e.g. CondoMounts, ZeboZap). When someone designs a
          full room that matches a product's rooms, one matching product is placed in the AI image
          and shown as a <strong>Featured partner</strong> card that stays visible even when the
          shopping list is locked. Rooms with no product get none.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {PARTNER_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              size="sm"
              variant="outline"
              onClick={() => {
                setDirty(true);
                setDrafts((list) => [...list, newDraft(preset)]);
              }}
            >
              <Plus className="size-3.5" /> {preset.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDirty(true);
              setDrafts((list) => [...list, newDraft()]);
            }}
          >
            <Plus className="size-3.5" /> Blank product
          </Button>
        </div>
      </div>

      {productsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : drafts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No partner products yet. Start with one of the buttons above, then paste the product's
          Amazon link.
        </p>
      ) : null}

      {drafts.map((draft, index) => (
        <div key={draft.id} className="surface-card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-display text-xl">Product {index + 1}</span>
              {draft.active ? <Badge>Active</Badge> : <Badge variant="outline">Off</Badge>}
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={draft.active}
                  onCheckedChange={(v) => update(draft.id, { active: v })}
                />
                Show in designs
              </label>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remove product"
                onClick={() => {
                  setDirty(true);
                  setDrafts((list) => list.filter((d) => d.id !== draft.id));
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`url-${draft.id}`}>Amazon product link</Label>
            <div className="flex gap-2">
              <Input
                id={`url-${draft.id}`}
                placeholder="https://www.amazon.com/dp/B0CS31P96H"
                value={draft.url}
                onChange={(e) =>
                  update(draft.id, { url: e.target.value, asin: parseAsin(e.target.value) })
                }
              />
              <Button
                variant="outline"
                onClick={() => fetchDetails(draft)}
                disabled={lookingUp === draft.id}
              >
                <Download className="size-4" />
                {lookingUp === draft.id ? "Fetching…" : "Fetch"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {draft.asin
                ? `ASIN ${draft.asin} · your Associate tag is added automatically.`
                : "Open one product in the client's store and copy its link."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
            <div className="space-y-1.5">
              <Label htmlFor={`brand-${draft.id}`}>Brand</Label>
              <Input
                id={`brand-${draft.id}`}
                list="partner-brands"
                value={draft.brand}
                onChange={(e) => update(draft.id, { brand: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`name-${draft.id}`}>Product name</Label>
              <Input
                id={`name-${draft.id}`}
                value={draft.name}
                onChange={(e) => update(draft.id, { name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[6rem_1fr]">
            <div className="flex size-24 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
              {draft.image ? (
                <img src={draft.image} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">No photo</span>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`image-${draft.id}`}>Product photo link</Label>
              <Input
                id={`image-${draft.id}`}
                placeholder="https://m.media-amazon.com/images/…"
                value={draft.image ?? ""}
                onChange={(e) => update(draft.id, { image: e.target.value || null })}
              />
              <p className="text-xs text-muted-foreground">
                Filled by Fetch when the Amazon integration is set up. The photo is also sent to the
                AI so the room shows this exact product.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rooms this product appears in</Label>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...wizardRooms, ...draft.rooms])].map((room) => {
                const on = draft.rooms.some((r) => r.toLowerCase() === room.toLowerCase());
                return (
                  <button
                    key={room}
                    type="button"
                    onClick={() =>
                      update(draft.id, {
                        rooms: on
                          ? draft.rooms.filter((r) => r.toLowerCase() !== room.toLowerCase())
                          : [...draft.rooms, room],
                      })
                    }
                    className={
                      on
                        ? "rounded-full border border-primary bg-primary px-3 py-1 text-xs text-primary-foreground"
                        : "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                    }
                  >
                    {room}
                  </button>
                );
              })}
            </div>
            <Input
              placeholder="Add other rooms, comma separated (e.g. Patio, Gazebo)"
              value={draft.roomsText}
              onChange={(e) => update(draft.id, { roomsText: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Outdoor rooms only appear for shoppers once they exist in Wizard options → room type.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`hint-${draft.id}`}>
              How it should look in the room (sent to the AI)
            </Label>
            <Textarea
              id={`hint-${draft.id}`}
              rows={2}
              value={draft.promptHint}
              onChange={(e) => update(draft.id, { promptHint: e.target.value })}
            />
          </div>
        </div>
      ))}

      <datalist id="partner-brands">
        <option value="CondoMounts" />
        <option value="ZeboZap" />
      </datalist>

      <div className="flex items-center gap-3">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !dirty}>
          {saveMutation.isPending ? "Saving…" : "Save partner products"}
        </Button>
        {dirty ? <span className="text-sm text-muted-foreground">Unsaved changes</span> : null}
      </div>

      {coverageRooms.length ? (
        <div className="surface-card p-6">
          <h3 className="text-xl">Which rooms get a product</h3>
          <ul className="mt-3 divide-y divide-border text-sm">
            {coverageRooms.map(({ room, products }) => (
              <li key={room} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{room}</span>
                <span className="text-muted-foreground">
                  {products.length
                    ? products.map((p) => `${p.brand}: ${p.name || "unnamed"}`).join(" · ")
                    : "No partner product"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            When a room has several products, each new design picks one at random.
          </p>
        </div>
      ) : null}
    </div>
  );
}
