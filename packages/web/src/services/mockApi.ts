import type { ApiClient } from "./api";
import { amountInWords, normalizeMoney } from "@borewell/core/amount";

interface MockClient {
  id: string;
  name: string;
  company_name?: string;
  phone: string;
  secondary_phone?: string;
  alternate_phone?: string;
  office_phone?: string;
  email?: string;
  billing_address?: string;
  address?: string;
  city?: string;
  state?: string;
  state_code?: string;
  pincode?: string;
  district?: string;
  taluka?: string;
  village?: string;
  survey_no?: string;
  gat_no?: string;
  site_code?: string;
  site_address?: string;
  site_city?: string;
  site_state?: string;
  site_district?: string;
  site_taluka?: string;
  site_village?: string;
  site_survey_no?: string;
  site_gat_no?: string;
  gstin?: string;
  pan?: string;
  notes?: string;
  invoice_count: number;
}

interface MockInvoiceItem {
  description: string;
  serviceType: string;
  quantity: number;
  rate: number;
  discount?: number;
}

interface MockInvoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name: string;
  consignee_id?: string;
  consignee_name?: string;
  consignee_phone?: string;
  consignee_gstin?: string;
  consignee_billing_address?: string;
  consignee_address?: string;
  consignee_city?: string;
  consignee_state?: string;
  vehicle_id?: string;
  vehicle_name?: string;
  vehicle_registration?: string;
  vehicle_type?: string;
  vehicle_driver_name?: string;
  vehicle_operator_name?: string;
  vehicle_transport_details?: string;
  vehicle_survey_no?: string;
  reverse_charges?: string;
  po_no?: string;
  driver_name?: string;
  operator_name?: string;
  transport_details?: string;
  receiver_name?: string;
  amount_in_words?: string;
  terms_and_conditions?: string;
  site_state?: string;
  site_state_code?: string;
  site_city?: string;
  site_district?: string;
  site_taluka?: string;
  site_village?: string;
  site_survey_no?: string;
  site_gat_no?: string;
  site_code?: string;
  site_address?: string;
  client_phone?: string;
  client_gstin?: string;
  client_billing_address?: string;
  client_address?: string;
  client_city?: string;
  client_state?: string;
  status: string;
  invoice_date: string;
  due_date?: string;
  subtotal: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  tax_total: number;
  grand_total: number;
  paid_amount: number;
  pending_amount: number;
  is_inter_state: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  items: Array<Record<string, unknown>>;
}

const mockClients: MockClient[] = [
  {
    id: "mock-1",
    name: "Rajesh Kumar",
    company_name: "Kumar Farms",
    phone: "9876543210",
    email: "rajesh@kumarfarms.com",
    city: "Pune",
    gstin: "27AAAAA0000A1Z5",
    invoice_count: 0,
  },
];

const mockInvoices: MockInvoice[] = [];
let mockInvoiceSeq = 1001;

interface MockPayment {
  id: string;
  invoice_id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

interface MockVehicle {
  id: string;
  name: string;
  registration_number: string;
  vehicle_type: string;
  make?: string;
  model?: string;
  year?: number;
  status: string;
  fuel_type?: string;
  driver_name?: string;
  operator_name?: string;
  transport_details?: string;
  survey_no?: string;
  notes?: string;
  created_at: string;
}

interface MockExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  vehicle_id?: string;
  vehicle_name?: string;
  receipt_number?: string;
  notes?: string;
  created_at: string;
}

interface MockBorewellJob {
  id: string;
  job_number: string;
  client_id: string;
  client_name: string;
  site_address: string;
  start_date?: string;
  end_date?: string;
  status: string;
  total_depth: number;
  water_found_at?: number;
  water_success: boolean;
  drilling_cost: number;
  casing_depth?: number;
  pump_type?: string;
  notes?: string;
  created_at: string;
}

interface MockUser {
  id: string;
  username: string;
  email?: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login_at?: string;
}

