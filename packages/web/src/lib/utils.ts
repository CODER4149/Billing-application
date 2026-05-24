import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  const normalized = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(normalized)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalized);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "#94a3b8",
    ready_to_bill: "#60a5fa",
    sent_for_billing: "#818cf8",
    invoice_generated: "#a78bfa",
    payment_pending: "#fbbf24",
    partially_paid: "#fb923c",
    paid: "#22c55e",
    overdue: "#ef4444",
    cancelled: "#64748b",
    pending: "#fbbf24",
    active: "#22c55e",
    completed: "#22c55e",
  };
  return colors[status] ?? "#94a3b8";
}

export function getStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
