import { useEffect, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crud/PageHeader";
import { ResourceTable } from "@/components/crud/ResourceTable";
import { ConfirmDialog } from "@/components/crud/ConfirmDialog";
import { SlidePanel } from "@/components/crud/SlidePanel";
import { DetailRows } from "@/components/crud/DetailRows";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { useAuthStore } from "@/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { PaymentFormFields } from "./PaymentFormFields";

type Row = Record<string, unknown> & { id: string };

export function PaymentsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [invoices, setInvoices] = useState<Array<{ id: string; invoice_number: string; client_name: string; pending_amount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [viewRow, setViewRow] = useState<Row | null>(null);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const { user } = useAuthStore();
  const isMobile = useIsMobile();

  const load = async () => {
    setLoading(true);
    const [paymentData, invoiceData] = await Promise.all([api.payments.list(), api.invoices.list()]);
    setRows(paymentData as Row[]);
    setInvoices(
      invoiceData
        .filter((i) => i.status !== "cancelled" && Number(i.pending_amount) > 0)
        .map((i) => ({
          id: String(i.id),
          invoice_number: String(i.invoice_number),
          client_name: String(i.client_name),
          pending_amount: Number(i.pending_amount),
        }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "invoice_number", header: "Invoice #", cell: ({ row }) => <span className="font-mono">{String(row.original.invoice_number)}</span> },
    { accessorKey: "client_name", header: "Client" },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => <span className="font-medium text-[var(--color-success)]">{formatCurrency(Number(row.original.amount))}</span> },
    { accessorKey: "payment_method", header: "Method", cell: ({ row }) => <span className="capitalize">{String(row.original.payment_method).replace(/_/g, " ")}</span> },
    { accessorKey: "payment_date", header: "Date", cell: ({ row }) => formatDate(String(row.original.payment_date)) },
  ];

  const openCreate = () => { setEditRow(null); setViewRow(null); setPanelOpen(true); };
  const openEdit = (row: Row) => { setEditRow(row); setViewRow(null); setPanelOpen(true); };
  const openView = (row: Row) => { setViewRow(row); setEditRow(null); setPanelOpen(true); };

  const handleSave = async (data: Record<string, unknown>) => {
    const payload = { ...data, amount: Number(data.amount) };
    if (editRow) {
      const result = await api.payments.update(editRow.id, payload, user?.id);
      if (!result.success) throw new Error(result.error ?? "Update failed");
      toast.success("Payment updated");
    } else {
      const result = await api.payments.create(payload, user?.id);
      if (!result.success) throw new Error(result.error ?? "Create failed");
      toast.success("Payment recorded");
    }
    setPanelOpen(false);
    setEditRow(null);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.payments.delete(deleteTarget.id, user?.id);
    toast.success("Payment deleted");
    setDeleteTarget(null);
    load();
  };

  const invoiceOptions = editRow
    ? [
        ...invoices,
        ...(invoices.some((i) => i.id === editRow.invoice_id)
          ? []
          : [{
              id: String(editRow.invoice_id),
              invoice_number: String(editRow.invoice_number),
              client_name: String(editRow.client_name),
              pending_amount: Number(editRow.amount),
            }]),
      ]
    : invoices;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track all payment collections"
        breadcrumbs={[{ label: "Payments" }]}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Record Payment</Button>}
      />
      <ResourceTable
        data={rows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search payments..."
        rowActions={{ onView: openView, onEdit: openEdit, onDelete: setDeleteTarget }}
        onRowClick={openView}
      />
      {isMobile && (
        <Button className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full shadow-lg" onClick={openCreate}>
          <Plus className="h-6 w-6" />
        </Button>
      )}
      <SlidePanel
        open={panelOpen}
        onClose={() => { setPanelOpen(false); setEditRow(null); setViewRow(null); }}
        title={viewRow ? "Payment Details" : editRow ? "Edit Payment" : "Record Payment"}
        size="md"
      >
        {viewRow ? (
          <div className="space-y-4">
            <DetailRows rows={[
              ["Invoice", String(viewRow.invoice_number)],
              ["Client", String(viewRow.client_name)],
              ["Amount", formatCurrency(Number(viewRow.amount))],
              ["Method", String(viewRow.payment_method).replace(/_/g, " ")],
              ["Date", formatDate(String(viewRow.payment_date))],
              ["Reference", String(viewRow.reference_number ?? "—")],
            ]} />
            <Button className="w-full" onClick={() => { setViewRow(null); setEditRow(viewRow); }}>Edit Payment</Button>
          </div>
        ) : (
          <PaymentFormFields payment={editRow} invoices={invoiceOptions} onSave={handleSave} onCancel={() => { setPanelOpen(false); setEditRow(null); }} />
        )}
      </SlidePanel>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Payment"
        message="Delete this payment? Invoice balances will be recalculated."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
