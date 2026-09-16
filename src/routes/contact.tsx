import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Interior AI Designer — Support & Partnerships" },
      {
        name: "description",
        content: "Get in touch with the Interior AI Designer team about support, billing questions or partnerships.",
      },
      { property: "og:title", content: "Contact Interior AI Designer" },
      { property: "og:description", content: "Questions about Interior AI Designer? Send us a message." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <h1 className="text-4xl">Contact us</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Support, billing or partnership questions — we usually reply within two business days.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Interior AI Designer is operated by Nahidul, Dhaka, Bangladesh.
      </p>

      <div className="surface-card mt-8 space-y-4 p-6">
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-0.5 text-lg">✉️</span>
          <div>
            <p className="text-sm font-medium">Email support</p>
            <a
              href="mailto:moumunira00@gmail.com"
              className="text-sm text-primary underline underline-offset-2"
            >
              moumunira00@gmail.com
            </a>
            <p className="text-xs text-muted-foreground">
              For billing, unlocks and account questions.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-0.5 text-lg">📞</span>
          <div>
            <p className="text-sm font-medium">Phone / WhatsApp</p>
            <a
              href="tel:+8801334920949"
              className="text-sm text-primary underline underline-offset-2"
            >
              +880 1334-920949
            </a>
            <p className="text-xs text-muted-foreground">
              Bangladesh time (UTC+6), Saturday–Thursday, 10:00–18:00.
            </p>
          </div>
        </div>
      </div>

      <form
        className="surface-card mt-8 space-y-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          const subject = encodeURIComponent(`Interior AI Designer enquiry from ${name}`);
          const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
          window.location.href = `mailto:moumunira00@gmail.com?subject=${subject}&body=${body}`;
          toast.success("Opening your email app to send the message.");
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Send message
        </Button>
        <p className="text-xs text-muted-foreground">
          This opens your email app with the message ready to send to moumunira00@gmail.com.
        </p>
      </form>
    </div>
  );
}
