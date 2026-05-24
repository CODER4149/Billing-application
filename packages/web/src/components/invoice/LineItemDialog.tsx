import { useEffect, useState } from "react";
import { SERVICE_TYPES } from "@/lib/constants";
import { Input, Label } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CenterModal } from "@/components/crud/SlidePanel";
import type { LineItemRow } from "./lineItemTypes";

interface LineItemDialogProps {
  open: boolean;
  onClose: () => void;
  item: LineItemRow | null;
  onSave: (item: LineItemRow) => void;
  isInterState: boolean;
}

export function LineItemDialog({ open, onClose, item, onSave, isInterState }: LineItemDialogProps) {
  const [form, setForm] = useState<LineItemRow | null>(item);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(item ? { ...item } : null);
      setErrors({});
    }
  }, [open, item]);

  if (!open || !form) return null;

  const set = (key: keyof LineItemRow, value: string | number) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.description.trim()) e.description = "Item description is required";
    if (form.quantity <= 0) e.quantity = "Quantity must be greater than 0";
    if (form.rate <= 0) e.rate = "Rate must be greater than 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const description = form.description.trim();
    onSave({ ...form, name: description, description });
    onClose();
  };

  const lineAmount = Math.round(Math.max(0, form.quantity * form.rate - form.discount) * 100) / 100;
  const taxRate = isInterState ? form.igstRate : form.cgstRate + form.sgstRate;
  const taxAmount = Math.round((lineAmount * taxRate) / 100 * 100) / 100;
  const total = Math.round((lineAmount + taxAmount) * 100) / 100;

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      title={item?.description ? "Edit Line Item" : "Add Line Item"}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Item</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label>Item Description *</Label>
          <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Drilling Work — 200 ft" />
          {errors.description && <p className="text-xs text-[var(--color-destructive)]">{errors.description}</p>}
        </div>
        <div className="space-y-2">
          <Label>Service Type</Label>
          <select
            value={form.serviceType}
            onChange={(e) => set("serviceType", e.target.value)}
            className="flex h-10 w-full rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] px-3 text-sm"
          >
            {SERVICE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>HSN / SAC Code</Label>
          <Input value={form.hsnCode} onChange={(e) => set("hsnCode", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Quantity *</Label>
          <Input type="number" min={0} step="0.01" value={form.quantity} onChange={(e) => set("quantity", parseFloat(e.target.value) || 0)} />
          {errors.quantity && <p className="text-xs text-[var(--color-destructive)]">{errors.quantity}</p>}
        </div>
        <div className="space-y-2">
          <Label>Unit of Measure</Label>
          <select
            value={form.unit}
            onChange={(e) => set("unit", e.target.value)}
            className="flex h-10 w-full rounded-lg border border-[var(--color-input)] bg-[var(--color-background)] px-3 text-sm"
          >
            {["nos", "ft", "m", "hr", "day", "km"].map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Unit Rate (₹) *</Label>
          <Input type="number" min={0} step="0.01" value={form.rate} onChange={(e) => set("rate", parseFloat(e.target.value) || 0)} />
          {errors.rate && <p className="text-xs text-[var(--color-destructive)]">{errors.rate}</p>}
        </div>
        <div className="space-y-2">
          <Label>Line Discount (₹)</Label>
          <Input type="number" min={0} step="0.01" value={form.discount} onChange={(e) => set("discount", parseFloat(e.target.value) || 0)} />
        </div>
        {!isInterState ? (
          <>
            <div className="space-y-2">
              <Label>CGST Rate (%)</Label>
              <Input type="number" min={0} value={form.cgstRate} onChange={(e) => set("cgstRate", parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>SGST Rate (%)</Label>
              <Input type="number" min={0} value={form.sgstRate} onChange={(e) => set("sgstRate", parseFloat(e.target.value) || 0)} />
            </div>
          </>
        ) : (
          <div className="space-y-2 sm:col-span-2">
            <Label>IGST Rate (%)</Label>
            <Input type="number" min={0} value={form.igstRate} onChange={(e) => set("igstRate", parseFloat(e.target.value) || 0)} />
          </div>
        )}
      </div>
      <div className="mt-4 rounded-xl bg-[var(--color-accent)]/40 p-4 text-sm space-y-1">
        <div className="flex justify-between"><span>Taxable Amount</span><span>{formatCurrency(lineAmount)}</span></div>
        <div className="flex justify-between"><span>GST Amount</span><span>{formatCurrency(taxAmount)}</span></div>
        <div className="flex justify-between font-semibold pt-1 border-t border-[var(--color-border)]">
          <span>Line Total (incl. GST)</span><span>{formatCurrency(total)}</span>
        </div>
      </div>
    </CenterModal>
  );
}
