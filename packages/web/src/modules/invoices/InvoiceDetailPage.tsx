import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Printer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crud/PageHeader";
import { StatusPill } from "@/components/crud/StatusPill";
import { DetailRows } from "@/components/crud/DetailRows";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/input";
import { LineItemsManager } from "@/components/invoice/LineItemsManager";
import { lineItemFromRecord } from "@/components/invoice/lineItemTypes";
import { api } from "@/services/api";
import { formatCurrency, formatDate, getStatusLabel } from "@/lib/utils";
import { amountInWords, normalizeMoney } from "@borewell/core/amount";
import { printInvoice } from "@/lib/invoicePrint";
import { INVOICE_STATUSES } from "@/lib/constants";
import { useAuthStore } from "@/store";

function val(v: unknown, fallback = "—"): string {
  if (v === undefined || v === null || v === "") return fallback;
  return String(v);
}

function siteRows(invoice: Record<string, unknown>): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  const add = (label: string, key: string) => {
    const v = val(invoice[key], "");
    if (v && v !== "—") rows.push([label, v]);
  };
  add("Site Address", "site_address");
  add("Site State", "site_state");
  add("Site State Code", "site_state_code");
  add("Site City", "site_city");
  add("Site District", "site_district");
  add("Site Taluka", "site_taluka");
  add("Site Village", "site_village");
  add("Site Survey No.", "site_survey_no");
  add("Site Get No.", "site_gat_no");
  add("Site Code", "site_code");
  return rows;
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [data, setData] = useState<{
    invoice: Record<string, unknown>;
    items: Array<Record<string, unknown>>;
    payments: Array<Record<string, unknown>>;
  } | null>(null);
  const [printing, setPrinting] = useState(false);

  const load = async () => {
    if (!id) return;
    const result = await api.invoices.get(id);
    setData(result);
  };

  useEffect(() => { load(); }, [id]);

  if (!data) return <div className="animate-pulse h-96 glass rounded-xl" />;

  const { invoice, items, payments } = data;
  const lineItems = items.map(lineItemFromRecord);
  const isInterState = Boolean(invoice.is_inter_state);

  const driver = val(invoice.driver_name, "") !== "—" ? val(invoice.driver_name) : val(invoice.vehicle_driver_name);
  const operator = val(invoice.operator_name, "") !== "—" ? val(invoice.operator_name) : val(invoice.vehicle_operator_name);
  const transport = val(invoice.transport_details, "") !== "—" ? val(invoice.transport_details) : val(invoice.vehicle_transport_details);
  const hasVehicle = Boolean(invoice.vehicle_id || invoice.vehicle_name);
  const hasConsignee = Boolean(invoice.consignee_id) && invoice.consignee_id !== invoice.client_id;
  const siteDetailRows = siteRows(invoice);
  const terms = val(invoice.terms_and_conditions ?? invoice.terms, "");
  const grandTotal = normalizeMoney(Number(invoice.grand_total));
  const amountWords = amountInWords(grandTotal);

  const handleStatusChange = async (status: string) => {
    await api.invoices.updateStatus(id!, status, user?.id);
    toast.success(`Status updated to ${getStatusLabel(status)}`);
    load();
  };

  const handlePrint = async () => {
    if (!data) return;
    setPrinting(true);
    try {
      const settings = await api.settings.getAll();
      printInvoice({
        invoice: data.invoice,
        items: data.items,
        payments: data.payments,
        settings,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open print dialog");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={String(invoice.invoice_number)}
        description={String(invoice.client_name)}
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: String(invoice.invoice_number) },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/invoices")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/invoices/${id}/edit`)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={printing}>
              <Printer className="h-4 w-4" /> {printing ? "Preparing..." : "Print / PDF"}
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusPill status={String(invoice.status)} />
        <span className="text-xs text-[var(--color-muted-foreground)]">
          Created {invoice.created_at ? formatDate(String(invoice.created_at)) : formatDate(String(invoice.invoice_date))}
          {invoice.updated_at ? ` · Updated ${formatDate(String(invoice.updated_at))}` : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Bill To</CardTitle></CardHeader>
          <CardContent>
            <DetailRows rows={[
              ["Name", val(invoice.client_name)],
              ["Phone", val(invoice.client_phone)],
              ["GSTIN", val(invoice.client_gstin)],
              ["Address", val(invoice.client_billing_address) !== "—" ? val(invoice.client_billing_address) : val(invoice.client_address)],
              ["City / State", [val(invoice.client_city), val(invoice.client_state)].filter((p) => p !== "—").join(", ") || "—"],
            ]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Consignee (Shipped To)</CardTitle></CardHeader>
          <CardContent>
            {hasConsignee ? (
              <DetailRows rows={[
                ["Name", val(invoice.consignee_name)],
                ["Phone", val(invoice.consignee_phone)],
                ["GSTIN", val(invoice.consignee_gstin)],
                ["Address", val(invoice.consignee_billing_address) !== "—" ? val(invoice.consignee_billing_address) : val(invoice.consignee_address)],
                ["City / State", [val(invoice.consignee_city), val(invoice.consignee_state)].filter((p) => p !== "—").join(", ") || "—"],
              ]} />
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">Same as Bill To</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Vehicle & Transport</CardTitle></CardHeader>
          <CardContent>
            {hasVehicle ? (
              <DetailRows rows={[
                ["Vehicle Name", val(invoice.vehicle_name)],
                ["Registration No.", val(invoice.vehicle_registration)],
                ["Vehicle Survey No.", val(invoice.vehicle_survey_no)],
                ["Vehicle Type", val(invoice.vehicle_type)],
                ["Vehicle Driver", driver],
                ["Machine Operator", operator],
                ["Transport Details", transport],
              ]} />
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">No vehicle attached</p>
            )}
          </CardContent>
        </Card>
      </div>

      {siteDetailRows.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Site & Location</CardTitle></CardHeader>
          <CardContent>
            <DetailRows rows={siteDetailRows} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <LineItemsManager
            items={lineItems}
            onChange={() => {}}
            isInterState={isInterState}
            readOnly
          />

          {terms && terms !== "—" && (
            <Card>
              <CardHeader><CardTitle>Terms & Conditions</CardTitle></CardHeader>
              <CardContent>
                <ul className="list-decimal list-inside text-sm space-y-1 text-[var(--color-muted-foreground)]">
                  {terms.split(/\n|\|/).map((line) => line.trim()).filter(Boolean).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--color-muted-foreground)]">Date</span><span>{formatDate(String(invoice.invoice_date))}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-muted-foreground)]">Due</span><span>{invoice.due_date ? formatDate(String(invoice.due_date)) : "—"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-muted-foreground)]">P.O. No.</span><span>{val(invoice.po_no)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-muted-foreground)]">Reverse Charges</span><span>{String(invoice.reverse_charges ?? "N").toUpperCase() === "Y" ? "Yes" : "No"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-muted-foreground)]">Paid</span><span className="text-[var(--color-success)]">{formatCurrency(Number(invoice.paid_amount))}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-muted-foreground)]">Pending</span><span className="text-[var(--color-warning)]">{formatCurrency(Number(invoice.pending_amount))}</span></div>
              <div className="flex justify-between font-bold pt-2 border-t border-[var(--color-border)]">
                <span>Grand Total</span><span>{formatCurrency(grandTotal)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Grand Total in Words</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm italic font-medium">{amountWords || "—"}</p>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-1">{formatCurrency(grandTotal)}</p>
            </CardContent>
          </Card>

          {val(invoice.receiver_name, "") !== "—" && (
            <Card>
              <CardHeader><CardTitle>Goods Receiver</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm">{val(invoice.receiver_name)}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Change Status</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {INVOICE_STATUSES.map((s) => (
                <button
                  key={s.code}
                  onClick={() => handleStatusChange(s.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all hover:scale-105 ${invoice.status === s.code ? "ring-2 ring-offset-1 ring-[var(--color-primary)]" : ""}`}
                  style={{ backgroundColor: `${s.color}25`, color: s.color }}
                >
                  {s.label}
                </button>
              ))}
            </CardContent>
          </Card>

          {payments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {payments.map((p) => (
                  <div key={String(p.id)} className="flex justify-between text-sm border-b border-[var(--color-border)] pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{formatCurrency(Number(p.amount))}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)] capitalize">{String(p.payment_method)}</p>
                    </div>
                    <span className="text-xs">{formatDate(String(p.payment_date))}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
