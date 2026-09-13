import { useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";

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
import { currency } from "@/lib/decor";

type Props = {
  open: boolean;
  price: number;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function CheckoutDialog({ open, price, busy, onOpenChange, onConfirm }: Props) {
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/29");
  const [cvc, setCvc] = useState("123");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Unlock shopping links</DialogTitle>
          <DialogDescription>
            One-time payment of {currency(price)} for this room's Amazon list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="card">Card number</Label>
            <Input id="card" value={card} onChange={(e) => setCard(e.target.value)} inputMode="numeric" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expiry">Expiry</Label>
              <Input id="expiry" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cvc">CVC</Label>
              <Input id="cvc" value={cvc} onChange={(e) => setCvc(e.target.value)} inputMode="numeric" />
            </div>
          </div>
          <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0" />
            Demo checkout — no real card is charged and no card details are stored.
          </p>
        </div>

        <Button className="w-full" onClick={onConfirm} disabled={busy}>
          <CreditCard className="size-4" />
          {busy ? "Processing…" : `Pay ${currency(price)}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
