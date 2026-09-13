import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AmazonProduct } from "./decor";

export type SavedRoom = {
  id: string;
  generationId: string | null;
  roomType: string;
  style: string;
  budget: string;
  imageUrl: string | null;
  products: AmazonProduct[];
  isUnlocked: boolean;
  createdAt: string;
};

export const saveRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { generationId: string }) => {
    if (!input?.generationId) throw new Error("Generate and save a design first.");
    return { generationId: String(input.generationId) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: generation } = await supabase
      .from("generations")
      .select("*")
      .eq("id", data.generationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!generation) throw new Error("This design could not be found in your account.");

    const { data: existing } = await supabase
      .from("saved_rooms")
      .select("id")
      .eq("user_id", userId)
      .eq("generation_id", generation.id)
      .maybeSingle();

    if (existing) return { saved: true, alreadySaved: true };

    const { error } = await supabase.from("saved_rooms").insert({
      user_id: userId,
      generation_id: generation.id,
      room_type: generation.room_type,
      style: generation.design_style,
      budget: generation.budget_range,
      image_url: generation.image_url,
      shopping_list: generation.amazon_products,
      is_unlocked: generation.is_unlocked,
    });

    if (error) throw new Error("Could not save this design.");
    return { saved: true, alreadySaved: false };
  });

export const listSavedRooms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedRoom[]> => {
    const { supabase, userId } = context;

    const { data: rows } = await supabase
      .from("saved_rooms")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const list = rows ?? [];
    const paths = list.map((r) => r.image_url).filter(Boolean) as string[];
    const signedMap = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await supabase.storage
        .from("designs")
        .createSignedUrls(paths, 60 * 60);
      for (const entry of signed ?? []) {
        if (entry.path && entry.signedUrl) signedMap.set(entry.path, entry.signedUrl);
      }
    }

    // Unlocks are global: a design unlocked by anyone stays unlocked for everyone.
    const generationIds = list.map((r) => r.generation_id).filter(Boolean) as string[];
    const unlockedIds = new Set<string>();
    if (generationIds.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: gens } = await supabaseAdmin
        .from("generations")
        .select("id")
        .in("id", generationIds)
        .eq("is_unlocked", true);
      for (const g of gens ?? []) unlockedIds.add(g.id);
    }

    return list.map((row) => ({
      id: row.id,
      generationId: row.generation_id,
      roomType: row.room_type,
      style: row.style,
      budget: row.budget,
      imageUrl: row.image_url ? (signedMap.get(row.image_url) ?? null) : null,
      products: (row.shopping_list as unknown as AmazonProduct[]) ?? [],
      isUnlocked: row.is_unlocked || (row.generation_id ? unlockedIds.has(row.generation_id) : false),
      createdAt: row.created_at,
    }));
  });

export const deleteSavedRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Missing saved design.");
    return { id: String(input.id) };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saved_rooms")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error("Could not remove this saved design.");
    return { deleted: true };
  });
