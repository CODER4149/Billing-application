import { useEffect, useState } from "react";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BorewellFormFieldsProps {
  job?: Record<string, unknown> | null;
  clients: Array<{ id: string; name: string }>;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function BorewellFormFields({ job, clients, onSave, onCancel }: BorewellFormFieldsProps) {
  const [form, setForm] = useState({
    clientId: "", siteAddress: "", startDate: "", endDate: "", status: "pending",
    totalDepth: "0", waterFoundAt: "", waterSuccess: false, drillingCost: "0",
    casingDepth: "", pumpType: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (job) {
      setForm({
        clientId: String(job.client_id ?? ""),
        siteAddress: String(job.site_address ?? ""),
        startDate: job.start_date ? String(job.start_date).slice(0, 10) : "",
        endDate: job.end_date ? String(job.end_date).slice(0, 10) : "",
        status: String(job.status ?? "pending"),
        totalDepth: String(job.total_depth ?? 0),
        waterFoundAt: job.water_found_at != null ? String(job.water_found_at) : "",
        waterSuccess: Boolean(job.water_success),
        drillingCost: String(job.drilling_cost ?? 0),
        casingDepth: job.casing_depth != null ? String(job.casing_depth) : "",
        pumpType: String(job.pump_type ?? ""),
        notes: String(job.notes ?? ""),
      });
    }
  }, [job]);

  const set = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.clientId || !form.siteAddress.trim()) {
      setError("Client and site address are required");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        clientId: form.clientId,
        siteAddress: form.siteAddress,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        status: form.status,
        totalDepth: Number(form.totalDepth),
        waterFoundAt: form.waterFoundAt ? Number(form.waterFoundAt) : undefined,
        waterSuccess: form.waterSuccess,
        drillingCost: Number(form.drillingCost),
        casingDepth: form.casingDepth ? Number(form.casingDepth) : undefined,
        pumpType: form.pumpType || undefined,
        notes: form.notes || undefined,
      });
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
        <div className="space-y-2 sm:col-span-2">
          <Label>Client *</Label>
          <Select value={form.clientId} onChange={(e) => set("clientId", e.target.value)} required>
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Site Address *</Label>
          <Textarea value={form.siteAddress} onChange={(e) => set("siteAddress", e.target.value)} rows={2} required />
        </div>
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Total Depth (ft)</Label>
          <Input type="number" min="0" value={form.totalDepth} onChange={(e) => set("totalDepth", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Water Found At (ft)</Label>
          <Input type="number" min="0" value={form.waterFoundAt} onChange={(e) => set("waterFoundAt", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Drilling Cost</Label>
          <Input type="number" min="0" step="0.01" value={form.drillingCost} onChange={(e) => set("drillingCost", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Casing Depth (ft)</Label>
          <Input type="number" min="0" value={form.casingDepth} onChange={(e) => set("casingDepth", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Pump Type</Label>
          <Input value={form.pumpType} onChange={(e) => set("pumpType", e.target.value)} />
        </div>
        <div className="space-y-2 flex items-end">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.waterSuccess} onChange={(e) => set("waterSuccess", e.target.checked)} />
            Water success
          </label>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Job"}</Button>
      </div>
    </form>
  );
}
