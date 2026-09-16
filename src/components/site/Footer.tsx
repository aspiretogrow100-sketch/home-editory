import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import logoFull from "@/assets/logo-full.png";
import { getSocialLinks, type SocialNetwork } from "@/lib/decor.functions";

const LEGAL = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/refund", label: "Refund Policy" },
  { to: "/disclaimer", label: "Disclaimer" },
  { to: "/contact", label: "Contact Us" },
] as const;

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#FFFFFF"
        d="M16.4 12.9h-2.9v8.4c-.5.1-1 .15-1.5.15s-1-.05-1.5-.15v-8.4H7.6v-2.8h2.9V8c0-2.7 1.6-4.2 4-4.2 1.2 0 2.4.2 2.4.2v2.6h-1.4c-1.3 0-1.7.8-1.7 1.7v2h3l-.4 2.6Z"
      />
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="#E4405F" strokeWidth="2.2" />
      <circle cx="12" cy="12" r="4.2" stroke="#E4405F" strokeWidth="2.2" />
      <circle cx="17.3" cy="6.7" r="1.4" fill="#E4405F" />
    </svg>
  );
}

function TiktokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="#000000" aria-hidden {...props}>
      <path d="M16.5 3h-2.8v12.2a2.4 2.4 0 1 1-1.9-2.35V9.9a5.5 5.5 0 1 0 4.7 5.44V8.9a5.6 5.6 0 0 0 3.3 1.07V7.1a3.3 3.3 0 0 1-3.3-3.3V3Z" />
    </svg>
  );
}

function PinterestIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <circle cx="12" cy="12" r="12" fill="#E60023" />
      <path
        fill="#FFFFFF"
        d="M12.3 5.5c-3.6 0-5.6 2.3-5.6 4.9 0 1.2.6 2.6 1.7 3.1.2.1.3 0 .3-.1l.3-1.2c0-.1 0-.2-.1-.3-.4-.5-.7-1.3-.7-2.1 0-2 1.5-3.9 4.1-3.9 2.2 0 3.8 1.5 3.8 3.7 0 2.5-1.2 4.2-2.9 4.2-.9 0-1.5-.7-1.3-1.6.2-1.1.7-2.2.7-3 0-.7-.4-1.3-1.2-1.3-.9 0-1.7 1-1.7 2.3 0 .8.3 1.4.3 1.4l-1.1 4.7c-.2.8-.1 1.9 0 2.6.1.1.2.1.2 0 .1-.1 1.3-1.6 1.7-2.7l.6-2.1c.3.6 1.2 1.1 2.2 1.1 2.9 0 4.9-2.6 4.9-6.1 0-2.7-2.3-5-5.5-5Z"
      />
    </svg>
  );
}

const SOCIALS: {
  key: SocialNetwork;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}[] = [
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "tiktok", label: "TikTok", Icon: TiktokIcon },
  { key: "pinterest", label: "Pinterest", Icon: PinterestIcon },
];

export function Footer() {
  const socialQuery = useQuery({ queryKey: ["social-links"], queryFn: () => getSocialLinks() });
  const links = socialQuery.data;

  return (
    <footer className="mt-20 bg-muted/60">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center">
            <img
              src={logoFull}
              alt="Interior AI Designer logo"
              width={1536}
              height={512}
              loading="lazy"
              className="h-12 w-auto object-contain"
            />
          </div>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Photoreal room concepts, paired with a shoppable list of discounted Amazon finds.
          </p>
          <div className="mt-5 flex items-center gap-4">
            {SOCIALS.map(({ key, label, Icon }) => {
              const href = links?.[key];
              const className = "transition-opacity hover:opacity-75";
              return href ? (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className={className}
                >
                  <Icon className="size-7" />
                </a>
              ) : (
                <span
                  key={key}
                  title={label}
                  className={className}
                >
                  <Icon className="size-7" />
                </span>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-foreground">
                Home
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
          © {new Date().getFullYear()} Interior AI Designer. As an Amazon Associate we may earn from qualifying
          purchases. Product prices and availability are illustrative.
        </p>
      </div>
    </footer>
  );
}
