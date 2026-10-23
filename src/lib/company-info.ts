import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyContactDetails {
  brandName: string;
  legalName: string;
  tagline: string;
  phone: string;
  email: string;
  supportEmail: string;
  grievanceEmail: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  hours: string;
  whatsapp?: string;
  siteUrl: string;
}

export const DEFAULT_COMPANY_DETAILS: CompanyContactDetails = {
  brandName: "Loans Mart India",
  legalName: "Loans Mart India Financial Services",
  tagline: "Smart Loans. Better Tomorrows.",
  phone: "+91 98765 43210", // Configurable dynamically via Admin > Website > Contact Info
  email: "hello@loansmartindia.com",
  supportEmail: "support@loansmartindia.com",
  grievanceEmail: "grievance@loansmartindia.com",
  address: "Loans Mart India, FinTech Tower, Bandra Kurla Complex (BKC)",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400051",
  country: "India",
  hours: "Monday – Saturday: 9:30 AM – 6:30 PM IST",
  whatsapp: "+91 98765 43210",
  siteUrl: "https://loansmartindia.com",
};

/**
 * Hook to retrieve dynamic website contact settings from the database (website_content section='contact')
 * with fallback to established Loans Mart India defaults.
 */
export function useCompanyContact() {
  const { data } = useQuery({
    queryKey: ["website_content", "contact"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_content")
        .select("content_json")
        .eq("section", "contact")
        .maybeSingle();
      if (error || !data) return null;
      return data.content_json as Record<string, string>;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  const custom = data ?? {};

  const contact: CompanyContactDetails = {
    ...DEFAULT_COMPANY_DETAILS,
    phone: custom.phone?.trim() || DEFAULT_COMPANY_DETAILS.phone,
    email: custom.email?.trim() || DEFAULT_COMPANY_DETAILS.email,
    address: custom.address?.trim() || DEFAULT_COMPANY_DETAILS.address,
    hours: custom.hours?.trim() || DEFAULT_COMPANY_DETAILS.hours,
    whatsapp: custom.whatsapp?.trim() || DEFAULT_COMPANY_DETAILS.whatsapp,
  };

  return contact;
}
