import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { usePaddle } from "@/hooks/usePaddle";
import { currency } from "@/lib/decor";
import { confirmPaddlePayment, getPaddleCheckoutInfo } from "@/lib/paddle.functions";

type Props = {
  open: boolean;
  price: number;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  /** Demo fallback used when Paddle is not configured yet. */
  onConfirm: () => void;
  /** Design being unlocked — required for real Paddle payments. */
  generationId?: string | null;
  /** Called after a verified Paddle payment unlocks the design. */
  onPaid?: () => void | Promise<void>;
};

export function CheckoutDialog({
  open,
  price,
  busy,
  onOpenChange,
  onConfirm,
  generationId,
  onPaid,
}: Props) {
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/29");
  const [cvc, setCvc] = useState("123");

  const { user } = useAuth();
  const loadInfo = useServerFn(getPaddleCheckoutInfo);
  const confirm = useServerFn(confirmPaddlePayment);

  const infoQuery = useQuery({
    queryKey: ["paddle-checkout-info"],
    queryFn: () => loadInfo(),
    staleTime: 5 * 60 * 1000,
  });

  const info = infoQuery.data;
  const paddleEnabled = Boolean(info?.enabled && generationId);

  const settledRef = useRef(false);
  const quietRef = useRef(false);

  const settle = useMutation({
    mutationFn: (transactionId: string) =>
      confirm({ data: { generationId: String(generationId), transactionId } }),
    onSuccess: async () => {
      settledRef.current = true;
      paddleClose();
      toast.success("Payment received — your Amazon links are unlocked.");
      await onPaid?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      // The close-time safety net can hit an unrelated/older payment; stay quiet then.
      if (quietRef.current) return;
      toast.error(error.message);
    },
  });

  const {
    ready,
    error,
    close: paddleClose,
    reset: resetPaddle,
  } = usePaddle({
    enabled: paddleEnabled && open,
    environment: info?.environment ?? "sandbox",
    clientToken: info?.clientToken ?? null,
    onCompleted: (transactionId) => {
      if (settledRef.current) return;
      quietRef.current = false;
      settle.mutate(transactionId);
    },
    // Safety net: if the completed event never reaches us, verify on close.
    onClosed: (transactionId) => {
      if (!transactionId || settledRef.current) return;
      quietRef.current = true;
      settle.mutate(transactionId);
    },
  });

  const openPaddle = () => {
    const paddle = typeof window === "undefined" ? undefined : window.Paddle;
    if (!paddle || !info?.priceId) {
      toast.error("Checkout is still loading. Please try again in a second.");
      return;
    }
    settledRef.current = false;
    quietRef.current = false;
    resetPaddle();
    paddle.Checkout.open({
      items: [{ priceId: info.priceId, quantity: 1 }],
      customData: { generation_id: generationId, user_id: user?.id ?? null },
      ...(user?.email ? { customer: { email: user.email } } : {}),
      settings: { displayMode: "overlay", theme: "light", allowLogout: false },
    });
  };

  const processing = busy || settle.isPending;
  const label = useMemo(() => currency(price), [price]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Unlock shopping links</DialogTitle>
          <DialogDescription>
            One-time payment of {label} for this room's Amazon list.
          </DialogDescription>
        </DialogHeader>

        {paddleEnabled ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0" />
              Secure checkout by Paddle. Cards, PayPal and Apple Pay supported — we never see your
              card details.
            </p>
            {error ? (
              <p className="text-xs text-destructive">
                Checkout could not load. Please refresh and try again.
              </p>
            ) : null}
            <Button className="w-full" onClick={openPaddle} disabled={processing || !ready}>
              <CreditCard className="size-4" />
              {processing ? "Confirming…" : ready ? `Pay ${label}` : "Loading checkout…"}
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="card">Card number</Label>
                <Input
                  id="card"
                  value={card}
                  onChange={(e) => setCard(e.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="expiry">Expiry</Label>
                  <Input id="expiry" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input
                    id="cvc"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>
              <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 shrink-0" />
                Demo checkout — no real card is charged and no card details are stored.
              </p>
            </div>

            <Button className="w-full" onClick={onConfirm} disabled={processing}>
              <CreditCard className="size-4" />
              {processing ? "Processing…" : `Pay ${label}`}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
