import { motion } from "framer-motion";
import { cn, formatCurrency } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  format?: "currency" | "number" | "percent";
  trend?: number;
  color?: string;
  delay?: number;
}

export function KPICard({ title, value, icon: Icon, format = "currency", trend, color, delay = 0 }: KPICardProps) {
  const displayValue = format === "currency" && typeof value === "number"
    ? formatCurrency(value)
    : format === "percent" && typeof value === "number"
    ? `${value.toFixed(1)}%`
    : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass rounded-xl p-5 hover:shadow-lg hover:shadow-[var(--color-primary)]/5 transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-[var(--color-muted-foreground)]">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{displayValue}</p>
          {trend !== undefined && (
            <div className={cn("flex items-center gap-1 text-xs", trend >= 0 ? "text-[var(--color-success)]" : "text-[var(--color-destructive)]")}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend)}% vs last month
            </div>
          )}
        </div>
        <div
          className="rounded-lg p-2.5 transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${color ?? "var(--color-primary)"}20` }}
        >
          <Icon className="h-5 w-5" style={{ color: color ?? "var(--color-primary)" }} />
        </div>
      </div>
    </motion.div>
  );
}
