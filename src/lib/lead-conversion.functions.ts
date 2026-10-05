import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getCallerAccess(supabase: any, userId: string) {
  const [{ data: isAdmin, error: adminError }, { data: isTeam, error: teamError }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("is_team_member", { _user_id: userId }),
  ]);
  if (adminError || teamError) throw new Error("Unable to verify access");
  if (!isTeam) throw new Error("Forbidden: team only");
  return { isAdmin: Boolean(isAdmin) };
}

export const convertLeadToApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ lead_id: z.string().uuid(), password: z.string().min(8).max(72).optional().or(z.literal("")) }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { isAdmin } = await getCallerAccess(context.supabase, context.userId);

    const { data: lead, error: lErr } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", data.lead_id)
      .maybeSingle();
    if (lErr) throw new Error(lErr.message);
    if (!lead) throw new Error("Lead not found");
    if (!isAdmin && lead.assigned_to !== context.userId) {
      throw new Error("Forbidden: this lead is not assigned to you");
    }
    if ((lead as any).application_id) throw new Error("Lead already converted");
    if (!lead.loan_type_id) throw new Error("Lead has no loan product selected");

    let customerId: string | null = null;
    let customerCreated = false;
    const password = (data.password ?? "").trim();
    if (!lead.email && !password) {
      throw new Error("Enter a password to create mobile login for this lead");
    }

    if (lead.email) {
      // Find existing user by email via profiles
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", lead.email)
        .maybeSingle();

      if (existingProfile) {
        customerId = existingProfile.id;
      } else {
        const accountPassword = password ||
          Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase() + "!9";
        const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
          email: lead.email,
          phone: lead.phone || undefined,
          password: accountPassword,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: { full_name: lead.name, phone: lead.phone },
        });
        if (cErr) throw new Error(cErr.message);
        customerId = created.user!.id;
        customerCreated = true;

        await supabaseAdmin.from("profiles").upsert({
          id: customerId,
          email: lead.email,
          full_name: lead.name,
          phone: lead.phone,
        });

        if (!password) {
          await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: lead.email,
          });
        }
      }
    } else if (password) {
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("phone", lead.phone)
        .maybeSingle();

      if (existingProfile) {
        customerId = existingProfile.id;
      } else {
        // Phone provider may be disabled — use a synthetic email so the user
        // can sign in via mobile (login resolves digits to this email).
        const digits = String(lead.phone ?? "").replace(/\D/g, "");
        const authEmail = `m${digits}@mobile.loanhub.local`;
        const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
          email: authEmail,
          password,
          email_confirm: true,
          user_metadata: { full_name: lead.name, phone: lead.phone },
        });
        if (cErr) throw new Error(cErr.message);
        customerId = created.user!.id;
        customerCreated = true;

        await supabaseAdmin.from("profiles").upsert({
          id: customerId,
          email: null,
          full_name: lead.name,
          phone: lead.phone,
        });
      }
    }

    // Default first stage for this loan product, falling back to common stages.
    const { data: firstStatusRows } = await supabaseAdmin
      .from("loan_statuses")
      .select("id,loan_type_id")
      .eq("is_active", true)
      .or(`loan_type_id.eq.${lead.loan_type_id},loan_type_id.is.null`)
      .order("stage_order", { ascending: true })
      .limit(20);
    const firstStatus = (firstStatusRows ?? []).find((s: any) => s.loan_type_id === lead.loan_type_id) ?? firstStatusRows?.[0];

    const { data: app, error: aErr } = await supabaseAdmin
      .from("loan_applications")
      .insert({
        customer_id: customerId,
        loan_type_id: lead.loan_type_id,
        status_id: firstStatus?.id ?? null,
        assigned_to: lead.assigned_to ?? context.userId,
        amount_requested: (lead as any).amount_requested ?? null,
        notes: [lead.message, (lead as any).requirements].filter(Boolean).join("\n\n") || null,
      })
      .select("id")
      .single();
    if (aErr) throw new Error(aErr.message);

    if (firstStatus?.id) {
      await supabaseAdmin.from("application_status_history").insert({
        application_id: app.id,
        status_id: firstStatus.id,
        updated_by: context.userId,
        notes: `Converted from lead "${lead.name}"`,
      });
    }

    await supabaseAdmin
      .from("leads")
      .update({ status: "converted", application_id: app.id, converted_by: context.userId, converted_at: new Date().toISOString() } as any)
      .eq("id", lead.id);

    if (customerId) {
      await supabaseAdmin.from("notifications").insert({
        user_id: customerId,
        title: "Your loan application is ready",
        message: customerCreated
          ? password
            ? "Your account has been created. Sign in with the mobile number/email and password shared by your representative."
            : "We've created your account. Please check your email to set a password, then sign in to upload your documents."
          : "An application has been created for you. Please sign in and upload the required documents.",
        type: "application_created",
        link: `/customer/applications/${app.id}`,
      });
    }

    return { applicationId: app.id, customerCreated };
  });
