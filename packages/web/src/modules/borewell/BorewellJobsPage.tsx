import { useEffect, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crud/PageHeader";
import { ResourceTable } from "@/components/crud/ResourceTable";
import { StatusPill } from "@/components/crud/StatusPill";
import { ConfirmDialog } from "@/components/crud/ConfirmDialog";
import { SlidePanel } from "@/components/crud/SlidePanel";
import { DetailRows } from "@/components/crud/DetailRows";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { useAuthStore } from "@/store";
import { formatCurrency } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { BorewellFormFields } from "./BorewellFormFields";

type Row = Record<string, unknown> & { id: string; job_number: string };

export function BorewellJobsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [viewRow, setViewRow] = useState<Row | null>(null);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const { user } = useAuthStore();
  const isMobile = useIsMobile();

  const load = async () => {
    setLoading(true);
    const [jobData, clientData] = await Promise.all([api.borewell.list(), api.clients.list()]);
    setRows(jobData as Row[]);
    setClients(clientData.map((c) => ({ id: String(c.id), name: String(c.name) })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "job_number", header: "Job #", cell: ({ row }) => <span className="font-mono font-medium">{String(row.original.job_number)}</span> },
    { accessorKey: "client_name", header: "Client" },
    { accessorKey: "site_address", header: "Site", cell: ({ row }) => <span className="truncate max-w-[180px] block">{String(row.original.site_address)}</span> },
    { accessorKey: "total_depth", header: "Depth", cell: ({ row }) => `${row.original.total_depth ?? 0} ft` },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusPill status={String(row.original.status)} /> },
    { accessorKey: "drilling_cost", header: "Cost", cell: ({ row }) => formatCurrency(Number(row.original.drilling_cost ?? 0)) },
  ];

  const openCreate = () => { setEditRow(null); setViewRow(null); setPanelOpen(true); };
  const openEdit = (row: Row) => { setEditRow(row); setViewRow(null); setPanelOpen(true); };
  const openView = (row: Row) => { setViewRow(row); setEditRow(null); setPanelOpen(true); };

  const handleSave = async (data: Record<string, unknown>) => {
    if (editRow) {
      const result = await api.borewell.update(editRow.id, data, user?.id);
      if (!result.success) throw new Error(result.error ?? "Update failed");
      toast.success("Job updated");
    } else {
      const result = await api.borewell.create(data, user?.id);
      if (!result.success) throw new Error(result.error ?? "Create failed");
      toast.success(`Job ${result.jobNumber ?? ""} created`);
    }
    setPanelOpen(false);
    setEditRow(null);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.borewell.delete(deleteTarget.id, user?.id);
    toast.success("Job deleted");
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Borewell Jobs"
        description="Track drilling operations and water success"
        breadcrumbs={[{ label: "Borewell Jobs" }]}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New Job</Button>}
      />
      <ResourceTable
        data={rows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search jobs..."
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
        title={viewRow ? String(viewRow.job_number) : editRow ? "Edit Job" : "New Borewell Job"}
        size="lg"
      >
        {viewRow ? (
          <div className="space-y-4">
            <DetailRows rows={[
              ["Client", String(viewRow.client_name)],
              ["Site", String(viewRow.site_address)],
              ["Depth", `${viewRow.total_depth ?? 0} ft`],
              ["Water Success", viewRow.water_success ? "Yes" : "No"],
              ["Cost", formatCurrency(Number(viewRow.drilling_cost))],
              ["Status", String(viewRow.status)],
            ]} />
            <Button className="w-full" onClick={() => { setViewRow(null); setEditRow(viewRow); }}>Edit Job</Button>
          </div>
        ) : (
          <BorewellFormFields job={editRow} clients={clients} onSave={handleSave} onCancel={() => { setPanelOpen(false); setEditRow(null); }} />
        )}
      </SlidePanel>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Job"
        message={`Delete job ${deleteTarget?.job_number}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
