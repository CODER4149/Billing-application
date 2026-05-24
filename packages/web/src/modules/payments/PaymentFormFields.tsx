import { useEffect, useState } from "react";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface PaymentFormFieldsProps {
  payment?: Record<string, unknown> | null;
  invoices: Array<{ id: string; invoice_number: string; client_name: string; pending_amount: number }>;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function PaymentFormFields({ payment, invoices, onSave, onCancel }: PaymentFormFieldsProps) {
  const [form, setForm] = useState({
    invoiceId: "", amount: "", paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "cash", referenceNumber: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (payment) {
      setForm({
        invoiceId: String(payment.invoice_id ?? ""),
        amount: String(payment.amount ?? ""),
        paymentDate: String(payment.payment_date ?? "").slice(0, 10),
        paymentMethod: String(payment.payment_method ?? "cash"),
        referenceNumber: String(payment.reference_number ?? ""),
        notes: String(payment.notes ?? ""),
      });
    }
  }, [payment]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const selectedInvoice = invoices.find((i) => i.id === form.invoiceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.invoiceId || !form.amount || !form.paymentDate) {
      setError("Invoice, amount, and date are required");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]">{error}</div>
      )}
      <div className="space-y-2">
        <Label>Invoice *</Label>
        <Select value={form.invoiceId} onChange={(e) => set("invoiceId", e.target.value)} required>
          <option value="">Select invoice</option>
          {invoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.invoice_number} — {inv.client_name} (Pending: {formatCurrency(inv.pending_amount)})
            </option>
          ))}
        </Select>
      </div>
      {selectedInvoice && (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Pending balance: {formatCurrency(selectedInvoice.pending_amount)}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Amount *</Label>
          <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" value={form.paymentDate} onChange={(e) => set("paymentDate", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Method</Label>
          <Select value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
            <option value="card">Card</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Reference #</Label>
          <Input value={form.referenceNumber} onChange={(e) => set("referenceNumber", e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Payment"}</Button>
      </div>
    </form>
  );
}
