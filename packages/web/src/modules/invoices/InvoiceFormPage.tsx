import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, FileText, Send } from "lucide-react";
import { toast } from "sonner";
import { amountInWords, normalizeMoney } from "@borewell/core/amount";
import { PageHeader } from "@/components/crud/PageHeader";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Card, CardContent, CardHeader, CardTitle, Select } from "@/components/ui/input";
import { LineItemsManager, useLineItemsTotals } from "@/components/invoice/LineItemsManager";
import { lineItemFromRecord, lineItemToPayload, type LineItemRow } from "@/components/invoice/lineItemTypes";
import { api } from "@/services/api";
import { useAuthStore } from "@/store";
import { StatusPill } from "@/components/crud/StatusPill";
import { formatCurrency } from "@/lib/utils";
import { DEFAULT_INVOICE_TERMS } from "@/lib/constants";

type ClientRecord = Record<string, unknown> & { id: string; name: string };
type VehicleRecord = Record<string, unknown> & { id: string; name: string; registration_number: string };

export function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [clientId, setClientId] = useState("");
  const [consigneeId, setConsigneeId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [transportDetails, setTransportDetails] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [siteState, setSiteState] = useState("");
  const [siteStateCode, setSiteStateCode] = useState("");
  const [siteCity, setSiteCity] = useState("");
  const [siteDistrict, setSiteDistrict] = useState("");
  const [siteTaluka, setSiteTaluka] = useState("");
  const [siteVillage, setSiteVillage] = useState("");
  const [siteSurveyNo, setSiteSurveyNo] = useState("");
  const [siteGatNo, setSiteGatNo] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [reverseCharges, setReverseCharges] = useState("N");
  const [poNo, setPoNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [isInterState, setIsInterState] = useState(false);
  const [notes, setNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [status, setStatus] = useState("draft");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [items, setItems] = useState<LineItemRow[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const totals = useLineItemsTotals(items, isInterState);
  const wordsPreview = useMemo(
    () => amountInWords(normalizeMoney(totals.grandTotal)),
    [totals.grandTotal]
  );

  const applyClientSite = (client: ClientRecord) => {
    setSiteState(String(client.site_state ?? client.state ?? ""));
    setSiteStateCode(String(client.state_code ?? ""));
    setSiteCity(String(client.site_city ?? client.city ?? ""));
    setSiteDistrict(String(client.site_district ?? client.district ?? ""));
    setSiteTaluka(String(client.site_taluka ?? client.taluka ?? ""));
    setSiteVillage(String(client.site_village ?? client.village ?? ""));
    setSiteSurveyNo(String(client.site_survey_no ?? client.survey_no ?? ""));
    setSiteGatNo(String(client.site_gat_no ?? client.gat_no ?? ""));
    setSiteCode(String(client.site_code ?? ""));
    setSiteAddress(String(client.site_address ?? client.siteAddress ?? ""));
  };

  const load = useCallback(async () => {
    const [clientList, vehicleList, settings] = await Promise.all([
      api.clients.list(),
      api.vehicles.list(),
      api.settings.getAll(),
    ]);
    setClients(clientList as ClientRecord[]);
    setVehicles(vehicleList as VehicleRecord[]);
    if (!isEdit && settings["invoice.default_terms"]) {
      setTermsAndConditions(settings["invoice.default_terms"].replace(/\|/g, "\n"));
    } else if (!isEdit) {
      setTermsAndConditions(DEFAULT_INVOICE_TERMS);
    }

    if (isEdit && id) {
      setLoading(true);
      const { invoice, items: dbItems } = await api.invoices.get(id);
      setClientId(String(invoice.client_id));
      setConsigneeId(invoice.consignee_id ? String(invoice.consignee_id) : "");
      setVehicleId(invoice.vehicle_id ? String(invoice.vehicle_id) : "");
      setDriverName(String(invoice.driver_name ?? ""));
      setOperatorName(String(invoice.operator_name ?? ""));
      setTransportDetails(String(invoice.transport_details ?? ""));
      setReceiverName(String(invoice.receiver_name ?? ""));
      setSiteState(String(invoice.site_state ?? ""));
      setSiteStateCode(String(invoice.site_state_code ?? ""));
      setSiteCity(String(invoice.site_city ?? ""));
      setSiteDistrict(String(invoice.site_district ?? ""));
      setSiteTaluka(String(invoice.site_taluka ?? ""));
      setSiteVillage(String(invoice.site_village ?? ""));
      setSiteSurveyNo(String(invoice.site_survey_no ?? ""));
      setSiteGatNo(String(invoice.site_gat_no ?? ""));
      setSiteCode(String(invoice.site_code ?? ""));
      setSiteAddress(String(invoice.site_address ?? ""));
      setReverseCharges(String(invoice.reverse_charges ?? "N").toUpperCase() === "Y" ? "Y" : "N");
      setPoNo(String(invoice.po_no ?? ""));
      setInvoiceDate(String(invoice.invoice_date));
      setDueDate(invoice.due_date ? String(invoice.due_date) : "");
      setIsInterState(Boolean(invoice.is_inter_state));
      setNotes(invoice.notes ? String(invoice.notes) : "");
      setTermsAndConditions(String(invoice.terms_and_conditions ?? invoice.terms ?? ""));
      setStatus(String(invoice.status));
      setInvoiceNumber(String(invoice.invoice_number));
      setItems(dbItems.map((i) => lineItemFromRecord(i)));
      setLoading(false);
    }
  }, [id, isEdit]);

  useEffect(() => { load(); }, [load]);

  const onClientChange = (cid: string) => {
    setClientId(cid);
    const client = clients.find((c) => c.id === cid);
    if (client) applyClientSite(client);
  };

  const onVehicleChange = (vid: string) => {
    setVehicleId(vid);
    const vehicle = vehicles.find((v) => v.id === vid);
    if (vehicle) {
      setDriverName(String(vehicle.driver_name ?? ""));
      setOperatorName(String(vehicle.operator_name ?? ""));
      setTransportDetails(String(vehicle.transport_details ?? ""));
    }
  };

  const buildPayload = () => ({
    clientId,
    consigneeId: consigneeId || undefined,
    vehicleId: vehicleId || undefined,
    driverName: driverName || undefined,
    operatorName: operatorName || undefined,
    transportDetails: transportDetails || undefined,
    receiverName: receiverName || undefined,
    siteState: siteState || undefined,
    siteStateCode: siteStateCode || undefined,
    siteCity: siteCity || undefined,
    siteDistrict: siteDistrict || undefined,
    siteTaluka: siteTaluka || undefined,
    siteVillage: siteVillage || undefined,
    siteSurveyNo: siteSurveyNo || undefined,
    siteGatNo: siteGatNo || undefined,
    siteCode: siteCode || undefined,
    siteAddress: siteAddress || undefined,
    reverseCharges,
    poNo: poNo || undefined,
    invoiceDate,
    dueDate: dueDate || undefined,
    isInterState,
    notes: notes || undefined,
    termsAndConditions: termsAndConditions || undefined,
    status,
    items: items.map(lineItemToPayload),
  });

  const handleSave = async (publish = false) => {
    if (!clientId) { toast.error("Select a bill-to client"); return; }
    if (!items.length) { toast.error("Add at least one line item"); return; }

    setSaving(true);
    try {
      const payload = { ...buildPayload(), status: publish ? "invoice_generated" : status };
      if (isEdit && id) {
        const result = await api.invoices.update(id, payload, user?.id);
        if (!result.success) throw new Error(result.error ?? "Update failed");
        toast.success(publish ? "Invoice published" : "Invoice saved");
        navigate(`/invoices/${id}`);
      } else {
        const result = await api.invoices.create({ ...payload, status: publish ? "invoice_generated" : "draft" }, user?.id);
        if (!result.success || !result.id) throw new Error(result.error ?? "Create failed");
        toast.success(publish ? "Invoice created & published" : "Draft invoice saved");
        navigate(`/invoices/${result.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-10 w-48 bg-[var(--color-muted)] rounded-xl" /><div className="h-96 bg-[var(--color-muted)] rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={isEdit ? `Edit ${invoiceNumber}` : "New Invoice"}
        description="Bill To, consignee, vehicle, site details & line items"
        breadcrumbs={[{ label: "Invoices", href: "/invoices" }, { label: isEdit ? invoiceNumber : "New" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(isEdit ? `/invoices/${id}` : "/invoices")}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}><Save className="h-4 w-4" /> Save Draft</Button>
            <Button onClick={() => handleSave(true)} disabled={saving}><Send className="h-4 w-4" /> {saving ? "Saving..." : "Save & Publish"}</Button>
          </div>
        }
      />

      {isEdit && (
        <div className="flex items-center gap-3">
          <StatusPill status={status} />
          <span className="text-xs text-[var(--color-muted-foreground)] flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" /> Grand total: {formatCurrency(totals.grandTotal)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Bill To & Consignee</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Bill To (Client) *</Label>
              <Select value={clientId} onChange={(e) => onClientChange(e.target.value)} required>
                <option value="">Select client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Consignee (Shipped To)</Label>
              <Select value={consigneeId} onChange={(e) => setConsigneeId(e.target.value)}>
                <option value="">Same as Bill To</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2"><Label>Invoice Date *</Label><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>P.O. No.</Label><Input value={poNo} onChange={(e) => setPoNo(e.target.value)} placeholder="Purchase order number" /></div>
            <div className="space-y-2"><Label>Reverse Charges</Label>
              <Select value={reverseCharges} onChange={(e) => setReverseCharges(e.target.value)}>
                <option value="N">No</option>
                <option value="Y">Yes</option>
              </Select>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2 pt-1">
              <input id="interState" type="checkbox" checked={isInterState} onChange={(e) => setIsInterState(e.target.checked)} className="h-4 w-4 rounded" />
              <Label htmlFor="interState">Inter-state supply (IGST)</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Vehicle & Transport</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Select Vehicle</Label>
              <Select value={vehicleId} onChange={(e) => onVehicleChange(e.target.value)}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.registration_number} — {v.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2"><Label>Vehicle Driver</Label><Input value={driverName} onChange={(e) => setDriverName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Machine Operator</Label><Input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Transport Route / Details</Label><Input value={transportDetails} onChange={(e) => setTransportDetails(e.target.value)} placeholder="Route, load details..." /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Site & Location Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Site Address</Label><Textarea value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-2"><Label>Site State</Label><Input value={siteState} onChange={(e) => setSiteState(e.target.value)} /></div>
            <div className="space-y-2"><Label>Site State Code</Label><Input value={siteStateCode} onChange={(e) => setSiteStateCode(e.target.value)} /></div>
            <div className="space-y-2"><Label>Site City</Label><Input value={siteCity} onChange={(e) => setSiteCity(e.target.value)} /></div>
            <div className="space-y-2"><Label>Site District</Label><Input value={siteDistrict} onChange={(e) => setSiteDistrict(e.target.value)} /></div>
            <div className="space-y-2"><Label>Site Taluka</Label><Input value={siteTaluka} onChange={(e) => setSiteTaluka(e.target.value)} /></div>
            <div className="space-y-2"><Label>Site Village</Label><Input value={siteVillage} onChange={(e) => setSiteVillage(e.target.value)} /></div>
            <div className="space-y-2"><Label>Site Survey No.</Label><Input value={siteSurveyNo} onChange={(e) => setSiteSurveyNo(e.target.value)} /></div>
            <div className="space-y-2"><Label>Site Get No.</Label><Input value={siteGatNo} onChange={(e) => setSiteGatNo(e.target.value)} /></div>
            <div className="space-y-2"><Label>Site Code</Label><Input value={siteCode} onChange={(e) => setSiteCode(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <LineItemsManager items={items} onChange={setItems} isInterState={isInterState} />

      <Card>
        <CardHeader><CardTitle>Final Amount & Terms</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl bg-[var(--color-accent)]/30 p-4 text-sm">
            <Label className="text-[var(--color-muted-foreground)] uppercase text-xs tracking-wide">Grand Total in Words</Label>
            <p className="mt-2 font-medium italic">{wordsPreview || "—"}</p>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1">Auto-calculated: {formatCurrency(totals.grandTotal)}</p>
          </div>
          <div className="space-y-2">
            <Label>Invoice Terms & Conditions</Label>
            <Textarea value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} rows={5} placeholder="One term per line..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Goods Receiver Name</Label><Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Printed on invoice signature block" /></div>
            <div className="space-y-2"><Label>Internal Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Not shown on printed invoice" /></div>
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur px-4 py-3 md:hidden">
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => handleSave(false)} disabled={saving}>Save Draft</Button>
          <Button className="flex-1" onClick={() => handleSave(true)} disabled={saving}>Publish</Button>
        </div>
      </div>
    </div>
  );
}
