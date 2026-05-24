import { amountInWords, normalizeMoney } from "@borewell/core/amount";

function strOrNull(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function reverseChargesValue(value: unknown): string {
  const v = String(value ?? "N").toUpperCase();
  return v === "Y" ? "Y" : "N";
}

export interface InvoiceExtraFields {
  vehicleId: string | null;
  consigneeId: string | null;
  amountInWords: string;
  termsAndConditions: string | null;
  driverName: string | null;
  operatorName: string | null;
  transportDetails: string | null;
  receiverName: string | null;
  siteState: string | null;
  siteStateCode: string | null;
  siteCity: string | null;
  siteDistrict: string | null;
  siteTaluka: string | null;
  siteVillage: string | null;
  siteSurveyNo: string | null;
  siteGatNo: string | null;
  siteCode: string | null;
  siteAddress: string | null;
  reverseCharges: string;
  poNo: string | null;
}

export function buildInvoiceExtraFields(data: Record<string, unknown>, grandTotal: number): InvoiceExtraFields {
  return {
    vehicleId: strOrNull(data.vehicleId),
    consigneeId: strOrNull(data.consigneeId),
    amountInWords: amountInWords(normalizeMoney(grandTotal)),
    termsAndConditions: strOrNull(data.termsAndConditions ?? data.terms),
    driverName: strOrNull(data.driverName),
    operatorName: strOrNull(data.operatorName),
    transportDetails: strOrNull(data.transportDetails),
    receiverName: strOrNull(data.receiverName),
    siteState: strOrNull(data.siteState),
    siteStateCode: strOrNull(data.siteStateCode),
    siteCity: strOrNull(data.siteCity),
    siteDistrict: strOrNull(data.siteDistrict),
    siteTaluka: strOrNull(data.siteTaluka),
    siteVillage: strOrNull(data.siteVillage),
    siteSurveyNo: strOrNull(data.siteSurveyNo),
    siteGatNo: strOrNull(data.siteGatNo),
    siteCode: strOrNull(data.siteCode),
    siteAddress: strOrNull(data.siteAddress),
    reverseCharges: reverseChargesValue(data.reverseCharges),
    poNo: strOrNull(data.poNo),
  };
}

export const INVOICE_EXTRA_INSERT_COLS = `
  vehicle_id, consignee_id, amount_in_words, terms_and_conditions,
  driver_name, operator_name, transport_details, receiver_name,
  site_state, site_state_code, site_city, site_district, site_taluka, site_village,
  site_survey_no, site_gat_no, site_code, site_address, reverse_charges, po_no`;

export function invoiceExtraInsertValues(f: InvoiceExtraFields): unknown[] {
  return [
    f.vehicleId, f.consigneeId, f.amountInWords, f.termsAndConditions,
    f.driverName, f.operatorName, f.transportDetails, f.receiverName,
    f.siteState, f.siteStateCode, f.siteCity, f.siteDistrict, f.siteTaluka, f.siteVillage,
    f.siteSurveyNo, f.siteGatNo, f.siteCode, f.siteAddress, f.reverseCharges, f.poNo,
  ];
}

export const INVOICE_EXTRA_UPDATE_SET = `
  vehicle_id=?, consignee_id=?, amount_in_words=?, terms_and_conditions=?,
  driver_name=?, operator_name=?, transport_details=?, receiver_name=?,
  site_state=?, site_state_code=?, site_city=?, site_district=?, site_taluka=?, site_village=?,
  site_survey_no=?, site_gat_no=?, site_code=?, site_address=?, reverse_charges=?, po_no=?`;

export const INVOICE_GET_JOINS = `
  LEFT JOIN clients cons ON cons.id = i.consignee_id
  LEFT JOIN vehicles v ON v.id = i.vehicle_id`;

export const INVOICE_GET_SELECT = `
  i.*,
  c.name as client_name, c.phone as client_phone, c.gstin as client_gstin,
  c.billing_address as client_billing_address, c.address as client_address,
  c.city as client_city, c.state as client_state, c.state_code as client_state_code,
  c.pincode as client_pincode, c.secondary_phone as client_secondary_phone,
  c.office_phone as client_office_phone, c.alternate_phone as client_alternate_phone,
  cons.name as consignee_name, cons.phone as consignee_phone, cons.gstin as consignee_gstin,
  cons.billing_address as consignee_billing_address, cons.address as consignee_address,
  cons.city as consignee_city, cons.state as consignee_state,
  v.name as vehicle_name, v.registration_number as vehicle_registration,
  v.vehicle_type as vehicle_type, v.driver_name as vehicle_driver_name,
  v.operator_name as vehicle_operator_name, v.transport_details as vehicle_transport_details,
  v.survey_no as vehicle_survey_no`;
