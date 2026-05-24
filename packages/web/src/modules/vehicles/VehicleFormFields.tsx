import { useEffect, useState } from "react";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface VehicleFormFieldsProps {
  vehicle?: Record<string, unknown> | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function VehicleFormFields({ vehicle, onSave, onCancel }: VehicleFormFieldsProps) {
  const [form, setForm] = useState({
    name: "", registrationNumber: "", vehicleType: "truck", make: "", model: "",
    year: "", status: "active", fuelType: "", driverName: "", operatorName: "", transportDetails: "",
    surveyNo: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (vehicle) {
      setForm({
        name: String(vehicle.name ?? ""),
        registrationNumber: String(vehicle.registration_number ?? ""),
        vehicleType: String(vehicle.vehicle_type ?? "truck"),
        make: String(vehicle.make ?? ""),
        model: String(vehicle.model ?? ""),
        year: vehicle.year != null ? String(vehicle.year) : "",
        status: String(vehicle.status ?? "active"),
        fuelType: String(vehicle.fuel_type ?? ""),
        driverName: String(vehicle.driver_name ?? ""),
        operatorName: String(vehicle.operator_name ?? ""),
        transportDetails: String(vehicle.transport_details ?? ""),
        surveyNo: String(vehicle.survey_no ?? ""),
        notes: String(vehicle.notes ?? ""),
      });
    }
  }, [vehicle]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.registrationNumber.trim()) {
      setError("Name and registration are required");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, year: form.year ? Number(form.year) : undefined });
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
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Registration *</Label>
          <Input value={form.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={form.vehicleType} onChange={(e) => set("vehicleType", e.target.value)}>
            <option value="truck">Truck</option>
            <option value="rig">Drilling Rig</option>
            <option value="van">Van</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Make</Label>
          <Input value={form.make} onChange={(e) => set("make", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Model</Label>
          <Input value={form.model} onChange={(e) => set("model", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Year</Label>
          <Input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Fuel Type</Label>
          <Select value={form.fuelType} onChange={(e) => set("fuelType", e.target.value)}>
            <option value="">—</option>
            <option value="diesel">Diesel</option>
            <option value="petrol">Petrol</option>
            <option value="cng">CNG</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Driver Name</Label>
          <Input value={form.driverName} onChange={(e) => set("driverName", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Operator / Machine</Label>
          <Input value={form.operatorName} onChange={(e) => set("operatorName", e.target.value)} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Transport Details</Label>
          <Input value={form.transportDetails} onChange={(e) => set("transportDetails", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Survey No.</Label>
          <Input value={form.surveyNo} onChange={(e) => set("surveyNo", e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Vehicle"}</Button>
      </div>
    </form>
  );
}
