// Server-only: image generation provider settings + routing. Keys never leave the server.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ImageProvider = "lovable" | "openai" | "replicate";

export type AiConfig = {
  provider: ImageProvider;
  openaiApiKey: string | null;
  replicateApiKey: string | null;
  replicateModel: string;
};

export const DEFAULT_REPLICATE_MODEL = "black-forest-labs/flux-1.1-pro";

export async function loadAiConfig(): Promise<AiConfig> {
  const { data } = await supabaseAdmin.from("ai_settings").select("*").eq("id", 1).maybeSingle();
  const provider = (data?.active_image_provider ?? "lovable") as ImageProvider;
  return {
    provider: provider === "openai" || provider === "replicate" ? provider : "lovable",
    openaiApiKey: data?.openai_api_key ?? null,
    replicateApiKey: data?.replicate_api_key ?? null,
    replicateModel: data?.replicate_model?.trim() || DEFAULT_REPLICATE_MODEL,
  };
}

function gatewayUrl(): string {
  const base = (process.env["AGW_URL"] ?? "https://ai.gateway.lovable.dev").replace(/\/$/, "");
  return base.endsWith("/v1") ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
}

function failure(status: number, detail: string, label: string): Error {
  console.error(`[decorai] ${label} image generation failed`, status, detail);
  if (status === 429) return new Error("Too many requests right now. Try again in a moment.");
  if (status === 401 || status === 403) return new Error(`The ${label} API key was rejected. Check it in Admin → AI generator settings.`);
  if (status === 402) return new Error("Image credits are exhausted. Please try again later.");
  return new Error("The design engine could not create this room. Please try again.");
}

async function generateWithLovable(prompt: string): Promise<string> {
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
  if (!response.ok) throw failure(response.status, await response.text(), "Lovable AI");
  const payload = (await response.json()) as {
    choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
  };
  const dataUrl = payload.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl) throw new Error("The design engine returned no image. Please try again.");
  return dataUrl;
}

async function generateWithOpenai(prompt: string, key: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt.slice(0, 3900),
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json",
    }),
  });
  if (!response.ok) throw failure(response.status, await response.text(), "OpenAI");
  const payload = (await response.json()) as { data?: { b64_json?: string; url?: string }[] };
  const first = payload.data?.[0];
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  if (first?.url) return await urlToDataUrl(first.url);
  throw new Error("The design engine returned no image. Please try again.");
}

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("The generated image could not be downloaded. Please try again.");
  const contentType = res.headers.get("content-type") ?? "image/png";
  const buffer = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buffer.length; i += 1) binary += String.fromCharCode(buffer[i]!);
  return `data:${contentType};base64,${btoa(binary)}`;
}

async function generateWithReplicate(prompt: string, key: string, model: string): Promise<string> {
  const slug = model.replace(/^https?:\/\/[^/]+\/?/, "").replace(/^models\//, "").trim();
  const response = await fetch(`https://api.replicate.com/v1/models/${slug}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      input: { prompt, aspect_ratio: "1:1", output_format: "png", num_outputs: 1 },
    }),
  });
  if (!response.ok) throw failure(response.status, await response.text(), "Replicate");

  let prediction = (await response.json()) as {
    id?: string;
    status?: string;
    output?: string | string[];
    error?: string;
    urls?: { get?: string };
  };

  const pollUrl = prediction.urls?.get ?? (prediction.id ? `https://api.replicate.com/v1/predictions/${prediction.id}` : null);
  for (let attempt = 0; attempt < 45 && prediction.status !== "succeeded" && pollUrl; attempt += 1) {
    if (prediction.status === "failed" || prediction.status === "canceled") break;
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(pollUrl, { headers: { Authorization: `Bearer ${key}` } });
    if (!poll.ok) throw failure(poll.status, await poll.text(), "Replicate");
    prediction = (await poll.json()) as typeof prediction;
  }

  if (prediction.status !== "succeeded") {
    console.error("[decorai] replicate prediction not ready", prediction.status, prediction.error);
    throw new Error("The design engine could not create this room. Please try again.");
  }
  const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!output) throw new Error("The design engine returned no image. Please try again.");
  if (output.startsWith("data:")) return output;
  return await urlToDataUrl(output);
}

export async function generateRoomImage(prompt: string, cfg?: AiConfig): Promise<string> {
  const config = cfg ?? (await loadAiConfig());
  if (config.provider === "openai") {
    if (!config.openaiApiKey) throw new Error("Add an OpenAI API key in Admin → AI generator settings.");
    return await generateWithOpenai(prompt, config.openaiApiKey);
  }
  if (config.provider === "replicate") {
    if (!config.replicateApiKey) throw new Error("Add a Replicate API key in Admin → AI generator settings.");
    return await generateWithReplicate(prompt, config.replicateApiKey, config.replicateModel);
  }
  return await generateWithLovable(prompt);
}
