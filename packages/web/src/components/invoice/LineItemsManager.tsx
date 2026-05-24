import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { processInvoiceItem, calculateInvoiceTotals } from "@borewell/core/gst";
import { LineItemDialog } from "./LineItemDialog";
import { createEmptyLineItem, type LineItemRow } from "./lineItemTypes";

interface LineItemsManagerProps {
  items: LineItemRow[];
  onChange: (items: LineItemRow[]) => void;
  isInterState: boolean;
  readOnly?: boolean;
}

function lineItemLabel(item: LineItemRow): string {
  const primary = (item.description || item.name || "").trim();
  const secondary = (item.name || "").trim();
  if (!primary) return "—";
  if (!secondary || secondary === primary) return primary;
  return primary;
}

export function LineItemsManager({ items, onChange, isInterState, readOnly = false }: LineItemsManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LineItemRow | null>(null);
  const isMobile = useIsMobile();

  const defaultRates = { cgstRate: 9, sgstRate: 9, igstRate: 18 };

  const processedRows = useMemo(
    () =>
      items.map((item) => ({
        item,
        calc: processInvoiceItem(
          {
            description: item.description || item.name,
            serviceType: item.serviceType,
            quantity: item.quantity,
            rate: item.rate,
            discount: item.discount,
            hsnCode: item.hsnCode || undefined,
            cgstRate: item.cgstRate,
            sgstRate: item.sgstRate,
            igstRate: item.igstRate,
          },
          isInterState,
          defaultRates
        ),
      })),
    [items, isInterState]
  );

  const totals = useMemo(() => calculateInvoiceTotals(processedRows.map((r) => r.calc)), [processedRows]);

  const openAdd = () => {
    setEditingItem(createEmptyLineItem());
    setDialogOpen(true);
  };

  const openEdit = (item: LineItemRow) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleSaveItem = (item: LineItemRow) => {
    const exists = items.some((i) => i.id === item.id);
    onChange(exists ? items.map((i) => (i.id === item.id ? item : i)) : [...items, item]);
  };

  const handleDelete = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const handleDuplicate = (item: LineItemRow) => {
    onChange([...items, { ...item, id: crypto.randomUUID() }]);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle>Line Items</CardTitle>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
            {items.length} item{items.length !== 1 ? "s" : ""} · Click edit to modify
          </p>
        </div>
        {!readOnly && (
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        {items.length === 0 ? (
          <div className="px-6 py-12 text-center border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-muted-foreground)] mb-4">No items added yet</p>
            {!readOnly && (
              <Button variant="outline" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add First Item
              </Button>
            )}
          </div>
        ) : isMobile ? (
          <div className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {processedRows.map(({ item, calc }) => (
              <div key={item.id} className="p-4 space-y-2">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{lineItemLabel(item)}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)] capitalize">{item.serviceType.replace(/_/g, " ")}</p>
                  </div>
                  <p className="font-semibold text-sm">{formatCurrency(calc.totalAmount)}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[var(--color-muted-foreground)]">
                  <span>Qty: {item.quantity} {item.unit}</span>
                  <span>Rate: {formatCurrency(item.rate)}</span>
                  <span>Before Tax: {formatCurrency(calc.amount)}</span>
                  <span>Tax: {formatCurrency(calc.taxAmount)}</span>
                </div>
                {!readOnly && (
                  <div className="flex gap-1 pt-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDuplicate(item)}><Copy className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="text-[var(--color-destructive)]" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-accent)]/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-muted-foreground)]">Description</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Qty</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Rate</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Discount</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Amt Before Tax</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Tax</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Total</th>
                  {!readOnly && <th className="px-4 py-3 text-right font-medium text-[var(--color-muted-foreground)]">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {processedRows.map(({ item, calc }) => (
                  <tr key={item.id} className="border-t border-[var(--color-border)]/60 hover:bg-[var(--color-accent)]/20">
                    <td className="px-4 py-3">
                      <p className="font-medium">{lineItemLabel(item)}</p>
                      {item.serviceType && item.serviceType !== "other" && (
                        <p className="text-xs text-[var(--color-muted-foreground)] capitalize">{item.serviceType.replace(/_/g, " ")}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.quantity} {item.unit}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(item.rate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(item.discount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(calc.amount)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(calc.taxAmount)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatCurrency(calc.totalAmount)}</td>
                    {!readOnly && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(item)}><Copy className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--color-destructive)]" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[var(--color-accent)]/20 border-t-2 border-[var(--color-border)]">
                <tr>
                  <td colSpan={readOnly ? 6 : 7} className="px-4 py-3 text-right text-[var(--color-muted-foreground)]">Subtotal</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(totals.subtotal)}</td>
                  {!readOnly && <td />}
                </tr>
                {!isInterState ? (
                  <>
                    <tr>
                      <td colSpan={readOnly ? 6 : 7} className="px-4 py-2 text-right text-[var(--color-muted-foreground)]">CGST</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(totals.cgstTotal)}</td>
                      {!readOnly && <td />}
                    </tr>
                    <tr>
                      <td colSpan={readOnly ? 6 : 7} className="px-4 py-2 text-right text-[var(--color-muted-foreground)]">SGST</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(totals.sgstTotal)}</td>
                      {!readOnly && <td />}
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={readOnly ? 6 : 7} className="px-4 py-2 text-right text-[var(--color-muted-foreground)]">IGST</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(totals.igstTotal)}</td>
                    {!readOnly && <td />}
                  </tr>
                )}
                {totals.discountTotal > 0 && (
                  <tr>
                    <td colSpan={readOnly ? 6 : 7} className="px-4 py-2 text-right text-[var(--color-muted-foreground)]">Discounts</td>
                    <td className="px-4 py-2 text-right text-[var(--color-destructive)]">-{formatCurrency(totals.discountTotal)}</td>
                    {!readOnly && <td />}
                  </tr>
                )}
                <tr>
                  <td colSpan={readOnly ? 6 : 7} className="px-4 py-3 text-right font-semibold">Grand Total</td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-[var(--color-primary)]">{formatCurrency(totals.grandTotal)}</td>
                  {!readOnly && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {isMobile && items.length > 0 && (
          <div className="border-t border-[var(--color-border)] p-4 space-y-1 text-sm bg-[var(--color-accent)]/20">
            <div className="flex justify-between"><span className="text-[var(--color-muted-foreground)]">Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
            {!isInterState ? (
              <>
                <div className="flex justify-between"><span className="text-[var(--color-muted-foreground)]">CGST + SGST</span><span>{formatCurrency(totals.cgstTotal + totals.sgstTotal)}</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span className="text-[var(--color-muted-foreground)]">IGST</span><span>{formatCurrency(totals.igstTotal)}</span></div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-[var(--color-border)]">
              <span>Grand Total</span><span className="text-[var(--color-primary)]">{formatCurrency(totals.grandTotal)}</span>
            </div>
          </div>
        )}
      </CardContent>

      {!readOnly && (
        <LineItemDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditingItem(null); }}
          item={editingItem}
          onSave={handleSaveItem}
          isInterState={isInterState}
        />
      )}
    </Card>
  );
}

export function useLineItemsTotals(items: LineItemRow[], isInterState: boolean) {
  return useMemo(() => {
    const defaultRates = { cgstRate: 9, sgstRate: 9, igstRate: 18 };
    const processed = items.map((item) =>
      processInvoiceItem(
        {
          description: item.description || item.name,
          serviceType: item.serviceType,
          quantity: item.quantity,
          rate: item.rate,
          discount: item.discount,
          hsnCode: item.hsnCode || undefined,
          cgstRate: item.cgstRate,
          sgstRate: item.sgstRate,
          igstRate: item.igstRate,
        },
        isInterState,
        defaultRates
      )
    );
    return calculateInvoiceTotals(processed);
  }, [items, isInterState]);
}
