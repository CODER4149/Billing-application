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
import { ExpenseFormFields } from "./ExpenseFormFields";

type Row = Record<string, unknown> & { id: string };

export function ExpensesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [viewRow, setViewRow] = useState<Row | null>(null);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const { user } = useAuthStore();
  const isMobile = useIsMobile();

  const load = async () => {
    setLoading(true);
    const [expenseData, vehicleData] = await Promise.all([api.expenses.list(), api.vehicles.list()]);
    setRows(expenseData as Row[]);
    setVehicles(vehicleData.map((v) => ({ id: String(v.id), name: String(v.name) })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "expense_date", header: "Date", cell: ({ row }) => formatDate(String(row.original.expense_date)) },
    { accessorKey: "category", header: "Category", cell: ({ row }) => <span className="capitalize font-medium">{String(row.original.category)}</span> },
    { accessorKey: "description", header: "Description" },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => <span className="font-medium text-[var(--color-destructive)]">{formatCurrency(Number(row.original.amount))}</span> },
    { accessorKey: "vehicle_name", header: "Vehicle", cell: ({ row }) => String(row.original.vehicle_name ?? "—") },
  ];

  const openCreate = () => { setEditRow(null); setViewRow(null); setPanelOpen(true); };
  const openEdit = (row: Row) => { setEditRow(row); setViewRow(null); setPanelOpen(true); };
  const openView = (row: Row) => { setViewRow(row); setEditRow(null); setPanelOpen(true); };

  const handleSave = async (data: Record<string, unknown>) => {
    if (editRow) {
      const result = await api.expenses.update(editRow.id, data, user?.id);
      if (!result.success) throw new Error(result.error ?? "Update failed");
      toast.success("Expense updated");
    } else {
      const result = await api.expenses.create(data, user?.id);
      if (!result.success) throw new Error(result.error ?? "Create failed");
      toast.success("Expense recorded");
    }
    setPanelOpen(false);
    setEditRow(null);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.expenses.delete(deleteTarget.id, user?.id);
    toast.success("Expense deleted");
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track vehicle and operational expenses"
        breadcrumbs={[{ label: "Expenses" }]}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Expense</Button>}
      />
      <ResourceTable
        data={rows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search expenses..."
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
        title={viewRow ? "Expense Details" : editRow ? "Edit Expense" : "Add Expense"}
        size="md"
      >
        {viewRow ? (
          <div className="space-y-4">
            <DetailRows rows={[
              ["Category", String(viewRow.category)],
              ["Description", String(viewRow.description)],
              ["Amount", formatCurrency(Number(viewRow.amount))],
              ["Vehicle", String(viewRow.vehicle_name ?? "—")],
              ["Date", formatDate(String(viewRow.expense_date))],
              ["Method", String(viewRow.payment_method ?? "—")],
            ]} />
            <Button className="w-full" onClick={() => { setViewRow(null); setEditRow(viewRow); }}>Edit Expense</Button>
          </div>
        ) : (
          <ExpenseFormFields expense={editRow} vehicles={vehicles} onSave={handleSave} onCancel={() => { setPanelOpen(false); setEditRow(null); }} />
        )}
      </SlidePanel>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message="Permanently delete this expense record?"
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
