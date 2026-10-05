import { createFileRoute } from "@tanstack/react-router";
import { PublicNav } from "@/components/PublicNav";
import { PublicFooter } from "@/components/PublicFooter";
import { FaqSection, applyFaqs } from "@/components/FaqSection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

const schema = z.object({
  name: z.string().trim().min(2, "Name required").max(100),
  phone: z.string().trim().min(10, "Valid phone required").max(15),
  email: z.string().trim().email("Valid email required").max(255).optional().or(z.literal("")),
  loan_type_id: z.string().min(1, "Select a loan type"),
  message: z.string().max(500).optional(),
});

export const Route = createFileRoute("/apply")({
  head: () => ({ meta: [{ title: "Apply for a Loan — Loans Mart India" }, { name: "description", content: "Submit your details and our team will reach out." }] }),
  component: ApplyPage,
});

function ApplyPage() {
  const [done, setDone] = useState(false);
  const { data: loans } = useQuery({
    queryKey: ["loans-apply"],
    queryFn: async () => (await supabase.from("loan_types").select("id,name").eq("is_active", true)).data ?? [],
  });

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting }, reset } =
    useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    const { error } = await supabase.from("leads").insert({
      name: values.name, phone: values.phone, email: values.email || null,
      loan_type_id: values.loan_type_id, message: values.message || null, source: "website",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Application submitted. We'll call you shortly.");
    setDone(true); reset();
  };

  return (
    <div>
      <PublicNav />
      <section className="container mx-auto px-4 py-16 max-w-2xl">
        <h1 className="text-4xl font-bold mb-3">Apply for a Loan</h1>
        <p className="text-muted-foreground mb-8">Fill the form and our loan consultant will reach out within 30 minutes.</p>
        {done ? (
          <Card><CardContent className="p-10 text-center">
            <CheckCircle2 className="h-14 w-14 text-success mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">We got your request!</h2>
            <p className="text-muted-foreground mb-6">Our team will contact you shortly.</p>
            <Button onClick={() => setDone(false)} variant="outline">Submit another</Button>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input {...register("name")} placeholder="Your name" />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input {...register("phone")} placeholder="+91 ..." />
                  {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
                </div>
                <div>
                  <Label>Email (optional)</Label>
                  <Input type="email" {...register("email")} placeholder="you@email.com" />
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                </div>
              </div>
              <div>
                <Label>Loan Type</Label>
                <Select value={watch("loan_type_id")} onValueChange={(v) => setValue("loan_type_id", v, { shouldValidate: true })}>
                  <SelectTrigger><SelectValue placeholder="Select a loan" /></SelectTrigger>
                  <SelectContent>{loans?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.loan_type_id && <p className="text-xs text-destructive mt-1">{errors.loan_type_id.message}</p>}
              </div>
              <div>
                <Label>Message (optional)</Label>
                <Textarea {...register("message")} placeholder="Tell us about your requirement" rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Submit Application"}</Button>
            </form>
          </CardContent></Card>
        )}
      </section>
      <FaqSection faqs={applyFaqs} subtitle="Common questions about applying with Loans Mart India." />
      <PublicFooter />
    </div>
  );
}
