import { Badge } from "@/components/ui/badge";

const colorMap: Record<string, string> = {
  gray: "bg-muted text-foreground",
  amber: "bg-warning/20 text-warning-foreground border-warning/40",
  blue: "bg-accent text-accent-foreground",
  green: "bg-success/20 text-success border-success/40",
  red: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ label, color = "blue" }: { label: string; color?: string }) {
  return <Badge variant="outline" className={`${colorMap[color] ?? colorMap.blue}`}>{label}</Badge>;
}
