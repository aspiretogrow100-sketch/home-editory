import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { DollarSign, Images, ShoppingBag, Users } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";
import { currency, DEFAULT_IMAGE_PROMPT, PROMPT_PLACEHOLDERS } from "@/lib/decor";
import {
  claimFirstAdmin,
  deleteDesignOption,
  getAdminOverview,
  getAmazonSettings,
  getImagePromptTemplate,
  listAllDesignOptions,
  saveAmazonSettings,
  saveDesignOption,
  setImagePromptTemplate,
  setUnlockPrice,
  testAmazonConnection,
} from "@/lib/decor.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — DecorAI" },
      {
        name: "description",
        content: "DecorAI admin dashboard: users, generations, revenue and unlock price control.",
      },
      { property: "og:title", content: "Admin Dashboard — DecorAI" },
      { property: "og:description", content: "Internal DecorAI analytics and settings." },
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
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="options">Wizard options</TabsTrigger>
          <TabsTrigger value="prompt">Image prompt</TabsTrigger>
          <TabsTrigger value="amazon">Amazon settings</TabsTrigger>
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

        <TabsContent value="amazon">
          <AmazonSettingsPanel />
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
    provider: "rainforest" as "rainforest" | "paapi" | "creators",
    trackingId: "",
    marketplace: "www.amazon.com",
    rainforestApiKey: "",
    paapiAccessKey: "",
    paapiSecretKey: "",
    creatorsClientId: "",
    creatorsClientSecret: "",
  });

  useEffect(() => {
    if (settings.data) {
      setForm((f) => ({
        ...f,
        provider: settings.data.provider,
        trackingId: settings.data.trackingId,
        marketplace: settings.data.marketplace,
      }));
    }
  }, [settings.data]);

  const saveMutation = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => {
      toast.success("Amazon settings saved.");
      setForm((f) => ({
        ...f,
        rainforestApiKey: "",
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
            setForm({ ...form, provider: v as "rainforest" | "paapi" | "creators" })
          }
          className="grid gap-3 sm:grid-cols-3"
        >
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

      {form.provider === "creators" ? (
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

