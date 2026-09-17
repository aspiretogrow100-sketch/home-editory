import { useEffect, useRef, useState } from "react";

type PaddleCheckoutEvent = {
  name?: string;
  data?: { transaction_id?: string; status?: string };
};

type PaddleInstance = {
  Environment: { set: (env: string) => void };
  Initialize: (options: {
    token: string;
    eventCallback?: (event: PaddleCheckoutEvent) => void;
  }) => void;
  Checkout: {
    open: (options: Record<string, unknown>) => void;
    close?: () => void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleInstance;
  }
}

const SCRIPT_SRC = "https://cdn.paddle.com/paddle/v2/paddle.js";

function loadScript(): Promise<PaddleInstance> {
  if (window.Paddle) return Promise.resolve(window.Paddle);

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
  const script = existing ?? document.createElement("script");

  return new Promise((resolve, reject) => {
    script.addEventListener("load", () => {
      if (window.Paddle) resolve(window.Paddle);
      else reject(new Error("Paddle failed to load."));
    });
    script.addEventListener("error", () => reject(new Error("Paddle failed to load.")));
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

/**
 * Loads Paddle.js on demand and keeps one initialized instance.
 * `onCompleted` receives the Paddle transaction id after a successful checkout.
 * `onClosed` fires when the overlay is dismissed, with the last known transaction id
 * (used as a safety net when the completed event never reaches us).
 */
export function usePaddle(options: {
  enabled: boolean;
  environment: "sandbox" | "production";
  clientToken: string | null;
  onCompleted: (transactionId: string) => void;
  onClosed?: (transactionId: string | null) => void;
}) {
  const { enabled, environment, clientToken } = options;
  const [paddle, setPaddle] = useState<PaddleInstance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastTransaction = useRef<string | null>(null);
  const completedRef = useRef(options.onCompleted);
  completedRef.current = options.onCompleted;
  const closedRef = useRef(options.onClosed);
  closedRef.current = options.onClosed;

  useEffect(() => {
    if (!enabled || !clientToken) return;
    let active = true;

    loadScript()
      .then((instance) => {
        if (!active) return;
        instance.Environment.set(environment);
        instance.Initialize({
          token: clientToken,
          eventCallback: (event) => {
            // Paddle event `data.id` is not guaranteed to be a transaction id.
            // Only retain the explicit transaction id so an unrelated event can
            // never overwrite the payment that belongs to this checkout.
            const id = event.data?.transaction_id ?? null;
            if (id) lastTransaction.current = id;
            const name = event.name ?? "";
            if (name === "checkout.completed" || name === "checkout.payment.completed") {
              if (lastTransaction.current) completedRef.current(lastTransaction.current);
            } else if (name === "checkout.closed") {
              closedRef.current?.(lastTransaction.current);
            }
          },
        });
        setPaddle(instance);
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });

    return () => {
      active = false;
    };
  }, [enabled, clientToken, environment]);

  const close = () => {
    try {
      window.Paddle?.Checkout.close?.();
    } catch {
      /* overlay already gone */
    }
  };

  /** Forget the previous checkout so a stale transaction is never reused. */
  const reset = () => {
    lastTransaction.current = null;
  };

  return { paddle, ready: Boolean(paddle), error, close, reset, lastTransaction };
}
