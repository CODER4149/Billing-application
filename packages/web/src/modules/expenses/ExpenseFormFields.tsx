import { useEffect, useState } from "react";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ExpenseFormFieldsProps {
  expense?: Record<string, unknown> | null;
  vehicles: Array<{ id: string; name: string }>;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function ExpenseFormFields({ expense, vehicles, onSave, onCancel }: ExpenseFormFieldsProps) {
  const [form, setForm] = useState({
    category: "fuel", description: "", amount: "", expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "cash", vehicleId: "", receiptNumber: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (expense) {
      setForm({
        category: String(expense.category ?? "fuel"),
        description: String(expense.description ?? ""),
        amount: String(expense.amount ?? ""),
        expenseDate: String(expense.expense_date ?? "").slice(0, 10),
        paymentMethod: String(expense.payment_method ?? "cash"),
        vehicleId: String(expense.vehicle_id ?? ""),
        receiptNumber: String(expense.receipt_number ?? ""),
        notes: String(expense.notes ?? ""),
      });
    }
  }, [expense]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.description.trim() || !form.amount || !form.expenseDate) {
      setError("Description, amount, and date are required");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, amount: Number(form.amount), vehicleId: form.vehicleId || undefined });
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category *</Label>
          <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="fuel">Fuel</option>
            <option value="maintenance">Maintenance</option>
            <option value="parts">Parts</option>
            <option value="labor">Labor</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" value={form.expenseDate} onChange={(e) => set("expenseDate", e.target.value)} required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Description *</Label>
          <Input value={form.description} onChange={(e) => set("description", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Amount *</Label>
          <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cheque">Cheque</option>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Vehicle</Label>
          <Select value={form.vehicleId} onChange={(e) => set("vehicleId", e.target.value)}>
            <option value="">— None —</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Receipt #</Label>
          <Input value={form.receiptNumber} onChange={(e) => set("receiptNumber", e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Expense"}</Button>
      </div>
    </form>
  );
}
