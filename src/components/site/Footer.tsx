import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Facebook, Instagram } from "lucide-react";

import { getSocialLinks, type SocialNetwork } from "@/lib/decor.functions";

const LEGAL = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/refund", label: "Refund Policy" },
  { to: "/disclaimer", label: "Disclaimer" },
  { to: "/contact", label: "Contact Us" },
] as const;

function TiktokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M16.5 3h-2.8v12.2a2.4 2.4 0 1 1-1.9-2.35V9.9a5.5 5.5 0 1 0 4.7 5.44V8.9a5.6 5.6 0 0 0 3.3 1.07V7.1a3.3 3.3 0 0 1-3.3-3.3V3Z" />
    </svg>
  );
}

function PinterestIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2a10 10 0 0 0-3.6 19.3c-.05-.8-.01-1.75.2-2.6.22-.94 1.44-6.1 1.44-6.1s-.36-.71-.36-1.76c0-1.65.96-2.88 2.15-2.88 1.01 0 1.5.76 1.5 1.67 0 1.02-.65 2.54-.99 3.95-.28 1.19.6 2.16 1.77 2.16 2.12 0 3.75-2.24 3.75-5.47 0-2.86-2.05-4.86-4.99-4.86-3.4 0-5.39 2.55-5.39 5.18 0 1.03.4 2.13.89 2.72.1.12.11.22.08.34l-.33 1.34c-.05.22-.29.3-.48.2-1.34-.62-2.17-2.56-2.17-4.13 0-3.36 2.44-6.45 7.04-6.45 3.7 0 6.57 2.63 6.57 6.15 0 3.67-2.31 6.63-5.53 6.63-1.08 0-2.1-.56-2.44-1.23l-.67 2.54c-.24.93-.88 2.09-1.32 2.8A10 10 0 1 0 12 2Z" />
    </svg>
  );
}

const SOCIALS: { key: SocialNetwork; label: string; Icon: typeof Facebook }[] = [
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "tiktok", label: "TikTok", Icon: TiktokIcon },
  { key: "pinterest", label: "Pinterest", Icon: PinterestIcon },
];

export function Footer() {
  const socialQuery = useQuery({ queryKey: ["social-links"], queryFn: () => getSocialLinks() });
  const links = socialQuery.data;
  const active = SOCIALS.filter((s) => links?.[s.key]);


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
