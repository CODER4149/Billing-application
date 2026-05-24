import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crud/PageHeader";
import { ResourceTable } from "@/components/crud/ResourceTable";
import { StatusPill } from "@/components/crud/StatusPill";
import { ConfirmDialog } from "@/components/crud/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { useAuthStore } from "@/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMediaQuery";

type InvoiceRow = Record<string, unknown> & {
  id: string;
  invoice_number: string;
  client_name: string;
  status: string;
  invoice_date: string;
  grand_total: number;
  pending_amount: number;
  created_at?: string;
  updated_at?: string;
};

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isMobile = useIsMobile();

  const load = async () => {
    setLoading(true);
    const data = await api.invoices.list();
    setInvoices(data as unknown as InvoiceRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const columns: ColumnDef<InvoiceRow>[] = [
    {
      accessorKey: "invoice_number",
      header: "Invoice #",
      cell: ({ row }) => <span className="font-mono font-medium">{row.original.invoice_number}</span>,
    },
    { accessorKey: "client_name", header: "Client" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
    {
      accessorKey: "invoice_date",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.invoice_date),
    },
    {
      accessorKey: "grand_total",
      header: "Total",
      cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.grand_total)}</span>,
    },
    {
      accessorKey: "pending_amount",
      header: "Pending",
      cell: ({ row }) => (
        <span className={row.original.pending_amount > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-success)]"}>
          {formatCurrency(row.original.pending_amount)}
        </span>
      ),
    },
    {
      accessorKey: "updated_at",
      header: "Last Updated",
      cell: ({ row }) => (
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {row.original.updated_at ? formatDate(row.original.updated_at) : "—"}
        </span>
      ),
    },
  ];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.invoices.delete(deleteTarget.id, user?.id);
    toast.success("Invoice cancelled");
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Manage billing, line items, and payment tracking"
        breadcrumbs={[{ label: "Invoices" }]}
        actions={
          <Button onClick={() => navigate("/invoices/new")}>
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        }
      />

      <ResourceTable
        data={invoices}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search invoices, clients..."
        rowActions={{
          onView: (row) => navigate(`/invoices/${row.id}`),
          onEdit: (row) => navigate(`/invoices/${row.id}/edit`),
          onDelete: (row) => setDeleteTarget(row),
        }}
        onRowClick={(row) => navigate(`/invoices/${row.id}`)}
        emptyMessage="No invoices yet. Create your first invoice."
      />

      {isMobile && (
        <Button
          className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full shadow-lg md:hidden"
          onClick={() => navigate("/invoices/new")}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Cancel Invoice"
        message={`Cancel invoice ${deleteTarget?.invoice_number}? This marks it as cancelled.`}
        confirmLabel="Cancel Invoice"
        variant="danger"
      />
    </div>
  );
}
