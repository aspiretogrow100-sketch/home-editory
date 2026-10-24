import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { DollarSign, Images, Plus, ShoppingBag, Sparkles, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PartnerProductsPanel } from "@/components/admin/PartnerProductsPanel";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";
import { currency, DEFAULT_IMAGE_PROMPT, PROMPT_PLACEHOLDERS } from "@/lib/decor";
import {
  claimFirstAdmin,
  deleteDesignOption,
  getAdminOverview,
  getAiSettings,
  getAmazonSettings,
  getImagePromptTemplate,
  listAllDesignOptions,
  saveAiSettings,
  saveAmazonSettings,
  saveDesignOption,
  getSocialLinks,
  setImagePromptTemplate,
  setSocialLinks,
  setUnlockPrice,
  SOCIAL_KEYS,
  type SocialLinks,
  testAmazonConnection,
} from "@/lib/decor.functions";
import { getPaddleSettings, savePaddleSettings } from "@/lib/paddle.functions";
import { getWhopSettings, saveWhopSettings } from "@/lib/whop.functions";

function AiSettingsPanel() {
  const queryClient = useQueryClient();
  const load = useServerFn(getAiSettings);
  const save = useServerFn(saveAiSettings);

  const settings = useQuery({
    queryKey: ["ai-settings"],
    queryFn: () => load({ data: undefined }),
  });

  const [form, setForm] = useState({
    provider: "lovable" as "lovable" | "openai" | "replicate",
    replicateModel: "black-forest-labs/flux-1.1-pro",
    openaiApiKey: "",
    replicateApiKey: "",
  });

  useEffect(() => {
    if (settings.data) {
      setForm((f) => ({
        ...f,
        provider: settings.data.provider,
        replicateModel: settings.data.replicateModel,
      }));
    }
  }, [settings.data]);

  const saveMutation = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => {
      toast.success("AI generator settings saved.");
      setForm((f) => ({ ...f, openaiApiKey: "", replicateApiKey: "" }));
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const d = settings.data;

  return (
    <div className="surface-card mt-4 max-w-2xl p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" />
        <h2 className="text-2xl">AI generator settings</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose which model renders room images. Keys stay on the server — leave a key field empty to
        keep the saved value.
      </p>

      <div className="mt-6 space-y-2">
        <Label>Active image generation model</Label>
        <RadioGroup
          value={form.provider}
          onValueChange={(v) => setForm({ ...form, provider: v as typeof form.provider })}
          className="grid gap-3 sm:grid-cols-3"
        >
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
            <RadioGroupItem value="lovable" id="ai-lovable" className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">Built-in AI</span>
              <span className="block text-xs text-muted-foreground">No key needed. Current default.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
            <RadioGroupItem value="openai" id="ai-openai" className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">DALL·E 3</span>
              <span className="block text-xs text-muted-foreground">Uses your OpenAI key.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
            <RadioGroupItem value="replicate" id="ai-replicate" className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">Replicate</span>
              <span className="block text-xs text-muted-foreground">Flux.1 / SDXL models.</span>
            </span>
          </label>
        </RadioGroup>
      </div>

      <div className="mt-6 grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="openai-key">OpenAI API key</Label>
          <Input
            id="openai-key"
            type="password"
            autoComplete="off"
            placeholder={d?.openaiKeyHint ?? "sk-..."}
            value={form.openaiApiKey}
            onChange={(e) => setForm({ ...form, openaiApiKey: e.target.value })}
          />
          {d?.openaiKeyHint ? (
            <p className="text-xs text-muted-foreground">Saved key: {d.openaiKeyHint}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="replicate-key">Replicate API key</Label>
          <Input
            id="replicate-key"
            type="password"
            autoComplete="off"
            placeholder={d?.replicateKeyHint ?? "r8_..."}
            value={form.replicateApiKey}
            onChange={(e) => setForm({ ...form, replicateApiKey: e.target.value })}
          />
          {d?.replicateKeyHint ? (
            <p className="text-xs text-muted-foreground">Saved key: {d.replicateKeyHint}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="replicate-model">Replicate model</Label>
          <Input
            id="replicate-model"
            placeholder="black-forest-labs/flux-1.1-pro"
            value={form.replicateModel}
            onChange={(e) => setForm({ ...form, replicateModel: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            For example black-forest-labs/flux-1.1-pro or stability-ai/sdxl.
          </p>
        </div>
      </div>

      <Button
        className="mt-6"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || settings.isLoading}
      >
        {saveMutation.isPending ? "Saving..." : "Save changes"}
      </Button>
    </div>
  );
}


function PaddlePanel() {
  const load = useServerFn(getPaddleSettings);
  const save = useServerFn(savePaddleSettings);
  const queryClient = useQueryClient();

  const settings = useQuery({
    queryKey: ["paddle-settings"],
    queryFn: () => load({ data: undefined }),
  });

  const [form, setForm] = useState({
    enabled: false,
    environment: "sandbox" as "sandbox" | "production",
    clientToken: "",
    priceId: "",
    apiKey: "",
    webhookSecret: "",
  });

  useEffect(() => {
    if (settings.data) {
      setForm((f) => ({
        ...f,
        enabled: settings.data.enabled,
        environment: settings.data.environment,
        clientToken: settings.data.clientToken ?? "",
        priceId: settings.data.priceId ?? "",
      }));
    }
  }, [settings.data]);

  const saveMutation = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => {
      toast.success("Paddle settings saved.");
      setForm((f) => ({ ...f, apiKey: "", webhookSecret: "" }));
      queryClient.invalidateQueries({ queryKey: ["paddle-settings"] });
      queryClient.invalidateQueries({ queryKey: ["paddle-checkout-info"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="surface-card mt-4 max-w-2xl p-6">
      <h2 className="text-2xl">Paddle payments</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add your Paddle client-side token, product price ID and API key. Until all three are saved,
        checkout stays in demo mode.
      </p>

      <div className="mt-6 space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          Show Paddle at checkout
        </label>
        <div className="space-y-2">
          <Label>Mode</Label>
          <RadioGroup
            value={form.environment}
            onValueChange={(v) => setForm({ ...form, environment: v as "sandbox" | "production" })}
            className="grid gap-2 sm:grid-cols-2"
          >
            <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <RadioGroupItem value="sandbox" /> Sandbox (testing)
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <RadioGroupItem value="production" /> Production (live)
            </label>
          </RadioGroup>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="paddle-token">Client-side token</Label>
          <Input
            id="paddle-token"
            placeholder="live_xxx or test_xxx"
            value={form.clientToken}
            onChange={(e) => setForm({ ...form, clientToken: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="paddle-price">Price ID</Label>
          <Input
            id="paddle-price"
            placeholder="pri_01h..."
            value={form.priceId}
            onChange={(e) => setForm({ ...form, priceId: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Create a one-time price in Paddle for the shopping-list unlock and paste its ID here.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="paddle-api">API key</Label>
          <Input
            id="paddle-api"
            type="password"
            autoComplete="off"
            placeholder={settings.data?.apiKeyHint ?? "pdl_live_..."}
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to keep the saved key. Used only on the server to verify payments.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="paddle-webhook">Webhook secret</Label>
          <Input
            id="paddle-webhook"
            type="password"
            autoComplete="off"
            placeholder={settings.data?.webhookSecretHint ?? "pdl_ntfset_..."}
            value={form.webhookSecret}
            onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            In Paddle, add this notification URL: {settings.data?.webhookUrl ?? "/api/public/paddle-webhook"}
          </p>
        </div>
      </div>

      <Button
        className="mt-6"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || settings.isLoading}
      >
        {saveMutation.isPending ? "Saving..." : "Save changes"}
      </Button>
    </div>
  );
}

function WhopPanel() {
  const load = useServerFn(getWhopSettings);
  const save = useServerFn(saveWhopSettings);
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["whop-settings"], queryFn: () => load() });
  const [form, setForm] = useState({ enabled: false, planId: "", apiKey: "" });

  useEffect(() => {
    if (settings.data) {
      setForm((f) => ({ ...f, enabled: settings.data.enabled, planId: settings.data.planId ?? "" }));
    }
  }, [settings.data]);

  const saveMutation = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => {
      toast.success("Whop settings saved.");
      setForm((f) => ({ ...f, apiKey: "" }));
      queryClient.invalidateQueries({ queryKey: ["whop-settings"] });
      queryClient.invalidateQueries({ queryKey: ["whop-checkout-info"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="surface-card mt-4 max-w-2xl p-6">
      <h2 className="text-2xl">Whop payments</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Whop is the main checkout — buyers pay here first. Turn it on and add your Whop API key plus
        the plan ID of a one-time unlock plan. Paddle stays as a backup payment option.
      </p>
      <div className="mt-6 space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          Show Whop at checkout
        </label>
        <div className="space-y-1.5">
          <Label htmlFor="whop-plan">Plan ID</Label>
          <Input
            id="whop-plan"
            placeholder="plan_xxxxxxxxxxxxx"
            value={form.planId}
            onChange={(e) => setForm({ ...form, planId: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="whop-api">API key</Label>
          <Input
            id="whop-api"
            type="password"
            autoComplete="off"
            placeholder={settings.data?.apiKeyHint ?? "Company API key"}
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to keep the saved key. Used only on the server to create checkouts and verify
            payments.
          </p>
        </div>
      </div>
      <Button
        className="mt-6"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || settings.isLoading}
      >
        {saveMutation.isPending ? "Saving..." : "Save changes"}
      </Button>
    </div>
  );
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Home Editory" },
      {
        name: "description",
        content: "Home Editory admin dashboard: users, generations, revenue and unlock price control.",
      },
      { property: "og:title", content: "Admin Dashboard — Home Editory" },
      { property: "og:description", content: "Internal Home Editory analytics and settings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-3 font-display text-4xl">{value}</p>
    </div>
  );
}

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [priceInput, setPriceInput] = useState("");

  const fetchOverview = useServerFn(getAdminOverview);
  const savePrice = useServerFn(setUnlockPrice);
  const claimAdmin = useServerFn(claimFirstAdmin);

  const overview = useQuery({
    queryKey: ["admin-overview"],
    enabled: Boolean(user) && isAdmin,
    queryFn: () => fetchOverview({ data: undefined }),
  });

  useEffect(() => {
    if (overview.data) setPriceInput(overview.data.unlockPrice.toFixed(2));
  }, [overview.data]);

  const priceMutation = useMutation({
    mutationFn: (price: number) => savePrice({ data: { price } }),
    onSuccess: () => {
      toast.success("Unlock price updated.");
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      queryClient.invalidateQueries({ queryKey: ["unlock-price"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const claimMutation = useMutation({
    mutationFn: () => claimAdmin({ data: undefined }),
    onSuccess: () => {
      toast.success("You are now an administrator. Refreshing…");
      window.location.reload();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-16">
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24 text-center">
        <h1 className="text-3xl">Admin access</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in with an admin account to continue.</p>
        <Button asChild className="mt-6">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24 text-center">
        <h1 className="text-3xl">Restricted area</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This dashboard is for administrators only.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => claimMutation.mutate()}
          disabled={claimMutation.isPending}
        >
          Claim admin (first user only)
        </Button>
      </div>
    );
  }

  const data = overview.data;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14">
      <h1 className="text-4xl">Admin dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">Usage, revenue, pricing and integrations.</p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <StatCard label="Total users" value={String(data?.totalUsers ?? "—")} icon={Users} />
        <StatCard label="Total generations" value={String(data?.totalGenerations ?? "—")} icon={Images} />
        <StatCard
          label="Total revenue"
          value={data ? currency(data.totalRevenue) : "—"}
          icon={DollarSign}
        />
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="options">Wizard options</TabsTrigger>
          <TabsTrigger value="prompt">Image prompt</TabsTrigger>
          <TabsTrigger value="ai">AI generator</TabsTrigger>
          <TabsTrigger value="amazon">Amazon settings</TabsTrigger>
          <TabsTrigger value="partners">Partner products</TabsTrigger>
          <TabsTrigger value="paddle">Payments</TabsTrigger>
          <TabsTrigger value="social">Social links</TabsTrigger>

        </TabsList>

        <TabsContent value="overview">
          <div className="surface-card mt-4 max-w-md p-6">
            <h2 className="text-2xl">Unlock price</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Applied to every new shopping-list unlock.
            </p>
            <div className="mt-4 flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="price">Price (USD)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                />
              </div>
              <Button
                onClick={() => priceMutation.mutate(Number(priceInput))}
                disabled={priceMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>

          <div className="surface-card mt-8 overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-2xl">Transactions</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.transactions ?? []).map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{tx.email}</TableCell>
                    <TableCell>{currency(tx.amount)}</TableCell>
                    <TableCell className="capitalize">{tx.status}</TableCell>
                    <TableCell>{new Date(tx.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {!data?.transactions?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      No transactions yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="options">
          <DesignOptionsManager />
        </TabsContent>

        <TabsContent value="prompt">
          <ImagePromptPanel />
        </TabsContent>

        <TabsContent value="ai">
          <AiSettingsPanel />
        </TabsContent>

        <TabsContent value="paddle">
          <PaddlePanel />
          <WhopPanel />
        </TabsContent>

        <TabsContent value="amazon">
          <AmazonSettingsPanel />
        </TabsContent>

        <TabsContent value="partners">
          <PartnerProductsPanel />
        </TabsContent>

        <TabsContent value="social">
          <SocialLinksPanel />
        </TabsContent>

      </Tabs>
    </div>
  );
}

function ImagePromptPanel() {
  const load = useServerFn(getImagePromptTemplate);
  const save = useServerFn(setImagePromptTemplate);
  const [draft, setDraft] = useState("");

  const query = useQuery({
    queryKey: ["admin-image-prompt"],
    queryFn: () => load({ data: undefined }),
  });

  useEffect(() => {
    if (query.data) setDraft(query.data.template);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (template: string) => save({ data: { template } }),
    onSuccess: (result) => {
      setDraft(result.template);
      toast.success("Image prompt saved.");
      query.refetch();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (query.isLoading) {
    return <Skeleton className="mt-4 h-64 w-full rounded-xl" />;
  }

  return (
    <div className="surface-card mt-4 p-6">
      <h2 className="text-2xl">AI image prompt</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This text is sent to the AI for every generated room image. Keep the placeholders below so
        the room, style, budget and product details are filled in automatically.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {PROMPT_PLACEHOLDERS.map((p) => (
          <button
            key={p.token}
            type="button"
            title={p.hint}
            className="rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setDraft((current) => `${current} ${p.token}`.trim())}
          >
            {p.token}
          </button>
        ))}
      </div>

      <Textarea
        className="mt-4 min-h-64 font-mono text-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={() => mutation.mutate(draft)} disabled={mutation.isPending}>
          Save prompt
        </Button>
        <Button
          variant="outline"
          onClick={() => setDraft(query.data?.defaultTemplate ?? DEFAULT_IMAGE_PROMPT)}
          disabled={mutation.isPending}
        >
          Restore default
        </Button>
        <p className="text-xs text-muted-foreground">
          {query.data?.isCustom ? "Using your custom prompt." : "Using the default prompt."}
        </p>
      </div>
    </div>
  );
}

function AmazonSettingsPanel() {
  const queryClient = useQueryClient();
  const load = useServerFn(getAmazonSettings);
  const save = useServerFn(saveAmazonSettings);
  const test = useServerFn(testAmazonConnection);

  const settings = useQuery({
    queryKey: ["amazon-settings"],
    queryFn: () => load({ data: undefined }),
  });

  const [form, setForm] = useState({
    provider: "rainforest" as "rainforest" | "paapi" | "creators" | "scraperapi",
    trackingId: "",
    marketplace: "www.amazon.com",
    rainforestApiKey: "",
    scraperapiApiKey: "",
    paapiAccessKey: "",
    paapiSecretKey: "",
    creatorsClientId: "",
    creatorsClientSecret: "",
  });

  // One row per ScraperAPI key. `hint` = masked key already stored on the server.
  const [saKeys, setSaKeys] = useState<{ hint: string | null; value: string }[]>([
    { hint: null, value: "" },
  ]);

  useEffect(() => {
    if (settings.data) {
      setForm((f) => ({
        ...f,
        provider: settings.data.provider,
        trackingId: settings.data.trackingId,
        marketplace: settings.data.marketplace,
      }));
      const hints = settings.data.scraperapiKeyHints ?? [];
      setSaKeys(
        hints.length ? hints.map((h) => ({ hint: h, value: "" })) : [{ hint: null, value: "" }],
      );
    }
  }, [settings.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...form,
          scraperapiKeys: saKeys.map((k) => (k.value.trim() ? k.value.trim() : null)),
        },
      }),
    onSuccess: () => {
      toast.success("Amazon settings saved.");
      setForm((f) => ({
        ...f,
        rainforestApiKey: "",
        scraperapiApiKey: "",
        paapiAccessKey: "",
        paapiSecretKey: "",
        creatorsClientId: "",
        creatorsClientSecret: "",
      }));
      queryClient.invalidateQueries({ queryKey: ["amazon-settings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: () => test({ data: undefined }),
    onSuccess: (r) => {
      if (r.ok) toast.success(r.message, { description: r.sample ?? "" });
      else toast.error(r.message);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const d = settings.data;

  return (
    <div className="surface-card mt-4 max-w-2xl p-6">
      <div className="flex items-center gap-2">
        <ShoppingBag className="size-5 text-primary" />
        <h2 className="text-2xl">Amazon Associate & product API</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Keys are stored on the server only and never sent to visitors. Leave a key field empty to
        keep the saved value.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tracking">Associate Tracking ID</Label>
          <Input
            id="tracking"
            placeholder="yourstore-20"
            value={form.trackingId}
            onChange={(e) => setForm({ ...form, trackingId: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="marketplace">Marketplace</Label>
          <Input
            id="marketplace"
            placeholder="www.amazon.com"
            value={form.marketplace}
            onChange={(e) => setForm({ ...form, marketplace: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <Label>Product data provider</Label>
        <RadioGroup
          value={form.provider}
          onValueChange={(v) =>
            setForm({ ...form, provider: v as typeof form.provider })
          }
          className="grid gap-3 sm:grid-cols-2"
        >
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
            <RadioGroupItem value="scraperapi" id="p-scraperapi" className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">ScraperAPI</span>
              <span className="block text-xs text-muted-foreground">
                One API key, generous free tier — recommended.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
            <RadioGroupItem value="creators" id="p-creators" className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">Amazon Creators API</span>
              <span className="block text-xs text-muted-foreground">Current official API — Client ID & Secret.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
            <RadioGroupItem value="rainforest" id="p-rainforest" className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">Rainforest API</span>
              <span className="block text-xs text-muted-foreground">One API key, works right away.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4">
            <RadioGroupItem value="paapi" id="p-paapi" className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">PA-API 5.0 (legacy)</span>
              <span className="block text-xs text-muted-foreground">Older access keys, being retired.</span>
            </span>
          </label>
        </RadioGroup>
      </div>

      {form.provider === "scraperapi" ? (
        <div className="mt-6 space-y-3">
          <Label>ScraperAPI keys</Label>
          <div className="space-y-2">
            {saKeys.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-xs text-muted-foreground">{index + 1}.</span>
                <Input
                  id={index === 0 ? "sa-key" : `sa-key-${index}`}
                  type="password"
                  autoComplete="off"
                  placeholder={row.hint ?? "Paste a ScraperAPI key"}
                  value={row.value}
                  onChange={(e) =>
                    setSaKeys((keys) =>
                      keys.map((k, i) => (i === index ? { ...k, value: e.target.value } : k)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove key ${index + 1}`}
                  disabled={saKeys.length === 1 && !row.hint && !row.value}
                  onClick={() =>
                    setSaKeys((keys) => {
                      const next = keys.filter((_, i) => i !== index);
                      return next.length ? next : [{ hint: null, value: "" }];
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSaKeys((keys) => [...keys, { hint: null, value: "" }])}
          >
            <Plus className="size-4" /> Add another key
          </Button>
          <p className="text-xs text-muted-foreground">
            Get keys from scraperapi.com → Dashboard → API Key. Add one key per box — when the first
            one runs out of credits, the next box is used automatically. Remove a box with the bin
            icon, then press Save settings.
          </p>
        </div>
      ) : form.provider === "creators" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cr-id">Creators Client ID</Label>
            <Input
              id="cr-id"
              type="password"
              autoComplete="off"
              placeholder={d?.creatorsClientIdHint ?? "amzn1.application-oa2-client.…"}
              value={form.creatorsClientId}
              onChange={(e) => setForm({ ...form, creatorsClientId: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-secret">Creators Client Secret</Label>
            <Input
              id="cr-secret"
              type="password"
              autoComplete="off"
              placeholder={d?.creatorsClientSecretHint ?? "Client secret"}
              value={form.creatorsClientSecret}
              onChange={(e) => setForm({ ...form, creatorsClientSecret: e.target.value })}
            />
          </div>
        </div>
      ) : form.provider === "rainforest" ? (
        <div className="mt-6 space-y-1.5">
          <Label htmlFor="rf-key">Rainforest API key</Label>
          <Input
            id="rf-key"
            type="password"
            autoComplete="off"
            placeholder={d?.rainforestKeyHint ?? "Paste your Rainforest API key"}
            value={form.rainforestApiKey}
            onChange={(e) => setForm({ ...form, rainforestApiKey: e.target.value })}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pa-access">PA-API Access Key</Label>
            <Input
              id="pa-access"
              type="password"
              autoComplete="off"
              placeholder={d?.paapiAccessKeyHint ?? "AKIA…"}
              value={form.paapiAccessKey}
              onChange={(e) => setForm({ ...form, paapiAccessKey: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pa-secret">PA-API Secret Key</Label>
            <Input
              id="pa-secret"
              type="password"
              autoComplete="off"
              placeholder={d?.paapiSecretKeyHint ?? "Secret key"}
              value={form.paapiSecretKey}
              onChange={(e) => setForm({ ...form, paapiSecretKey: e.target.value })}
            />
          </div>
        </div>
      )}


      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || settings.isLoading}>
          {saveMutation.isPending ? "Saving…" : "Save settings"}
        </Button>
        <Button variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
          {testMutation.isPending ? "Testing…" : "Test connection"}
        </Button>
      </div>
    </div>
  );
}

const KIND_GROUPS = [
  { kind: "room_type", title: "Step 1 — Rooms", amountLabel: null, hintLabel: "Short description" },
  { kind: "size", title: "Step 2 — Sizes", amountLabel: null, hintLabel: "Short description" },
  {
    kind: "item_density",
    title: "Step 2 — Room density / item count",
    amountLabel: "Max items",
    hintLabel: "Item count range (e.g. 3-4 items)",
  },
  { kind: "style", title: "Step 3 — Styles", amountLabel: null, hintLabel: "Short description" },
  { kind: "budget_or_color", title: "Step 4 — Budgets", amountLabel: "Amount (USD)", hintLabel: "Short description" },
  { kind: "color_palette", title: "Step 4 — Colour palettes", amountLabel: null, hintLabel: "Short description" },
  { kind: "deal_preference", title: "Step 5 — Deal preferences", amountLabel: "Percent off", hintLabel: "Short description" },
] as const;

type Draft = {
  id: string | null;
  label: string;
  hint: string;
  amount: string;
  sortOrder: string;
  isActive: boolean;
};

function emptyDraft(): Draft {
  return { id: null, label: "", hint: "", amount: "", sortOrder: "0", isActive: true };
}

function DesignOptionsManager() {
  const queryClient = useQueryClient();
  const loadOptions = useServerFn(listAllDesignOptions);
  const save = useServerFn(saveDesignOption);
  const remove = useServerFn(deleteDesignOption);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const optionsQuery = useQuery({
    queryKey: ["admin-design-options"],
    queryFn: () => loadOptions({ data: undefined }),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-design-options"] });
    queryClient.invalidateQueries({ queryKey: ["design-options"] });
  }

  const saveMutation = useMutation({
    mutationFn: (input: {
      id: string | null;
      kind: string;
      label: string;
      hint: string | null;
      amount: number | null;
      sortOrder: number;
      isActive: boolean;
    }) => save({ data: input }),
    onSuccess: () => {
      toast.success("Option saved.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Option removed.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mt-10 space-y-6">
      <div>
        <h2 className="text-3xl">Wizard options</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you add here appears on the design wizard right away.
        </p>
      </div>

      {KIND_GROUPS.map((group) => {
        const rows = (optionsQuery.data ?? []).filter((o) => o.kind === group.kind);
        const draft = drafts[group.kind] ?? emptyDraft();
        const setDraft = (next: Partial<Draft>) =>
          setDrafts((d) => ({ ...d, [group.kind]: { ...draft, ...next } }));

        return (
          <div key={group.kind} className="surface-card p-6">
            <h3 className="text-2xl">{group.title}</h3>

            <ul className="mt-4 divide-y divide-border">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {row.label}
                      {row.isActive ? null : (
                        <span className="ml-2 text-xs text-muted-foreground">(hidden)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.hint ?? "—"}
                      {row.amount !== null ? ` · ${group.amountLabel ?? "Value"}: ${row.amount}` : ""}
                      {` · order ${row.sortOrder}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDraft({
                          id: row.id,
                          label: row.label,
                          hint: row.hint ?? "",
                          amount: row.amount === null ? "" : String(row.amount),
                          sortOrder: String(row.sortOrder),
                          isActive: row.isActive,
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        saveMutation.mutate({
                          id: row.id,
                          kind: group.kind,
                          label: row.label,
                          hint: row.hint,
                          amount: row.amount,
                          sortOrder: row.sortOrder,
                          isActive: !row.isActive,
                        })
                      }
                    >
                      {row.isActive ? "Hide" : "Show"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(row.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
              {!rows.length ? (
                <li className="py-4 text-sm text-muted-foreground">Nothing added yet.</li>
              ) : null}
            </ul>

            <div className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={draft.label} onChange={(e) => setDraft({ label: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{group.hintLabel}</Label>
                <Input value={draft.hint} onChange={(e) => setDraft({ hint: e.target.value })} />
              </div>
              {group.amountLabel ? (
                <div className="space-y-1.5">
                  <Label>{group.amountLabel}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={draft.amount}
                    onChange={(e) => setDraft({ amount: e.target.value })}
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label>Order</Label>
                <Input
                  type="number"
                  value={draft.sortOrder}
                  onChange={(e) => setDraft({ sortOrder: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => {
                  const amount = Number(draft.amount);
                  saveMutation.mutate({
                    id: draft.id,
                    kind: group.kind,
                    label: draft.label,
                    hint: draft.hint.trim() || null,
                    amount: Number.isFinite(amount) && amount > 0 ? amount : null,
                    sortOrder: Number(draft.sortOrder) || 0,
                    isActive: draft.isActive,
                  });
                  setDrafts((d) => ({ ...d, [group.kind]: emptyDraft() }));
                }}
                disabled={saveMutation.isPending || !draft.label.trim()}
              >
                {draft.id ? "Update option" : "Add option"}
              </Button>
              {draft.id ? (
                <Button
                  variant="ghost"
                  onClick={() => setDrafts((d) => ({ ...d, [group.kind]: emptyDraft() }))}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}


const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook page URL",
  instagram: "Instagram profile URL",
  tiktok: "TikTok profile URL",
  pinterest: "Pinterest profile URL",
};

function SocialLinksPanel() {
  const queryClient = useQueryClient();
  const save = useServerFn(setSocialLinks);

  const links = useQuery({ queryKey: ["social-links"], queryFn: () => getSocialLinks() });
  const [form, setForm] = useState<SocialLinks>({
    facebook: "",
    instagram: "",
    tiktok: "",
    pinterest: "",
  });

  useEffect(() => {
    if (links.data) setForm(links.data);
  }, [links.data]);

  const saveMutation = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => {
      toast.success("Social links saved.");
      queryClient.invalidateQueries({ queryKey: ["social-links"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="surface-card mt-4 max-w-xl p-6">
      <h2 className="text-2xl">Social profile links</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Paste full links starting with https://. Empty fields are hidden from the footer.
      </p>

      <div className="mt-6 space-y-4">
        {SOCIAL_KEYS.map((key) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`social-${key}`}>{SOCIAL_LABELS[key]}</Label>
            <Input
              id={`social-${key}`}
              placeholder={`https://www.${key}.com/homeeditory`}
              value={form[key]}
              onChange={(event) => setForm({ ...form, [key]: event.target.value })}
            />
          </div>
        ))}
      </div>

      <Button
        className="mt-6"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? "Saving…" : "Save links"}
      </Button>
    </div>
  );
}