const mockPayments: MockPayment[] = [];
const mockVehicles: MockVehicle[] = [];
const mockExpenses: MockExpense[] = [];
const mockBorewellJobs: MockBorewellJob[] = [];
const mockUsers: MockUser[] = [
  { id: "1", username: "admin", email: "admin@borewellerp.com", full_name: "System Administrator", role: "admin", is_active: true },
];
let mockJobSeq = 1001;

const mockSettings: Record<string, string> = {
  "company.name": "Bhagyalaxmi Borewell",
  "company.proprietor": "",
  "company.address": "Pune, Maharashtra",
  "company.city": "",
  "company.state": "",
  "company.pincode": "",
  "company.phone": "",
  "company.phone2": "",
  "company.phone3": "",
  "company.phone4": "",
  "company.email": "",
  "company.gstin": "",
  "invoice.prefix": "INV",
  "invoice.next_number": String(mockInvoiceSeq),
  "invoice.due_days": "30",
  "invoice.default_terms": "Subject to Pune Jurisdiction.|GST is additional as per valuation and registration.|All above information are true and correct.",
  "gst.default_cgst": "9",
  "gst.default_sgst": "9",
  "gst.default_igst": "18",
  "backup.auto_enabled": "true",
  "backup.schedule": "daily",
  "backup.retention_days": "30",
  "theme.mode": "system",
};

