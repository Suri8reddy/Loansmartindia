import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().min(4).max(20),
  password: z.string().min(8).max(72),
  loanTypeId: z.string().uuid(),
  amountRequested: z.number().positive().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const createApplicationForNewCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Caller must be admin / dsa / rm / team_leader / loan_executive
    const { data: roles, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "dsa", "rm", "team_leader", "loan_executive"]);
    if (rErr) throw new Error(rErr.message);
    if (!roles || roles.length === 0) throw new Error("Forbidden");
    const isAdmin = roles.some((r: any) => r.role === "admin");

    const email = data.email?.trim() || null;

    // Reject if email/phone already used
    if (email) {
      const { data: existingEmail } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existingEmail) throw new Error("A customer with this email already exists");
    }
    const { data: existingPhone } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", data.phone)
      .maybeSingle();
    if (existingPhone) throw new Error("A customer with this phone number already exists");

    // Phone provider may be disabled in Supabase Auth, so we always set an email
    // on the auth user (synthetic when none provided) and let the user sign in
    // with mobile number — login resolves digits-only input to this synthetic email.
    const digits = data.phone.replace(/\D/g, "");
    const authEmail = email || `m${digits}@mobile.loanhub.local`;
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, phone: data.phone },
    });
    if (cErr) throw new Error(cErr.message);
    const customerId = created.user!.id;

    try {
      await supabaseAdmin.from("profiles").upsert({
        id: customerId,
        email,
        full_name: data.fullName,
        phone: data.phone,
      });

      const { data: firstStatus } = await supabaseAdmin
        .from("loan_statuses")
        .select("id")
        .eq("is_active", true)
        .order("stage_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      // Only admins can assign to someone else; team members auto-assign to self
      const assignedTo = isAdmin ? (data.assignedTo ?? context.userId) : context.userId;

      const { data: app, error: aErr } = await supabaseAdmin
        .from("loan_applications")
        .insert({
          customer_id: customerId,
          loan_type_id: data.loanTypeId,
          status_id: firstStatus?.id ?? null,
          assigned_to: assignedTo,
          amount_requested: data.amountRequested ?? null,
          notes: data.notes ?? null,
        })
        .select("id")
        .single();
      if (aErr) throw new Error(aErr.message);

      if (firstStatus?.id) {
        await supabaseAdmin.from("application_status_history").insert({
          application_id: app.id,
          status_id: firstStatus.id,
          updated_by: context.userId,
          notes: "Application created by team",
        });
      }

      await supabaseAdmin.from("notifications").insert({
        user_id: customerId,
        title: "Your loan application is ready",
        message:
          "Your account has been created. Sign in with the mobile number or email and password shared by your representative to upload documents and track your application.",
        type: "application_created",
        link: `/customer/applications/${app.id}`,
      });

      return { applicationId: app.id, customerId };
    } catch (e) {
      // Rollback auth user on failure
      await supabaseAdmin.auth.admin.deleteUser(customerId).catch(() => {});
      throw e;
    }
  });
