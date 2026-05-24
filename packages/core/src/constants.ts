export const SERVICE_TYPES = [
  { value: "drilling", label: "Drilling" },
  { value: "pvc_pipe", label: "PVC Pipe" },
  { value: "transportation", label: "Transportation" },
  { value: "flushing", label: "Flushing" },
  { value: "casing", label: "Casing" },
  { value: "pump", label: "Pump Installation" },
  { value: "other", label: "Other" },
] as const;

export const INVOICE_STATUSES = [
  { code: "draft", label: "Draft", color: "#94a3b8" },
  { code: "ready_to_bill", label: "Ready to Bill", color: "#60a5fa" },
  { code: "sent_for_billing", label: "Sent for Billing", color: "#818cf8" },
  { code: "invoice_generated", label: "Invoice Generated", color: "#a78bfa" },
  { code: "payment_pending", label: "Payment Pending", color: "#fbbf24" },
  { code: "partially_paid", label: "Partially Paid", color: "#fb923c" },
  { code: "paid", label: "Paid", color: "#22c55e" },
  { code: "overdue", label: "Overdue", color: "#ef4444" },
  { code: "cancelled", label: "Cancelled", color: "#64748b" },
] as const;

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
] as const;