function syncMockInvoicePayments(invoiceId: string) {
  const inv = mockInvoices.find((i) => i.id === invoiceId);
  if (!inv) return;
  const paid = mockPayments.filter((p) => p.invoice_id === invoiceId).reduce((s, p) => s + p.amount, 0);
  inv.paid_amount = round2(paid);
  inv.pending_amount = round2(Math.max(0, inv.grand_total - paid));
  if (inv.pending_amount <= 0) inv.status = "paid";
  else if (paid > 0) inv.status = "partially_paid";
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function strOrUndef(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function clientSnapshot(c: MockClient) {
  return {
    client_phone: c.phone,
    client_gstin: c.gstin,
    client_billing_address: c.billing_address ?? c.address,
    client_address: c.address ?? c.billing_address,
    client_city: c.city,
    client_state: c.state,
    client_secondary_phone: c.secondary_phone,
    client_alternate_phone: c.alternate_phone,
    client_office_phone: c.office_phone,
  };
}

function consigneeSnapshot(c: MockClient) {
  return {
    consignee_name: c.name,
    consignee_phone: c.phone,
    consignee_gstin: c.gstin,
    consignee_billing_address: c.billing_address ?? c.address,
    consignee_address: c.address ?? c.billing_address,
    consignee_city: c.city,
    consignee_state: c.state,
  };
}

function vehicleSnapshot(v: MockVehicle) {
  return {
    vehicle_name: v.name,
    vehicle_registration: v.registration_number,
    vehicle_type: v.vehicle_type,
    vehicle_driver_name: v.driver_name,
    vehicle_operator_name: v.operator_name,
    vehicle_transport_details: v.transport_details,
    vehicle_survey_no: v.survey_no,
  };
}

function invoiceExtrasFromData(data: Record<string, unknown>, grandTotal: number) {
  return {
    consignee_id: strOrUndef(data.consigneeId),
    vehicle_id: strOrUndef(data.vehicleId),
    driver_name: strOrUndef(data.driverName),
    operator_name: strOrUndef(data.operatorName),
    transport_details: strOrUndef(data.transportDetails),
    receiver_name: strOrUndef(data.receiverName),
    amount_in_words: amountInWords(normalizeMoney(grandTotal)),
    terms_and_conditions: strOrUndef(data.termsAndConditions ?? data.terms),
    site_state: strOrUndef(data.siteState),
    site_state_code: strOrUndef(data.siteStateCode),
    site_city: strOrUndef(data.siteCity),
    site_district: strOrUndef(data.siteDistrict),
    site_taluka: strOrUndef(data.siteTaluka),
    site_village: strOrUndef(data.siteVillage),
    site_survey_no: strOrUndef(data.siteSurveyNo),
    site_gat_no: strOrUndef(data.siteGatNo),
    site_code: strOrUndef(data.siteCode),
    site_address: strOrUndef(data.siteAddress),
    reverse_charges: String(data.reverseCharges ?? "N").toUpperCase() === "Y" ? "Y" : "N",
    po_no: strOrUndef(data.poNo),
  };
}

function clientFromFormData(data: Record<string, unknown>, base: Partial<MockClient> = {}): MockClient {
  return {
    id: base.id ?? `mock-${Date.now()}`,
    name: String(data.name),
    company_name: strOrUndef(data.companyName),
    phone: String(data.phone),
    secondary_phone: strOrUndef(data.secondaryPhone),
    alternate_phone: strOrUndef(data.alternatePhone),
    office_phone: strOrUndef(data.officePhone),
    email: strOrUndef(data.email),
    billing_address: strOrUndef(data.billingAddress ?? data.address),
    address: strOrUndef(data.address ?? data.billingAddress),
    city: strOrUndef(data.city),
    state: strOrUndef(data.state),
    state_code: strOrUndef(data.stateCode),
    pincode: strOrUndef(data.pincode),
    district: strOrUndef(data.district),
    taluka: strOrUndef(data.taluka),
    village: strOrUndef(data.village),
    survey_no: strOrUndef(data.surveyNo),
    gat_no: strOrUndef(data.gatNo),
    site_code: strOrUndef(data.siteCode),
    site_address: strOrUndef(data.siteAddress),
    site_city: strOrUndef(data.siteCity),
    site_state: strOrUndef(data.siteState),
    site_district: strOrUndef(data.siteDistrict),
    site_taluka: strOrUndef(data.siteTaluka),
    site_village: strOrUndef(data.siteVillage),
    site_survey_no: strOrUndef(data.siteSurveyNo),
    site_gat_no: strOrUndef(data.siteGatNo),
    gstin: strOrUndef(data.gstin),
    pan: strOrUndef(data.pan),
    notes: strOrUndef(data.notes),
    invoice_count: base.invoice_count ?? 0,
  };
}

function buildMockInvoiceRecord(
  data: Record<string, unknown>,
  client: MockClient,
  totals: { subtotal: number; cgstTotal: number; sgstTotal: number; igstTotal: number; taxTotal: number; grandTotal: number },
  items: ReturnType<typeof processItems>,
  base: Partial<MockInvoice> = {}
) {
  const consignee = data.consigneeId
    ? mockClients.find((c) => c.id === data.consigneeId)
    : undefined;
  const vehicle = data.vehicleId
    ? mockVehicles.find((v) => v.id === data.vehicleId)
    : undefined;

  return {
    ...base,
    client_id: client.id,
    client_name: client.name,
    ...clientSnapshot(client),
    ...(consignee ? consigneeSnapshot(consignee) : {}),
    ...(vehicle ? vehicleSnapshot(vehicle) : {}),
    ...invoiceExtrasFromData(data, totals.grandTotal),
    status: String(data.status ?? base.status ?? "draft"),
    invoice_date: String(data.invoiceDate),
    due_date: data.dueDate ? String(data.dueDate) : undefined,
    subtotal: totals.subtotal,
    cgst_total: totals.cgstTotal,
    sgst_total: totals.sgstTotal,
    igst_total: totals.igstTotal,
    tax_total: totals.taxTotal,
    grand_total: totals.grandTotal,
    paid_amount: base.paid_amount ?? 0,
    pending_amount: Math.max(0, totals.grandTotal - (base.paid_amount ?? 0)),
    is_inter_state: Boolean(data.isInterState),
    notes: strOrUndef(data.notes),
    updated_at: new Date().toISOString(),
    items: items.map((item, idx) => ({ id: `${base.id ?? "inv"}-item-${idx}`, ...item })),
  };
}

function processItems(items: MockInvoiceItem[], isInterState: boolean) {
  return items.map((item) => {
    const discount = item.discount ?? 0;
    const amount = round2(item.quantity * item.rate - discount);
    const cgstRate = 9;
    const sgstRate = 9;
    const igstRate = 18;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    if (isInterState) {
      igstAmount = round2((amount * igstRate) / 100);
    } else {
      cgstAmount = round2((amount * cgstRate) / 100);
      sgstAmount = round2((amount * sgstRate) / 100);
    }
    const taxAmount = round2(cgstAmount + sgstAmount + igstAmount);
    const totalAmount = round2(amount + taxAmount);
    return {
      ...item,
      amount,
      cgstRate,
      sgstRate,
      igstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      pendingAmount: totalAmount,
      paymentStatus: "unpaid",
    };
  });
}

export function createMockApi(): ApiClient {
  const mockKpis = {
    totalRevenue: 0,
    totalPaid: 0,
    totalPending: 0,
    gstCollected: 0,
    todayBilling: 0,
    monthlyRevenue: 0,
    overdueAmount: 0,
    averageInvoiceValue: 0,
    totalJobs: 0,
    profitEstimate: 0,
  };

  const refreshMockKpis = () => {
    const totalRevenue = mockInvoices.reduce((s, i) => s + i.grand_total, 0);
    const totalPaid = mockInvoices.reduce((s, i) => s + i.paid_amount, 0);
    mockKpis.totalRevenue = totalRevenue;
    mockKpis.totalPaid = totalPaid;
    mockKpis.totalPending = totalRevenue - totalPaid;
    mockKpis.gstCollected = mockInvoices.reduce((s, i) => s + i.tax_total, 0);
    mockKpis.averageInvoiceValue = mockInvoices.length ? totalRevenue / mockInvoices.length : 0;
    mockKpis.profitEstimate = totalRevenue;
  };

  return {
    app: { getInfo: async () => ({ version: "1.0.0", platform: "web", paths: {} }) },
    auth: {
      login: async (username, password) => {
        if (username === "admin" && password === "admin123") {
          return {
            success: true,
            user: {
              id: "1",
              username: "admin",
              fullName: "System Administrator",
              role: "admin",
              permissions: [],
              mustChangePassword: true,
            },
          };
        }
        return { success: false, error: "Invalid credentials" };
      },
    },
    dashboard: {
      getKpis: async () => { refreshMockKpis(); return mockKpis; },
      refresh: async () => { refreshMockKpis(); return mockKpis; },
      revenueTrend: async () => [],
      statusDistribution: async () => [],
      serviceSplit: async () => [],
      topClients: async () => [],
      pendingAging: async () => [],
    },
    clients: {
      list: async () => mockClients as unknown as Array<Record<string, unknown>>,
      create: async (data) => {
        const id = `mock-${Date.now()}`;
        mockClients.push(clientFromFormData(data, { id, invoice_count: 0 }));
        return { success: true, id };
      },
      update: async (id, data) => {
        const idx = mockClients.findIndex((c) => c.id === id);
        if (idx >= 0) {
          mockClients[idx] = clientFromFormData(data, mockClients[idx]);
        }
        return { success: true };
      },
      delete: async (id) => {
        const idx = mockClients.findIndex((c) => c.id === id);
        if (idx >= 0) mockClients.splice(idx, 1);
        return { success: true };
      },
    },
    invoices: {
      list: async () =>
        mockInvoices.map(({ items: _items, ...inv }) => inv),
      get: async (id) => {
        const inv = mockInvoices.find((i) => i.id === id);
        if (!inv) throw new Error("Invoice not found");
        return {
          invoice: inv as unknown as Record<string, unknown>,
          items: inv.items,
          payments: [],
        };
      },
      create: async (data) => {
        const client = mockClients.find((c) => c.id === data.clientId);
        if (!client) throw new Error("Client not found");
        const items = processItems(data.items as MockInvoiceItem[], Boolean(data.isInterState));
        const subtotal = round2(items.reduce((s, i) => s + i.amount, 0));
        const cgstTotal = round2(items.reduce((s, i) => s + i.cgstAmount, 0));
        const sgstTotal = round2(items.reduce((s, i) => s + i.sgstAmount, 0));
        const igstTotal = round2(items.reduce((s, i) => s + i.igstAmount, 0));
        const taxTotal = round2(cgstTotal + sgstTotal + igstTotal);
        const grandTotal = round2(items.reduce((s, i) => s + i.totalAmount, 0));
        const id = `inv-${Date.now()}`;
        const invoiceNumber = `INV-${mockInvoiceSeq++}`;
        mockInvoices.unshift({
          id,
          invoice_number: invoiceNumber,
          created_at: new Date().toISOString(),
          ...buildMockInvoiceRecord(
            data,
            client,
            { subtotal, cgstTotal, sgstTotal, igstTotal, taxTotal, grandTotal },
            items,
            { id, invoice_number: invoiceNumber, paid_amount: 0 }
          ),
        } as MockInvoice);
        client.invoice_count += 1;
        refreshMockKpis();
        return { success: true, id, invoiceNumber };
      },
      update: async (id, data) => {
        const inv = mockInvoices.find((i) => i.id === id);
        if (!inv) return { success: false, error: "Invoice not found" };
        const client = mockClients.find((c) => c.id === data.clientId);
        if (!client) return { success: false, error: "Client not found" };
        const itemsProcessed = processItems(data.items as MockInvoiceItem[], Boolean(data.isInterState));
        const subtotal = round2(itemsProcessed.reduce((s, i) => s + i.amount, 0));
        const cgstTotal = round2(itemsProcessed.reduce((s, i) => s + i.cgstAmount, 0));
        const sgstTotal = round2(itemsProcessed.reduce((s, i) => s + i.sgstAmount, 0));
        const igstTotal = round2(itemsProcessed.reduce((s, i) => s + i.igstAmount, 0));
        const taxTotal = round2(cgstTotal + sgstTotal + igstTotal);
        const grandTotal = round2(itemsProcessed.reduce((s, i) => s + i.totalAmount, 0));
        Object.assign(inv, buildMockInvoiceRecord(
          data,
          client,
          { subtotal, cgstTotal, sgstTotal, igstTotal, taxTotal, grandTotal },
          itemsProcessed,
          inv
        ));
        refreshMockKpis();
        return { success: true, id };
      },
      delete: async (id) => {
        const inv = mockInvoices.find((i) => i.id === id);
        if (inv) inv.status = "cancelled";
        return { success: true };
      },
      updateStatus: async (id, status) => {
        const inv = mockInvoices.find((i) => i.id === id);
        if (inv) inv.status = status;
        return { success: true };
      },
    },
    payments: {
      list: async () => mockPayments as unknown as Array<Record<string, unknown>>,
      create: async (data) => {
        const inv = mockInvoices.find((i) => i.id === data.invoiceId);
        if (!inv) return { success: false, error: "Invoice not found" };
        const id = `pay-${Date.now()}`;
        mockPayments.unshift({
          id,
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          client_name: inv.client_name,
          amount: Number(data.amount),
          payment_date: String(data.paymentDate),
          payment_method: String(data.paymentMethod ?? "cash"),
          reference_number: data.referenceNumber ? String(data.referenceNumber) : undefined,
          notes: data.notes ? String(data.notes) : undefined,
          created_at: new Date().toISOString(),
        });
        syncMockInvoicePayments(inv.id);
        refreshMockKpis();
        return { success: true, id };
      },
      update: async (id, data) => {
        const pay = mockPayments.find((p) => p.id === id);
        if (!pay) return { success: false, error: "Payment not found" };
        const oldInvoiceId = pay.invoice_id;
        if (data.invoiceId) {
          const inv = mockInvoices.find((i) => i.id === data.invoiceId);
          if (inv) {
            pay.invoice_id = inv.id;
            pay.invoice_number = inv.invoice_number;
            pay.client_name = inv.client_name;
          }
        }
        if (data.amount != null) pay.amount = Number(data.amount);
        if (data.paymentDate) pay.payment_date = String(data.paymentDate);
        if (data.paymentMethod) pay.payment_method = String(data.paymentMethod);
        syncMockInvoicePayments(pay.invoice_id);
        if (data.invoiceId && data.invoiceId !== oldInvoiceId) syncMockInvoicePayments(oldInvoiceId);
        refreshMockKpis();
        return { success: true };
      },
      delete: async (id) => {
        const idx = mockPayments.findIndex((p) => p.id === id);
        if (idx < 0) return { success: false, error: "Payment not found" };
        const invoiceId = mockPayments[idx].invoice_id;
        mockPayments.splice(idx, 1);
        syncMockInvoicePayments(invoiceId);
        refreshMockKpis();
        return { success: true };
      },
    },
    borewell: {
      list: async () => mockBorewellJobs as unknown as Array<Record<string, unknown>>,
      create: async (data) => {
        const client = mockClients.find((c) => c.id === data.clientId);
        if (!client) return { success: false, error: "Client not found" };
        const id = `job-${Date.now()}`;
        const jobNumber = `JOB-${mockJobSeq++}`;
        mockBorewellJobs.unshift({
          id, job_number: jobNumber, client_id: client.id, client_name: client.name,
          site_address: String(data.siteAddress), start_date: data.startDate ? String(data.startDate) : undefined,
          end_date: data.endDate ? String(data.endDate) : undefined, status: String(data.status ?? "pending"),
          total_depth: Number(data.totalDepth ?? 0), water_found_at: data.waterFoundAt != null ? Number(data.waterFoundAt) : undefined,
          water_success: Boolean(data.waterSuccess), drilling_cost: Number(data.drillingCost ?? 0),
          casing_depth: data.casingDepth != null ? Number(data.casingDepth) : undefined,
          pump_type: data.pumpType ? String(data.pumpType) : undefined,
          notes: data.notes ? String(data.notes) : undefined, created_at: new Date().toISOString(),
        });
        return { success: true, id, jobNumber };
      },
      update: async (id, data) => {
        const job = mockBorewellJobs.find((j) => j.id === id);
        if (!job) return { success: false, error: "Job not found" };
        if (data.clientId) {
          const client = mockClients.find((c) => c.id === data.clientId);
          if (client) { job.client_id = client.id; job.client_name = client.name; }
        }
        if (data.siteAddress) job.site_address = String(data.siteAddress);
        if (data.status) job.status = String(data.status);
        if (data.totalDepth != null) job.total_depth = Number(data.totalDepth);
        if (data.drillingCost != null) job.drilling_cost = Number(data.drillingCost);
        if (data.waterSuccess != null) job.water_success = Boolean(data.waterSuccess);
        return { success: true };
      },
      delete: async (id) => {
        const idx = mockBorewellJobs.findIndex((j) => j.id === id);
        if (idx >= 0) mockBorewellJobs.splice(idx, 1);
        return { success: true };
      },
    },
    vehicles: {
      list: async () => mockVehicles as unknown as Array<Record<string, unknown>>,
      create: async (data) => {
        const id = `veh-${Date.now()}`;
        mockVehicles.push({
          id, name: String(data.name), registration_number: String(data.registrationNumber),
          vehicle_type: String(data.vehicleType ?? "truck"), make: data.make ? String(data.make) : undefined,
          model: data.model ? String(data.model) : undefined, year: data.year != null ? Number(data.year) : undefined,
          status: String(data.status ?? "active"), fuel_type: data.fuelType ? String(data.fuelType) : undefined,
          driver_name: strOrUndef(data.driverName),
          operator_name: strOrUndef(data.operatorName),
          transport_details: strOrUndef(data.transportDetails),
          survey_no: strOrUndef(data.surveyNo),
          notes: data.notes ? String(data.notes) : undefined, created_at: new Date().toISOString(),
        });
        return { success: true, id };
      },
      update: async (id, data) => {
        const v = mockVehicles.find((x) => x.id === id);
        if (!v) return { success: false, error: "Vehicle not found" };
        Object.assign(v, {
          name: data.name ?? v.name, registration_number: data.registrationNumber ?? v.registration_number,
          vehicle_type: data.vehicleType ?? v.vehicle_type, status: data.status ?? v.status,
          driver_name: data.driverName != null ? strOrUndef(data.driverName) : v.driver_name,
          operator_name: data.operatorName != null ? strOrUndef(data.operatorName) : v.operator_name,
          transport_details: data.transportDetails != null ? strOrUndef(data.transportDetails) : v.transport_details,
          survey_no: data.surveyNo != null ? strOrUndef(data.surveyNo) : v.survey_no,
        });
        return { success: true };
      },
      delete: async (id) => {
        const v = mockVehicles.find((x) => x.id === id);
        if (v) v.status = "inactive";
        return { success: true };
      },
    },
    expenses: {
      list: async () => mockExpenses as unknown as Array<Record<string, unknown>>,
      create: async (data) => {
        const id = `exp-${Date.now()}`;
        const vehicle = mockVehicles.find((v) => v.id === data.vehicleId);
        mockExpenses.unshift({
          id, category: String(data.category), description: String(data.description),
          amount: Number(data.amount), expense_date: String(data.expenseDate),
          payment_method: String(data.paymentMethod ?? "cash"),
          vehicle_id: data.vehicleId ? String(data.vehicleId) : undefined,
          vehicle_name: vehicle?.name, receipt_number: data.receiptNumber ? String(data.receiptNumber) : undefined,
          notes: data.notes ? String(data.notes) : undefined, created_at: new Date().toISOString(),
        });
        return { success: true, id };
      },
      update: async (id, data) => {
        const exp = mockExpenses.find((e) => e.id === id);
        if (!exp) return { success: false, error: "Expense not found" };
        if (data.category) exp.category = String(data.category);
        if (data.description) exp.description = String(data.description);
        if (data.amount != null) exp.amount = Number(data.amount);
        return { success: true };
      },
      delete: async (id) => {
        const idx = mockExpenses.findIndex((e) => e.id === id);
        if (idx >= 0) mockExpenses.splice(idx, 1);
        return { success: true };
      },
    },
    gst: { summary: async () => [] },
    settings: {
      getAll: async () => ({ ...mockSettings }),
      update: async (settings) => {
        Object.assign(mockSettings, settings);
        return { success: true };
      },
    },
    backup: {
      create: async () => ({ success: true, path: "" }),
      list: async () => [],
      restore: async () => ({ success: true, message: "" }),
    },
    audit: { getLogs: async () => [] },
    users: {
      list: async () => mockUsers as unknown as Array<Record<string, unknown>>,
      create: async (data) => {
        const id = `user-${Date.now()}`;
        mockUsers.push({
          id, username: String(data.username), email: data.email ? String(data.email) : undefined,
          full_name: String(data.fullName), role: String(data.role ?? "operator"), is_active: true,
        });
        return { success: true, id };
      },
      update: async (id, data) => {
        const u = mockUsers.find((x) => x.id === id);
        if (!u) return { success: false, error: "User not found" };
        if (data.username) u.username = String(data.username);
        if (data.fullName) u.full_name = String(data.fullName);
        if (data.role) u.role = String(data.role);
        if (data.isActive != null) u.is_active = Boolean(data.isActive);
        return { success: true };
      },
      delete: async (id) => {
        const u = mockUsers.find((x) => x.id === id);
        if (u) u.is_active = false;
        return { success: true };
      },
    },
    roles: {
      list: async () => [
        { id: "1", name: "admin" }, { id: "2", name: "manager" },
        { id: "3", name: "accountant" }, { id: "4", name: "operator" }, { id: "5", name: "viewer" },
      ],
    },
    branches: { list: async () => [] },
  };
}
