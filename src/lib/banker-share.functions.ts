import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const bankerTokenSchema = z.object({ token: z.string().uuid() });
const DOCUMENT_BUCKET = "loan-documents";
const URL_MARKERS = [
  `/storage/v1/object/public/${DOCUMENT_BUCKET}/`,
  `/storage/v1/object/sign/${DOCUMENT_BUCKET}/`,
  `/storage/v1/object/authenticated/${DOCUMENT_BUCKET}/`,
];

function getObjectPath(reference: string) {
  for (const marker of URL_MARKERS) {
    const markerIndex = reference.indexOf(marker);
    if (markerIndex >= 0) {
      return decodeURIComponent(reference.slice(markerIndex + marker.length).split("?")[0]);
    }
  }

  return decodeURIComponent(reference.replace(/^\/+/, "").split("?")[0]);
}

export const getBankerShare = createServerFn({ method: "GET" })
  .inputValidator((input) => bankerTokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link, error: linkError } = await supabaseAdmin
      .from("banker_share_links")
      .select("id, application_id, expires_at, is_active, access_count, recipient_name")
      .eq("token", data.token)
      .maybeSingle();

    if (linkError) throw new Error("Unable to open this secure link right now");
    if (!link || !link.is_active || new Date(link.expires_at).getTime() <= Date.now()) {
      return { status: "unavailable" as const };
    }

    const { data: application, error: applicationError } = await supabaseAdmin
      .from("loan_applications")
      .select("id, customer_id, loan_type_id, status_id, amount_requested, amount_approved, amount_disbursed, created_at")
      .eq("id", link.application_id)
      .maybeSingle();

    if (applicationError) throw new Error("Unable to load the shared application");
    if (!application) return { status: "unavailable" as const };

    const [customerResult, loanTypeResult, statusResult, documentsResult] = await Promise.all([
      application.customer_id
        ? supabaseAdmin.from("profiles").select("full_name, email, phone").eq("id", application.customer_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabaseAdmin.from("loan_types").select("name").eq("id", application.loan_type_id).maybeSingle(),
      application.status_id
        ? supabaseAdmin.from("loan_statuses").select("stage_name").eq("id", application.status_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabaseAdmin
        .from("application_documents")
        .select("id, document_name, file_url, uploaded_at")
        .eq("application_id", link.application_id)
        .eq("status", "approved")
        .order("uploaded_at", { ascending: false }),
    ]);

    if (customerResult.error || loanTypeResult.error || statusResult.error || documentsResult.error) {
      throw new Error("Unable to load the shared application");
    }

    const documents = await Promise.all((documentsResult.data ?? []).map(async (document) => {
      try {
        const path = getObjectPath(document.file_url);
        const { data: signed, error } = await supabaseAdmin.storage
          .from(DOCUMENT_BUCKET)
          .createSignedUrl(path, 60 * 60);
        return {
          id: document.id,
          name: document.document_name,
          uploadedAt: document.uploaded_at,
          extension: path.split(".").pop()?.toLowerCase() ?? "",
          url: error ? null : signed?.signedUrl ?? null,
        };
      } catch {
        return {
          id: document.id,
          name: document.document_name,
          uploadedAt: document.uploaded_at,
          extension: "",
          url: null,
        };
      }
    }));

    await supabaseAdmin
      .from("banker_share_links")
      .update({ access_count: link.access_count + 1 })
      .eq("id", link.id);

    return {
      status: "active" as const,
      expiresAt: link.expires_at,
      recipientName: link.recipient_name,
      application: {
        id: application.id,
        createdAt: application.created_at,
        amountRequested: application.amount_requested,
        amountApproved: application.amount_approved,
        amountDisbursed: application.amount_disbursed,
        loanType: loanTypeResult.data?.name ?? "Loan application",
        loanStatus: statusResult.data?.stage_name ?? "In progress",
      },
      customer: {
        name: customerResult.data?.full_name ?? "Customer",
        email: customerResult.data?.email ?? null,
        phone: customerResult.data?.phone ?? null,
      },
      documents,
    };
  });