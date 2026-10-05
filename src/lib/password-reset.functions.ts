import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const resetCustomerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      application_id: z.string().uuid(),
      password: z.string().min(8).max(72),
    })
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: isAdmin, error: adminError }, { data: isTeam, error: teamError }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("is_team_member", { _user_id: context.userId }),
    ]);
    if (adminError || teamError) throw new Error("Unable to verify access");
    if (!isTeam) throw new Error("Forbidden: team only");

    const { data: app, error: aErr } = await supabaseAdmin
      .from("loan_applications")
      .select("customer_id, assigned_to")
      .eq("id", data.application_id)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!app?.customer_id) throw new Error("This application has no linked customer account yet");
    if (!isAdmin && app.assigned_to !== context.userId) {
      throw new Error("Forbidden: this application is not assigned to you");
    }

    // Make sure the auth user has an email so mobile-based login works even
    // when the Supabase phone provider is disabled.
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(app.customer_id);
    const u: any = userRes?.user;
    const updates: any = { password: data.password };
    if (!u?.email) {
      const { data: prof } = await supabaseAdmin
        .from("profiles").select("phone").eq("id", app.customer_id).maybeSingle();
      const digits = String(prof?.phone ?? u?.phone ?? "").replace(/\D/g, "");
      if (digits) {
        updates.email = `m${digits}@mobile.loanhub.local`;
        updates.email_confirm = true;
      }
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(app.customer_id, updates);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("notifications").insert({
      user_id: app.customer_id,
      title: "Your password was reset",
      message: "Your account password was reset by your representative. Please sign in with the new password.",
      type: "password_reset",
      link: "/login",
    });

    return { ok: true };
  });
