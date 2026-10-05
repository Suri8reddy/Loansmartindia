import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";

export function PhoneLink({
  phone,
  className,
  iconClassName,
  showNumber = true,
}: {
  phone?: string | null;
  className?: string;
  iconClassName?: string;
  showNumber?: boolean;
}) {
  if (!phone) return <span className="text-muted-foreground">—</span>;
  const tel = phone.trim().replace(/(?!^\+)[^\d]/g, "");
  return (
    <a
      href={`tel:${tel}`}
      aria-label={`Call ${phone}`}
      className={cn(
        "inline-flex items-center gap-1.5 text-primary hover:underline whitespace-nowrap",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <Phone className={cn("h-3.5 w-3.5 shrink-0", iconClassName)} />
      {showNumber && <span>{phone}</span>}
    </a>
  );
}
