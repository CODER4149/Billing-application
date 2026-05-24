import { getStatusColor, getStatusLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface StatusPillProps {
  status: string;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const color = getStatusColor(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize whitespace-nowrap",
        className
      )}
      style={{ backgroundColor: `${color}18`, color }}
    >
      {getStatusLabel(status)}
    </span>
  );
}

export function DateMeta({ createdAt, updatedAt }: { createdAt?: string; updatedAt?: string }) {
  if (!createdAt && !updatedAt) return null;
  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div className="text-xs text-[var(--color-muted-foreground)] space-y-0.5">
      {createdAt && <div>Created {fmt(createdAt)}</div>}
      {updatedAt && updatedAt !== createdAt && <div>Updated {fmt(updatedAt)}</div>}
    </div>
  );
}
