import { Link } from "@tanstack/react-router";
import { BadgeDollarSign, House, Images, MessageSquareText } from "lucide-react";

const MOBILE_NAV = [
  { to: "/", label: "Home", Icon: House },
  { to: "/gallery", label: "Gallery", Icon: Images },
  { to: "/pricing", label: "Pricing", Icon: BadgeDollarSign },
  { to: "/contact", label: "Contact", Icon: MessageSquareText },
] as const;

const baseClass =
  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md py-2 text-[11px] font-medium text-muted-foreground transition-colors";

export function MobileBottomNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_color-mix(in_oklab,var(--color-foreground)_8%,transparent)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {MOBILE_NAV.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            aria-label={label}
            className={baseClass}
            activeOptions={{ exact: to === "/" }}
            activeProps={{
              className: `${baseClass} bg-primary text-primary-foreground shadow-sm`,
              "aria-current": "page",
            }}
          >
            <Icon className="size-5 shrink-0" strokeWidth={1.8} />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}