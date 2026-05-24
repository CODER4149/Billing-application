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
import { formatDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { VehicleFormFields } from "./VehicleFormFields";

type Row = Record<string, unknown> & { id: string; name: string };

export function VehiclesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [viewRow, setViewRow] = useState<Row | null>(null);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const { user } = useAuthStore();
  const isMobile = useIsMobile();

  const load = async () => {
    setLoading(true);
    setRows((await api.vehicles.list()) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-medium">{String(row.original.name)}</span> },
    { accessorKey: "registration_number", header: "Registration", cell: ({ row }) => <span className="font-mono">{String(row.original.registration_number)}</span> },
    { accessorKey: "vehicle_type", header: "Type", cell: ({ row }) => <span className="capitalize">{String(row.original.vehicle_type)}</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <span className="capitalize">{String(row.original.status)}</span> },
    { accessorKey: "created_at", header: "Added", cell: ({ row }) => row.original.created_at ? formatDate(String(row.original.created_at)) : "—" },
  ];

  const openCreate = () => { setEditRow(null); setViewRow(null); setPanelOpen(true); };
  const openEdit = (row: Row) => { setEditRow(row); setViewRow(null); setPanelOpen(true); };
  const openView = (row: Row) => { setViewRow(row); setEditRow(null); setPanelOpen(true); };

  const handleSave = async (data: Record<string, unknown>) => {
    if (editRow) {
      const result = await api.vehicles.update(editRow.id, data, user?.id);
      if (!result.success) throw new Error(result.error ?? "Update failed");
      toast.success("Vehicle updated");
    } else {
      const result = await api.vehicles.create(data, user?.id);
      if (!result.success) throw new Error(result.error ?? "Create failed");
      toast.success("Vehicle added");
    }
    setPanelOpen(false);
    setEditRow(null);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.vehicles.delete(deleteTarget.id, user?.id);
    toast.success("Vehicle removed");
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description="Fleet and machine management"
        breadcrumbs={[{ label: "Vehicles" }]}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Vehicle</Button>}
      />
      <ResourceTable
        data={rows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search vehicles..."
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
        title={viewRow ? String(viewRow.name) : editRow ? "Edit Vehicle" : "Add Vehicle"}
        size="md"
      >
        {viewRow ? (
          <div className="space-y-4">
            <DetailRows rows={[
              ["Registration", String(viewRow.registration_number)],
              ["Type", String(viewRow.vehicle_type)],
              ["Make", String(viewRow.make ?? "—")],
              ["Model", String(viewRow.model ?? "—")],
              ["Survey No.", String(viewRow.survey_no ?? "—")],
              ["Driver", String(viewRow.driver_name ?? "—")],
              ["Status", String(viewRow.status)],
            ]} />
            <Button className="w-full" onClick={() => { setViewRow(null); setEditRow(viewRow); }}>Edit Vehicle</Button>
          </div>
        ) : (
          <VehicleFormFields vehicle={editRow} onSave={handleSave} onCancel={() => { setPanelOpen(false); setEditRow(null); }} />
        )}
      </SlidePanel>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Vehicle"
        message={`Mark ${deleteTarget?.name} as inactive?`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
