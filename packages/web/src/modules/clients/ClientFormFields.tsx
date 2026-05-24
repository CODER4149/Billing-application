import { useEffect, useState } from "react";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ClientFormFieldsProps {
  client?: Record<string, unknown> | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-[var(--color-primary)] border-b border-[var(--color-border)] pb-2 mb-3">{children}</h3>;
}

export function ClientFormFields({ client, onSave, onCancel }: ClientFormFieldsProps) {
  const [form, setForm] = useState({
    name: "", companyName: "", phone: "", secondaryPhone: "", alternatePhone: "", officePhone: "",
    email: "", billingAddress: "", city: "", state: "", stateCode: "", pincode: "",
    district: "", taluka: "", village: "", surveyNo: "", gatNo: "", siteCode: "",
    siteAddress: "", siteCity: "", siteState: "", siteDistrict: "", siteTaluka: "",
    siteVillage: "", siteSurveyNo: "", siteGatNo: "", gstin: "", pan: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (client) {
      setForm({
        name: String(client.name ?? ""),
        companyName: String(client.company_name ?? ""),
        phone: String(client.phone ?? ""),
        secondaryPhone: String(client.secondary_phone ?? ""),
        alternatePhone: String(client.alternate_phone ?? ""),
        officePhone: String(client.office_phone ?? ""),
        email: String(client.email ?? ""),
        billingAddress: String(client.billing_address ?? client.address ?? ""),
        city: String(client.city ?? ""),
        state: String(client.state ?? ""),
        stateCode: String(client.state_code ?? ""),
        pincode: String(client.pincode ?? ""),
        district: String(client.district ?? ""),
        taluka: String(client.taluka ?? ""),
        village: String(client.village ?? ""),
        surveyNo: String(client.survey_no ?? ""),
        gatNo: String(client.gat_no ?? ""),
        siteCode: String(client.site_code ?? ""),
        siteAddress: String(client.site_address ?? ""),
        siteCity: String(client.site_city ?? ""),
        siteState: String(client.site_state ?? ""),
        siteDistrict: String(client.site_district ?? ""),
        siteTaluka: String(client.site_taluka ?? ""),
        siteVillage: String(client.site_village ?? ""),
        siteSurveyNo: String(client.site_survey_no ?? ""),
        siteGatNo: String(client.site_gat_no ?? ""),
        gstin: String(client.gstin ?? ""),
        pan: String(client.pan ?? ""),
        notes: String(client.notes ?? ""),
      });
    }
  }, [client]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Name and primary phone are required");
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, address: form.billingAddress });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
      {error && (
        <div className="rounded-lg bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]">{error}</div>
      )}

      <div>
        <SectionTitle>Basic Information</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} required /></div>
          <div className="space-y-2"><Label>Company</Label><Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} /></div>
          <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
          <div className="space-y-2"><Label>GSTIN</Label><Input value={form.gstin} onChange={(e) => set("gstin", e.target.value)} /></div>
          <div className="space-y-2"><Label>PAN</Label><Input value={form.pan} onChange={(e) => set("pan", e.target.value)} /></div>
        </div>
      </div>

      <div>
        <SectionTitle>Contact Numbers</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Primary Mobile *</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} required /></div>
          <div className="space-y-2"><Label>Secondary Mobile</Label><Input value={form.secondaryPhone} onChange={(e) => set("secondaryPhone", e.target.value)} /></div>
          <div className="space-y-2"><Label>Alternate Mobile</Label><Input value={form.alternatePhone} onChange={(e) => set("alternatePhone", e.target.value)} /></div>
          <div className="space-y-2"><Label>Office Number</Label><Input value={form.officePhone} onChange={(e) => set("officePhone", e.target.value)} /></div>
        </div>
      </div>

      <div>
        <SectionTitle>Billing Address</SectionTitle>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Address</Label><Textarea value={form.billingAddress} onChange={(e) => set("billingAddress", e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-2"><Label>City</Label><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
            <div className="space-y-2"><Label>State</Label><Input value={form.state} onChange={(e) => set("state", e.target.value)} /></div>
            <div className="space-y-2"><Label>State Code</Label><Input value={form.stateCode} onChange={(e) => set("stateCode", e.target.value)} placeholder="e.g. 27" /></div>
            <div className="space-y-2"><Label>Pincode</Label><Input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} /></div>
            <div className="space-y-2"><Label>District</Label><Input value={form.district} onChange={(e) => set("district", e.target.value)} /></div>
            <div className="space-y-2"><Label>Taluka</Label><Input value={form.taluka} onChange={(e) => set("taluka", e.target.value)} /></div>
            <div className="space-y-2"><Label>Village</Label><Input value={form.village} onChange={(e) => set("village", e.target.value)} /></div>
            <div className="space-y-2"><Label>Survey No.</Label><Input value={form.surveyNo} onChange={(e) => set("surveyNo", e.target.value)} /></div>
            <div className="space-y-2"><Label>Get No.</Label><Input value={form.gatNo} onChange={(e) => set("gatNo", e.target.value)} /></div>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle>Site / Work Location</SectionTitle>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Site Code</Label><Input value={form.siteCode} onChange={(e) => set("siteCode", e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Site Address</Label><Textarea value={form.siteAddress} onChange={(e) => set("siteAddress", e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-2"><Label>Site City</Label><Input value={form.siteCity} onChange={(e) => set("siteCity", e.target.value)} /></div>
            <div className="space-y-2"><Label>Site State</Label><Input value={form.siteState} onChange={(e) => set("siteState", e.target.value)} /></div>
            <div className="space-y-2"><Label>Site District</Label><Input value={form.siteDistrict} onChange={(e) => set("siteDistrict", e.target.value)} /></div>
            <div className="space-y-2"><Label>Site Taluka</Label><Input value={form.siteTaluka} onChange={(e) => set("siteTaluka", e.target.value)} /></div>
            <div className="space-y-2"><Label>Site Village</Label><Input value={form.siteVillage} onChange={(e) => set("siteVillage", e.target.value)} /></div>
            <div className="space-y-2"><Label>Site Survey No.</Label><Input value={form.siteSurveyNo} onChange={(e) => set("siteSurveyNo", e.target.value)} /></div>
            <div className="space-y-2"><Label>Site Get No.</Label><Input value={form.siteGatNo} onChange={(e) => set("siteGatNo", e.target.value)} /></div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-[var(--color-card)]">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Client"}</Button>
      </div>
    </form>
  );
}
