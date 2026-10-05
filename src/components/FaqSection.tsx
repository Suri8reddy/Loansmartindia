import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export type Faq = { q: string; a: string };

export const generalFaqs: Faq[] = [
  { q: "Who is Loans Mart India?", a: "We are a digital loan distribution platform. We work with 50+ RBI-registered banks and NBFCs to help you compare offers and get the best possible rate — with a dedicated consultant guiding you end to end." },
  { q: "Do you charge customers any fee?", a: "No. Our advisory and application support is free for borrowers. We are paid a distribution commission by the lending partner after your loan is disbursed." },
  { q: "How long does approval take?", a: "Most applications get an in-principle decision within 24-48 hours of complete document submission. Disbursal typically follows in 2-7 working days depending on the product and lender." },
  { q: "What documents do I need?", a: "Usually PAN, Aadhaar, recent salary slips or ITR, and 6 months of bank statements. Property or vehicle loans need the related ownership documents. Your consultant shares an exact checklist." },
  { q: "Is my data safe?", a: "Yes. Documents are stored encrypted, access is role-restricted, and your details are shared only with the lenders you choose to apply to." },
  { q: "Can I track my application?", a: "Yes. Every applicant gets a customer portal login showing live status, bank-wise progress, document requests and approvals in real time." },
];

export const applyFaqs: Faq[] = [
  { q: "How long does the application form take?", a: "About 3-5 minutes. You only need basic personal, income and loan requirement details to start." },
  { q: "Will applying affect my credit score?", a: "Submitting this form does not affect your score. A hard credit check happens only when you approve a formal application to a specific lender." },
  { q: "What happens after I submit?", a: "A loan consultant calls you within 30 minutes on working days, confirms your requirement and shares matching offers before anything is sent to a bank." },
  { q: "Can I apply to multiple banks?", a: "Yes. We can submit your file to several partner banks and you can track each bank's status separately in your portal." },
  ...generalFaqs.slice(3),
];

export const contactFaqs: Faq[] = [
  { q: "What are your working hours?", a: "Monday to Saturday, 9:30 AM to 7:00 PM IST. Messages sent outside these hours are answered the next working morning." },
  { q: "How fast will someone respond?", a: "Calls and WhatsApp messages are usually answered within 30 minutes during working hours; emails within one working day." },
  { q: "Can I visit your office?", a: "Yes, walk-ins are welcome during working hours. We recommend calling ahead so a consultant for your loan type is available." },
  { q: "I want to partner as a DSA — who do I contact?", a: "Use the form and select a partnership subject. Our channel team will share the onboarding process, payout structure and portal access." },
  ...generalFaqs.slice(1, 4),
];

export function FaqSection({
  faqs,
  title = "Frequently asked questions",
  subtitle = "Everything you need to know before you apply.",
  className = "",
}: {
  faqs?: Faq[];
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  const items = (faqs ?? []).filter((f) => f?.q?.trim() && f?.a?.trim());
  if (!items.length) return null;
  return (
    <section className={`container mx-auto px-4 py-16 max-w-3xl ${className}`} aria-label="Frequently asked questions">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
          <HelpCircle className="h-3.5 w-3.5" /> FAQs
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <Accordion type="single" collapsible className="rounded-xl border bg-card px-4">
        {items.map((f, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left font-medium">{f.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground whitespace-pre-wrap">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
