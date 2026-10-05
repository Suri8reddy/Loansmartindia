import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2 } from "lucide-react";
import { getBankLogoUrl } from "@/lib/bank-logos.functions";

/**
 * Resolves a storage path inside the `bank-logos` bucket to a signed URL.
 * Pass `path` as the value stored in banks.logo_url.
 */
export function useBankLogoUrl(path?: string | null) {
  const getLogoUrl = useServerFn(getBankLogoUrl);
  return useQuery({
    queryKey: ["bank-logo-signed", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      if (!path) return null;
      const result = await getLogoUrl({ data: { path } });
      return result.url;
    },
  });
}

export function BankLogo({
  path,
  alt,
  className = "h-10 w-auto object-contain",
}: {
  path?: string | null;
  alt: string;
  className?: string;
}) {
  const { data: url } = useBankLogoUrl(path);
  if (!path || !url) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded ${className}`}>
        <Building2 className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
