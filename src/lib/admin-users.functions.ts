import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "customer", "dsa", "rm", "loan_executive", "team_leader"] as const;

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const createUserWithRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      email: z.string().email().max(255),
      password: z.string().min(8).max(128),
      full_name: z.string().trim().min(1).max(120),
      phone: z.string().trim().max(32).optional().or(z.literal("")),
      role: z.enum(ROLES),
      loan_type_id: z.string().uuid().optional().or(z.literal("")),
      amount_requested: z.number().nonnegative().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, phone: data.phone ?? "" },
    });
    if (error) throw new Error(error.message);
    if (!created.user) throw new Error("User account was not created");
    const newId = created.user.id;

    // handle_new_user trigger inserts default 'customer' role; replace with desired role
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newId, role: data.role });
    if (rErr) throw new Error(rErr.message);

    // Ensure profile exists / is updated
    await supabaseAdmin.from("profiles").upsert({
      id: newId,
      email: data.email,
      full_name: data.full_name,
      phone: data.phone || null,
    });

    // If admin assigned a loan product to a customer, auto-create an application
    let applicationId: string | null = null;
    if (data.role === "customer" && data.loan_type_id) {
      const { data: firstStatus } = await supabaseAdmin
        .from("loan_statuses")
        .select("id")
        .eq("is_active", true)
        .order("stage_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      const { data: app, error: appErr } = await supabaseAdmin
        .from("loan_applications")
        .insert({
          customer_id: newId,
          loan_type_id: data.loan_type_id,
          status_id: firstStatus?.id ?? null,
          amount_requested: data.amount_requested ?? null,
        })
        .select("id")
        .single();
      if (appErr) throw new Error(appErr.message);
      applicationId = app.id;

      if (firstStatus?.id) {
        await supabaseAdmin.from("application_status_history").insert({
          application_id: app.id,
          status_id: firstStatus.id,
          updated_by: context.userId,
          notes: "Application created by admin",
        });
      }
    }

    return { id: newId, application_id: applicationId };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid(), role: z.enum(ROLES) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deactivateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid(), is_active: z.boolean() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.is_active })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateUserByAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    user_id: z.string().uuid(),
    full_name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().max(32).optional().or(z.literal("")),
    role: z.enum(ROLES),
    is_active: z.boolean(),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      email: data.email,
      user_metadata: { full_name: data.full_name, phone: data.phone ?? "" },
    });
    if (authError) throw new Error(authError.message);
    const { error: profileError } = await supabaseAdmin.from("profiles").update({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || null,
      is_active: data.is_active,
    }).eq("id", data.user_id);
    if (profileError) throw new Error(profileError.message);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    if (roleError) throw new Error(roleError.message);
    return { ok: true };
  });

export const archiveUserByAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid(), archived: z.boolean() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("You cannot archive your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({
      archived_at: data.archived ? new Date().toISOString() : null,
      is_active: !data.archived,
    }).eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUserByAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("You cannot delete your own account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nullableRefs = [
      ["application_document_requests", "requested_by"], ["application_documents", "uploaded_by"],
      ["application_status_history", "updated_by"], ["audit_logs", "user_id"],
      ["banker_share_links", "generated_by"], ["leads", "converted_by"], ["leads", "created_by"],
    ] as const;
    for (const [table, column] of nullableRefs) {
      const { error } = await (supabaseAdmin as any).from(table).update({ [column]: null }).eq(column, data.user_id);
      if (error) throw new Error(error.message);
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const nullableMoney = z.number().nonnegative().nullable();

export const updateApplicationByAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    application_id: z.string().uuid(), customer_id: z.string().uuid().nullable(), loan_type_id: z.string().uuid(),
    status_id: z.string().uuid().nullable(), assigned_to: z.string().uuid().nullable(),
    amount_requested: nullableMoney, amount_approved: nullableMoney, amount_disbursed: nullableMoney,
    notes: z.string().trim().max(5000).nullable(),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { application_id, ...patch } = data;
    const { data: current, error: readError } = await supabaseAdmin.from("loan_applications").select("status_id").eq("id", application_id).single();
    if (readError) throw new Error(readError.message);
    const { error } = await supabaseAdmin.from("loan_applications").update(patch).eq("id", application_id);
    if (error) throw new Error(error.message);
    if (data.status_id && data.status_id !== current.status_id) {
      const { error: historyError } = await supabaseAdmin.from("application_status_history").insert({ application_id, status_id: data.status_id, updated_by: context.userId, notes: "Status changed through application edit" });
      if (historyError) throw new Error(historyError.message);
    }
    return { ok: true };
  });

export const manageRecordByAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    kind: z.enum(["lead", "application"]), id: z.string().uuid(), action: z.enum(["archive", "restore", "delete"]),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = data.kind === "lead" ? "leads" : "loan_applications";
    const result = data.action === "delete"
      ? await supabaseAdmin.from(table).delete().eq("id", data.id)
      : await supabaseAdmin.from(table).update({ archived_at: data.action === "archive" ? new Date().toISOString() : null }).eq("id", data.id);
    if (result.error) throw new Error(result.error.message);
    return { ok: true };
  });
