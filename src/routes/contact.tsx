import { createFileRoute } from "@tanstack/react-router";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { FaqSection, contactFaqs } from "@/components/FaqSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, Mail, MapPin, Clock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCompanyContact } from "@/lib/company-info";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Loans Mart India — Customer Support & Helpline" },
      {
        name: "description",
        content:
          "Get in touch with the Loans Mart India team for loan inquiries, application support, or grievance redressal. Reach our loan experts via phone, email, or online inquiry.",
      },
      { property: "og:title", content: "Contact Loans Mart India — Customer Support & Helpline" },
      {
        property: "og:description",
        content:
          "Connect with Loans Mart India loan consultants. Prompt assistance for personal, home, business, and car loans.",
      },
      { property: "og:url", content: "https://loansmartindia.com/contact" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://loansmartindia.com/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const contact = useCompanyContact();
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      toast.success("Thank you! Your message has been received. Our team will contact you shortly.");
      setSending(false);
      setSubmitted(true);
      (e.target as HTMLFormElement).reset();
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNav />
      <main className="flex-1">
        <section className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
              <ShieldCheck className="h-4 w-4" /> Verified Business Credentials
            </div>
            <h1 className="text-4xl font-bold mb-3 text-foreground">Get in touch</h1>
            <p className="text-muted-foreground text-lg">
              Have questions about a loan product or your ongoing application? Our team of loan
              consultants is here to help you every step of the way.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="space-y-4">
              <Card>
                <CardContent className="p-5 flex gap-4 items-start">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Customer Helpline</div>
                    <a
                      href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors text-base"
                    >
                      {contact.phone}
                    </a>
                    <div className="text-xs text-muted-foreground mt-0.5">Toll-free assistance</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 flex gap-4 items-start">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Official Email</div>
                    <a
                      href={`mailto:${contact.email}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors text-base"
                    >
                      {contact.email}
                    </a>
                    <div className="text-xs text-muted-foreground mt-0.5">Replies within 24 hours</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 flex gap-4 items-start">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Corporate Office</div>
                    <div className="font-semibold text-foreground text-sm leading-snug">
                      {contact.address}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {contact.city}, {contact.state} - {contact.pincode}, {contact.country}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 flex gap-4 items-start">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Business Hours</div>
                    <div className="font-semibold text-foreground text-sm">{contact.hours}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Sunday & National Holidays: Closed</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="lg:col-span-2">
              <CardContent className="p-6 md:p-8">
                {submitted ? (
                  <div className="text-center py-12 space-y-4">
                    <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto" />
                    <h3 className="text-2xl font-bold text-foreground">Message Sent Successfully!</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Thank you for contacting Loans Mart India. One of our loan advisors will review your
                      request and contact you shortly.
                    </p>
                    <Button variant="outline" onClick={() => setSubmitted(false)}>
                      Send another inquiry
                    </Button>
                  </div>
                ) : (
                  <form className="space-y-5" onSubmit={onSubmit}>
                    <div className="border-b pb-4 mb-2">
                      <h2 className="text-xl font-bold text-foreground">Send Us a Direct Message</h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        Fill in the details below and we will get back to you promptly.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contact-name">Full Name *</Label>
                        <Input id="contact-name" name="name" placeholder="John Doe" required />
                      </div>
                      <div>
                        <Label htmlFor="contact-email">Email Address *</Label>
                        <Input id="contact-email" name="email" type="email" placeholder="john@example.com" required />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contact-phone">Phone Number *</Label>
                        <Input id="contact-phone" name="phone" placeholder="+91 ..." required />
                      </div>
                      <div>
                        <Label htmlFor="contact-subject">Inquiry Subject *</Label>
                        <Input id="contact-subject" name="subject" placeholder="Personal Loan / DSA Partnership" required />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="contact-message">Your Message *</Label>
                      <Textarea
                        id="contact-message"
                        name="message"
                        rows={4}
                        placeholder="Please share details of your loan requirement or query..."
                        required
                      />
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      Your information is protected under our Privacy Policy and never shared with telemarketers.
                    </div>

                    <Button type="submit" size="lg" className="w-full sm:w-auto px-8" disabled={sending}>
                      {sending ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <FaqSection faqs={contactFaqs} subtitle="Quick answers before you reach out." />
      </main>
      <PublicFooter />
    </div>
  );
}

