import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const bankLogoPath = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, "Invalid logo path")
  .refine((path) => !path.includes("..") && !path.startsWith("/"), "Invalid logo path");

/**
 * Returns a short-lived URL only when the requested object is the configured
 * logo of an active bank. The private bucket is never listed or exposed.
 */
export const getBankLogoUrl = createServerFn({ method: "GET" })
  .inputValidator(z.object({ path: bankLogoPath }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: bank, error: bankError } = await supabaseAdmin
      .from("banks")
      .select("id")
      .eq("logo_url", data.path)
      .eq("is_active", true)
      .maybeSingle();

    if (bankError || !bank) return { url: null };

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from("bank-logos")
      .createSignedUrl(data.path, 60 * 60);

    if (signError) return { url: null };
    return { url: signed.signedUrl };
  });