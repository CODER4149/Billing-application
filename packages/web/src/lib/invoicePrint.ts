import { formatCurrency, formatDate, getStatusLabel } from "@/lib/utils";
import { processInvoiceItem, calculateInvoiceTotals } from "@borewell/core/gst";
import { amountInWords, normalizeMoney } from "@borewell/core/amount";

interface PrintInvoiceOptions {
  invoice: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  payments?: Array<Record<string, unknown>>;
  settings?: Record<string, string>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function val(value: unknown, fallback = "—"): string {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function addInfoRow(rows: string[], label: string, value: unknown) {
  rows.push(`<tr><td class="label">${label}</td><td>${escapeHtml(val(value))}</td></tr>`);
}

function formatCompanyPhones(settings: Record<string, string>): string {
  const phones = [
    settings["company.phone"],
    settings["company.phone2"],
    settings["company.phone3"],
    settings["company.phone4"],
  ].filter((p) => p && p.trim());
  return phones.length ? phones.join(" · ") : "—";
}

function formatProprietorLine(settings: Record<string, string>): string {
  const name = settings["company.proprietor"]?.trim() || "—";
  const phones = formatCompanyPhones(settings);
  return `${escapeHtml(name)} &nbsp;|&nbsp; <strong>Ph:</strong> ${escapeHtml(phones)}`;
}

function joinParts(parts: Array<string | undefined | null>, sep = ", "): string {
  return parts.filter(Boolean).join(sep);
}

function formatPartyBlock(invoice: Record<string, unknown>, prefix: "client" | "consignee"): string {
  const name = val(invoice[`${prefix}_name`], "");
  if (!name) return "";
  const address = val(invoice[`${prefix}_billing_address`]) !== "—"
    ? val(invoice[`${prefix}_billing_address`])
    : val(invoice[`${prefix}_address`]);
  const cityLine = joinParts([
    val(invoice[`${prefix}_city`], ""),
    val(invoice[`${prefix}_state`], ""),
    val(invoice[`${prefix}_pincode`], ""),
  ].filter((p) => p && p !== "—"));
  const phones = joinParts([
    val(invoice[`${prefix}_phone`], ""),
    invoice[`${prefix}_secondary_phone`] ? `Alt: ${invoice[`${prefix}_secondary_phone`]}` : "",
    invoice[`${prefix}_alternate_phone`] ? `Alt: ${invoice[`${prefix}_alternate_phone`]}` : "",
    invoice[`${prefix}_office_phone`] ? `Office: ${invoice[`${prefix}_office_phone`]}` : "",
  ].filter(Boolean), " · ");
  const gstin = val(invoice[`${prefix}_gstin`], "");

  return `
    <div class="party-name">${escapeHtml(name)}</div>
    ${address && address !== "—" ? `<div class="party-line">${escapeHtml(address)}</div>` : ""}
    ${cityLine ? `<div class="party-line">${escapeHtml(cityLine)}</div>` : ""}
    ${phones ? `<div class="party-line">Phone: ${escapeHtml(phones)}</div>` : ""}
    ${gstin && gstin !== "—" ? `<div class="party-line">GSTIN: ${escapeHtml(gstin)}</div>` : ""}
  `;
}

function formatSiteBlock(invoice: Record<string, unknown>): string {
  const rows: string[] = [];
  addInfoRow(rows, "Site Code", invoice.site_code);
  addInfoRow(rows, "Site Survey No.", invoice.site_survey_no);

  const address = val(invoice.site_address, "");
  if (address && address !== "—") {
    rows.push(`<tr><td class="label">Site Address</td><td>${escapeHtml(address)}</td></tr>`);
  }
  const optional: Array<[string, string]> = [
    ["Site State", "site_state"],
    ["Site State Code", "site_state_code"],
    ["Site City", "site_city"],
    ["Site District", "site_district"],
    ["Site Taluka", "site_taluka"],
    ["Site Village", "site_village"],
    ["Site Get No.", "site_gat_no"],
  ];
  for (const [label, key] of optional) {
    const v = val(invoice[key], "");
    if (v && v !== "—") addInfoRow(rows, label, v);
  }

  return `<table class="info-table">${rows.join("")}</table>`;
}

function formatVehicleBlock(invoice: Record<string, unknown>): string {
  const vehicleName = val(invoice.vehicle_name, "");
  const reg = val(invoice.vehicle_registration, "");
  const vehicleSurvey = val(invoice.vehicle_survey_no, "");
  const siteSurvey = val(invoice.site_survey_no, "");
  const surveyNo = vehicleSurvey !== "—" ? vehicleSurvey : siteSurvey;

  const driver = val(invoice.driver_name, "") !== "—"
    ? val(invoice.driver_name)
    : val(invoice.vehicle_driver_name, "");
  const operator = val(invoice.operator_name, "") !== "—"
    ? val(invoice.operator_name)
    : val(invoice.vehicle_operator_name, "");
  const transport = val(invoice.transport_details, "") !== "—"
    ? val(invoice.transport_details)
    : val(invoice.vehicle_transport_details, "");

  const rows: string[] = [];
  addInfoRow(rows, "Survey No.", surveyNo);
  if (vehicleName && vehicleName !== "—") addInfoRow(rows, "Vehicle Name", vehicleName);
  if (reg && reg !== "—") addInfoRow(rows, "Registration No.", reg);
  if (invoice.vehicle_type) addInfoRow(rows, "Vehicle Type", invoice.vehicle_type);
  if (driver && driver !== "—") addInfoRow(rows, "Vehicle Driver", driver);
  if (operator && operator !== "—") addInfoRow(rows, "Machine Operator", operator);
  if (transport && transport !== "—") addInfoRow(rows, "Transport Details", transport);

  return `<table class="info-table">${rows.join("")}</table>`;
}

function formatTermsHtml(terms: string): string {
  const lines = terms.split(/\n|\|/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "";
  return `<ol class="terms-list">${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ol>`;
}

export function printInvoice({ invoice, items, payments = [], settings = {} }: PrintInvoiceOptions): void {
  const isInterState = Boolean(invoice.is_inter_state);
  const defaultRates = { cgstRate: 9, sgstRate: 9, igstRate: 18 };

  const processedItems = items.map((item) =>
    processInvoiceItem(
      {
        description: String(item.description ?? ""),
        serviceType: String(item.service_type ?? "other"),
        quantity: Number(item.quantity ?? 0),
        rate: Number(item.rate ?? 0),
        discount: Number(item.discount ?? 0),
        hsnCode: item.hsn_code ? String(item.hsn_code) : undefined,
        cgstRate: Number(item.cgst_rate ?? 9),
        sgstRate: Number(item.sgst_rate ?? 9),
        igstRate: Number(item.igst_rate ?? 18),
      },
      isInterState,
      defaultRates
    )
  );

  const totals = calculateInvoiceTotals(processedItems);
  const grandTotal = normalizeMoney(Number(invoice.grand_total ?? totals.grandTotal));
  const companyName = settings["company.name"] ?? "Bhagyalaxmi Borewell";
  const companyProprietorLine = formatProprietorLine(settings);
  const companyAddress = joinParts([
    settings["company.address"],
    settings["company.city"],
    settings["company.state"],
    settings["company.pincode"],
  ]);
  const companyGstin = settings["company.gstin"] ?? "";
  const companyPan = settings["company.pan"] ?? "";
  const poNo = val(invoice.po_no);
  const siteCode = val(invoice.site_code);
  const siteSurveyNo = val(invoice.site_survey_no);
  const reverseCharges = val(invoice.reverse_charges, "N").toUpperCase() === "Y" ? "Yes" : "No";

  const words = amountInWords(grandTotal);

  const termsRaw = val(invoice.terms_and_conditions ?? invoice.terms, "");
  const receiverName = val(invoice.receiver_name, "");
  const consigneeBlock = formatPartyBlock(invoice, "consignee");
  const showConsignee = consigneeBlock.trim().length > 0
    && val(invoice.consignee_id, "") !== val(invoice.client_id, "");

  const itemRows = processedItems
    .map(
      (item, idx) => `
      <tr>
        <td class="center">${idx + 1}</td>
        <td>${escapeHtml(item.description)}${item.hsnCode ? `<div class="muted">HSN: ${escapeHtml(item.hsnCode)}</div>` : ""}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatCurrency(item.rate)}</td>
        <td class="num">${formatCurrency(item.discount ?? 0)}</td>
        <td class="num">${formatCurrency(item.amount)}</td>
        <td class="num">${formatCurrency(item.taxAmount)}</td>
        <td class="num"><strong>${formatCurrency(item.totalAmount)}</strong></td>
      </tr>`
    )
    .join("");

  const paymentRows = payments.length
    ? payments
        .map(
          (p) => `
        <tr>
          <td>${formatDate(String(p.payment_date))}</td>
          <td>${escapeHtml(String(p.payment_method ?? "").replace(/_/g, " "))}</td>
          <td class="num">${formatCurrency(Number(p.amount))}</td>
          <td>${escapeHtml(String(p.reference_number ?? "—"))}</td>
        </tr>`
        )
        .join("")
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(String(invoice.invoice_number))}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Segoe UI", Arial, sans-serif; color: #1a1a1a; margin: 16mm; font-size: 12px; line-height: 1.45; }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }
    h2 { font-size: 15px; font-weight: 600; color: #334155; margin-bottom: 6px; }
    h3 { font-size: 13px; font-weight: 600; color: #475569; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 0.04em; }
    .header { display: flex; justify-content: space-between; gap: 24px; padding-bottom: 14px; border-bottom: 3px solid #1e40af; margin-bottom: 18px; }
    .company-meta { margin-top: 6px; color: #475569; font-size: 11px; }
    .invoice-meta { text-align: right; min-width: 200px; }
    .invoice-title { font-size: 18px; font-weight: 700; color: #1e40af; letter-spacing: 0.06em; }
    .invoice-no { font-size: 16px; font-weight: 600; margin: 4px 0; }
    .status { display: inline-block; padding: 3px 10px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 600; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .meta-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #fafafa; }
    .box-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1e40af; margin-bottom: 6px; }
    .party-name { font-weight: 600; font-size: 13px; margin-bottom: 2px; }
    .party-line { font-size: 11px; color: #475569; margin-top: 2px; }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table td { padding: 2px 0; vertical-align: top; font-size: 11px; }
    .info-table td.label { width: 38%; color: #64748b; padding-right: 8px; }
    .invoice-details-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #f8fafc; font-size: 11px; }
    .invoice-details-bar .detail-item { min-width: 0; }
    .invoice-details-bar .detail-label { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; }
    .invoice-details-bar .detail-value { color: #0f172a; font-weight: 500; margin-top: 2px; word-break: break-word; }
    .muted { color: #64748b; font-size: 11px; }
    table.items { width: 100%; border-collapse: collapse; margin: 12px 0; }
    table.items th, table.items td { border: 1px solid #cbd5e1; padding: 7px 8px; text-align: left; vertical-align: top; }
    table.items th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; }
    .num { text-align: right; white-space: nowrap; }
    .center { text-align: center; }
    .bottom-row { display: flex; gap: 16px; margin-top: 16px; align-items: flex-start; }
    .totals-wrap { margin-left: auto; width: 300px; flex-shrink: 0; }
    .totals-wrap table { width: 100%; border-collapse: collapse; }
    .totals-wrap td { padding: 4px 0; border: none; }
    .totals-wrap .grand td { border-top: 2px solid #1e293b; padding-top: 8px; font-size: 14px; font-weight: 700; }
    .words-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #f8fafc; }
    .words-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    .words-text { font-style: italic; font-weight: 500; color: #0f172a; }
    .terms-list { margin: 6px 0 0 18px; font-size: 11px; color: #334155; }
    .terms-list li { margin-bottom: 3px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 28px; page-break-inside: avoid; }
    .sig-block { min-height: 90px; }
    .sig-title { font-size: 11px; font-weight: 600; color: #334155; margin-bottom: 36px; }
    .sig-line { border-top: 1px solid #334155; padding-top: 6px; font-size: 11px; color: #475569; }
    .sig-name { font-weight: 600; color: #0f172a; margin-bottom: 4px; min-height: 16px; }
    .stamp-area { margin-top: 12px; text-align: center; }
    .stamp-box { display: inline-block; width: 90px; height: 90px; border: 2px dashed #94a3b8; border-radius: 50%; line-height: 90px; font-size: 10px; color: #94a3b8; font-weight: 600; text-transform: uppercase; }
    .footer-note { margin-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    @media print {
      body { margin: 10mm; }
      @page { margin: 10mm; size: A4; }
      .box, .words-box { background: #fff; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${escapeHtml(companyName)}</h1>
      <div class="company-meta"><strong>Proprietor:</strong> ${companyProprietorLine}</div>
      <div class="company-meta">
        ${companyAddress ? `<div>${escapeHtml(companyAddress)}</div>` : ""}
        ${companyGstin ? `<div>GSTIN: ${escapeHtml(companyGstin)}</div>` : ""}
        ${companyPan ? `<div>PAN: ${escapeHtml(companyPan)}</div>` : ""}
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">TAX INVOICE</div>
      <div class="invoice-no">${escapeHtml(String(invoice.invoice_number))}</div>
      <div class="status">${escapeHtml(getStatusLabel(String(invoice.status)))}</div>
      <div class="company-meta" style="margin-top:8px">
        <div><strong>Date:</strong> ${formatDate(String(invoice.invoice_date))}</div>
        ${invoice.due_date ? `<div><strong>Due:</strong> ${formatDate(String(invoice.due_date))}</div>` : ""}
        <div><strong>P.O. No.:</strong> ${escapeHtml(poNo)}</div>
        <div><strong>Reverse Charges:</strong> ${reverseCharges}</div>
      </div>
    </div>
  </div>

  <div class="invoice-details-bar">
    <div class="detail-item">
      <div class="detail-label">P.O. No.</div>
      <div class="detail-value">${escapeHtml(poNo)}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Reverse Charges</div>
      <div class="detail-value">${reverseCharges}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Site Code</div>
      <div class="detail-value">${escapeHtml(siteCode)}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Survey No.</div>
      <div class="detail-value">${escapeHtml(siteSurveyNo)}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="box">
      <div class="box-title">Bill To</div>
      ${formatPartyBlock(invoice, "client")}
    </div>
    <div class="box">
      <div class="box-title">${showConsignee ? "Consignee (Shipped To)" : "Consignee (Shipped To)"}</div>
      ${showConsignee ? consigneeBlock : `<div class="muted">Same as Bill To</div>`}
    </div>
  </div>

  <div class="meta-grid-3">
    <div class="box">
      <div class="box-title">Vehicle Details</div>
      ${formatVehicleBlock(invoice)}
    </div>
    <div class="box" style="grid-column: span 2">
      <div class="box-title">Site & Location</div>
      ${formatSiteBlock(invoice)}
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th class="center">#</th>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Rate</th>
        <th class="num">Discount</th>
        <th class="num">Amt Before Tax</th>
        <th class="num">Tax</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="bottom-row">
    <div class="words-box">
      <div class="words-label">Amount in Words</div>
      <div class="words-text">${escapeHtml(words)}</div>
    </div>
    <div class="totals-wrap">
      <table>
        <tr><td>Subtotal</td><td class="num">${formatCurrency(totals.subtotal)}</td></tr>
        ${
          isInterState
            ? `<tr><td>IGST</td><td class="num">${formatCurrency(totals.igstTotal)}</td></tr>`
            : `<tr><td>CGST</td><td class="num">${formatCurrency(totals.cgstTotal)}</td></tr>
               <tr><td>SGST</td><td class="num">${formatCurrency(totals.sgstTotal)}</td></tr>`
        }
        <tr class="grand"><td>Grand Total</td><td class="num">${formatCurrency(grandTotal)}</td></tr>
        <tr><td>Paid</td><td class="num">${formatCurrency(Number(invoice.paid_amount ?? 0))}</td></tr>
        <tr><td>Pending</td><td class="num">${formatCurrency(Number(invoice.pending_amount ?? 0))}</td></tr>
      </table>
    </div>
  </div>

  ${termsRaw && termsRaw !== "—" ? `
  <h3>Terms & Conditions</h3>
  ${formatTermsHtml(termsRaw)}
  ` : ""}

  ${invoice.notes ? `<div style="margin-top:14px"><strong>Notes:</strong> <span class="muted">${escapeHtml(String(invoice.notes))}</span></div>` : ""}

  ${paymentRows ? `
  <h3>Payment History</h3>
  <table class="items">
    <thead><tr><th>Date</th><th>Method</th><th class="num">Amount</th><th>Reference</th></tr></thead>
    <tbody>${paymentRows}</tbody>
  </table>` : ""}

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-title">Goods Received By</div>
      ${receiverName && receiverName !== "—" ? `<div class="sig-name">${escapeHtml(receiverName)}</div>` : "<div class=\"sig-name\">&nbsp;</div>"}
      <div class="sig-line">Signature of Receiver</div>
      <div style="margin-top:10px;font-size:11px;color:#475569">Date: ___________________</div>
    </div>
    <div class="sig-block">
      <div class="sig-title">Authorized Signatory</div>
      <div class="sig-line">For ${escapeHtml(companyName)}</div>
      <div class="stamp-area">
        <div class="stamp-box">Stamp</div>
      </div>
    </div>
  </div>

  <div class="footer-note">This is a computer-generated invoice. Authorized signature and company stamp required for validity.</div>

  <script>
    window.onload = function() {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Invoice print preview");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "none",
  });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("Unable to open print preview");
  }
  doc.open();
  doc.write(html.replace(/<script[\s\S]*?<\/script>/, ""));
  doc.close();
  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();
  window.setTimeout(() => document.body.removeChild(iframe), 1000);
}
