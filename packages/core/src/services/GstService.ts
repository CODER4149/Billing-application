export interface GstRates {
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
}

export interface GstBreakdown {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export interface InvoiceItemInput {
  description: string;
  serviceType: string;
  quantity: number;
  rate: number;
  discount?: number;
  hsnCode?: string;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
}

export interface InvoiceTotals {
  subtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
}

export interface ProcessedInvoiceItem extends InvoiceItemInput {
  amount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
  paymentStatus: "unpaid" | "partial" | "paid";
}

export function calculateItemGst(
  amount: number,
  isInterState: boolean,
  rates: GstRates
): GstBreakdown {
  const taxableAmount = amount;
  if (isInterState) {
    const igstAmount = round2((taxableAmount * rates.igstRate) / 100);
    return {
      taxableAmount,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount,
      totalTax: igstAmount,
      totalAmount: round2(taxableAmount + igstAmount),
    };
  }
  const cgstAmount = round2((taxableAmount * rates.cgstRate) / 100);
  const sgstAmount = round2((taxableAmount * rates.sgstRate) / 100);
  return {
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount: 0,
    totalTax: round2(cgstAmount + sgstAmount),
    totalAmount: round2(taxableAmount + cgstAmount + sgstAmount),
  };
}

export function processInvoiceItem(
  item: InvoiceItemInput,
  isInterState: boolean,
  defaultRates: GstRates
): ProcessedInvoiceItem {
  const discount = item.discount ?? 0;
  const amount = round2(item.quantity * item.rate - discount);
  const rates: GstRates = {
    cgstRate: item.cgstRate ?? defaultRates.cgstRate,
    sgstRate: item.sgstRate ?? defaultRates.sgstRate,
    igstRate: item.igstRate ?? defaultRates.igstRate,
  };
  const gst = calculateItemGst(amount, isInterState, rates);
  return {
    ...item,
    discount,
    amount,
    cgstRate: rates.cgstRate,
    sgstRate: rates.sgstRate,
    igstRate: rates.igstRate,
    cgstAmount: gst.cgstAmount,
    sgstAmount: gst.sgstAmount,
    igstAmount: gst.igstAmount,
    taxAmount: gst.totalTax,
    totalAmount: gst.totalAmount,
    paidAmount: 0,
    pendingAmount: gst.totalAmount,
    paymentStatus: "unpaid",
  };
}

export function calculateInvoiceTotals(items: ProcessedInvoiceItem[]): InvoiceTotals {
  const subtotal = round2(items.reduce((sum, i) => sum + i.amount, 0));
  const cgstTotal = round2(items.reduce((sum, i) => sum + i.cgstAmount, 0));
  const sgstTotal = round2(items.reduce((sum, i) => sum + i.sgstAmount, 0));
  const igstTotal = round2(items.reduce((sum, i) => sum + i.igstAmount, 0));
  const taxTotal = round2(cgstTotal + sgstTotal + igstTotal);
  const discountTotal = round2(items.reduce((sum, i) => sum + (i.discount ?? 0), 0));
  // Grand total = sum of rounded line totals so table, summary, and words stay aligned
  const grandTotal = round2(items.reduce((sum, i) => sum + i.totalAmount, 0));
  return { subtotal, cgstTotal, sgstTotal, igstTotal, taxTotal, discountTotal, grandTotal };
}

export function deriveInvoiceStatus(
  grandTotal: number,
  paidAmount: number,
  dueDate?: string | null
): string {
  if (grandTotal <= 0) return "draft";
  if (paidAmount >= grandTotal) return "paid";
  if (paidAmount > 0) return "partially_paid";
  if (dueDate && new Date(dueDate) < new Date()) return "overdue";
  return "payment_pending";
}

export function deriveItemPaymentStatus(
  totalAmount: number,
  paidAmount: number
): "unpaid" | "partial" | "paid" {
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount >= totalAmount) return "paid";
  return "partial";
}

export function formatCurrency(amount: number, locale = "en-IN"): string {
  const normalized = round2(amount);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalized);
}

export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
