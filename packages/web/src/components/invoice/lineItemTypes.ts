export interface LineItemRow {
  id: string;
  name: string;
  description: string;
  serviceType: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  hsnCode: string;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
}

export function createEmptyLineItem(): LineItemRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    serviceType: "drilling",
    quantity: 1,
    unit: "nos",
    rate: 0,
    discount: 0,
    hsnCode: "",
    cgstRate: 9,
    sgstRate: 9,
    igstRate: 18,
  };
}

export function lineItemFromRecord(record: Record<string, unknown>): LineItemRow {
  return {
    id: String(record.id ?? crypto.randomUUID()),
    name: String(record.name ?? record.description ?? "").split(" - ")[0] || String(record.description ?? ""),
    description: String(record.description ?? ""),
    serviceType: String(record.service_type ?? record.serviceType ?? "other"),
    quantity: Number(record.quantity ?? 1),
    unit: String(record.unit ?? "nos"),
    rate: Number(record.rate ?? 0),
    discount: Number(record.discount ?? 0),
    hsnCode: String(record.hsn_code ?? record.hsnCode ?? ""),
    cgstRate: Number(record.cgst_rate ?? record.cgstRate ?? 9),
    sgstRate: Number(record.sgst_rate ?? record.sgstRate ?? 9),
    igstRate: Number(record.igst_rate ?? record.igstRate ?? 18),
  };
}

export function lineItemToPayload(item: LineItemRow) {
  return {
    description: item.description || item.name,
    serviceType: item.serviceType,
    quantity: item.quantity,
    unit: item.unit,
    rate: item.rate,
    discount: item.discount,
    hsnCode: item.hsnCode || undefined,
    cgstRate: item.cgstRate,
    sgstRate: item.sgstRate,
    igstRate: item.igstRate,
  };
}
