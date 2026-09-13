import { Link } from "@tanstack/react-router";

const LEGAL = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/refund", label: "Refund Policy" },
  { to: "/disclaimer", label: "Disclaimer" },
  { to: "/contact", label: "Contact Us" },
] as const;

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-secondary/50">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl">DecorAI</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Photoreal room concepts, paired with a shoppable list of discounted Amazon finds.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-foreground">
                Design studio
              </Link>
            </li>
            <li>
              <Link to="/gallery" className="hover:text-foreground">
                My gallery
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="hover:text-foreground">
                Pricing
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Legal</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {LEGAL.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70 px-4 py-6 text-center text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} DecorAI. As an Amazon Associate we may earn from qualifying
          purchases. Product prices and availability are illustrative.
        </p>
      </div>
    </footer>
  );
}
