import { createFileRoute } from "@tanstack/react-router";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { FaqSection, contactFaqs } from "@/components/FaqSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, Mail, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — Loans Mart India" }, { name: "description", content: "Get in touch with the Loans Mart India team." }] }),
  component: ContactPage,
});

function ContactPage() {
  const [sending, setSending] = useState(false);
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    setTimeout(() => { toast.success("Message sent! We'll get back to you."); setSending(false); (e.target as HTMLFormElement).reset(); }, 600);
  };
  return (
    <div>
      <PublicNav />
      <section className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-3">Get in touch</h1>
        <p className="text-muted-foreground mb-10">We're here to help.</p>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            {[
              { icon: Phone, label: "Phone", value: "+91 98765 43210" },
              { icon: Mail, label: "Email", value: "hello@loansmartindia.com" },
              { icon: MapPin, label: "Address", value: "123 Finance Street, Mumbai" },
            ].map((c) => (
              <Card key={c.label}><CardContent className="p-5 flex gap-4 items-start">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><c.icon className="h-5 w-5" /></div>
                <div><div className="text-xs text-muted-foreground">{c.label}</div><div className="font-medium">{c.value}</div></div>
              </CardContent></Card>
            ))}
          </div>
          <Card className="lg:col-span-2"><CardContent className="p-6">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Name</Label><Input name="name" required /></div>
                <div><Label>Email</Label><Input name="email" type="email" required /></div>
              </div>
              <div><Label>Subject</Label><Input name="subject" required /></div>
              <div><Label>Message</Label><Textarea name="message" rows={5} required /></div>
              <Button type="submit" disabled={sending}>{sending ? "Sending..." : "Send Message"}</Button>
            </form>
          </CardContent></Card>
        </div>
      </section>
      <FaqSection faqs={contactFaqs} subtitle="Quick answers before you reach out." />
      <PublicFooter />
    </div>
  );
}
