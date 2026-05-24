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
import { ClientFormFields } from "./ClientFormFields";

type ClientRow = Record<string, unknown> & {
  id: string;
  name: string;
  company_name?: string;
  phone: string;
  email?: string;
  city?: string;
  gstin?: string;
  created_at?: string;
  updated_at?: string;
};

export function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [viewClient, setViewClient] = useState<ClientRow | null>(null);
  const [editClient, setEditClient] = useState<ClientRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);
  const { user } = useAuthStore();
  const isMobile = useIsMobile();

  const load = async () => {
    setLoading(true);
    const data = await api.clients.list();
    setClients(data as unknown as ClientRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const columns: ColumnDef<ClientRow>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          {row.original.company_name && (
            <p className="text-xs text-[var(--color-muted-foreground)]">{row.original.company_name}</p>
          )}
        </div>
      ),
    },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "city", header: "City" },
    { accessorKey: "gstin", header: "GSTIN" },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {row.original.created_at ? formatDate(row.original.created_at) : "—"}
        </span>
      ),
    },
  ];

  const openCreate = () => { setEditClient(null); setViewClient(null); setPanelOpen(true); };
  const openEdit = (row: ClientRow) => { setEditClient(row); setViewClient(null); setPanelOpen(true); };
  const openView = (row: ClientRow) => { setViewClient(row); setEditClient(null); setPanelOpen(true); };

  const handleSave = async (data: Record<string, unknown>) => {
    if (editClient) {
      const result = await api.clients.update(editClient.id, data, user?.id);
      if (!result.success) throw new Error("Update failed");
      toast.success("Client updated");
    } else {
      const result = await api.clients.create(data, user?.id);
      if (!result.success) throw new Error(result.error ?? "Create failed");
      toast.success("Client created");
    }
    setPanelOpen(false);
    setEditClient(null);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.clients.delete(deleteTarget.id, user?.id);
    toast.success("Client removed");
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage customer database and contact details"
        breadcrumbs={[{ label: "Clients" }]}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Client</Button>}
      />

      <ResourceTable
        data={clients}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search clients..."
        rowActions={{
          onView: openView,
          onEdit: openEdit,
          onDelete: (row) => setDeleteTarget(row),
        }}
        onRowClick={openView}
      />

      {isMobile && (
        <Button className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full shadow-lg" onClick={openCreate}>
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <SlidePanel
        open={panelOpen}
        onClose={() => { setPanelOpen(false); setEditClient(null); setViewClient(null); }}
        title={viewClient ? viewClient.name : editClient ? "Edit Client" : "Add Client"}
        description={viewClient ? "Client details" : "Fill in client information"}
        size="md"
      >
        {viewClient ? (
          <div className="space-y-4">
            <DetailRows rows={[
              ["Phone", viewClient.phone],
              ["Secondary", String(viewClient.secondary_phone ?? "—")],
              ["Alternate", String(viewClient.alternate_phone ?? "—")],
              ["Office", String(viewClient.office_phone ?? "—")],
              ["Email", viewClient.email ?? "—"],
              ["Billing Address", String(viewClient.billing_address ?? viewClient.address ?? "—")],
              ["City / State", [viewClient.city, viewClient.state].filter(Boolean).join(", ") || "—"],
              ["District / Taluka", [viewClient.district, viewClient.taluka].filter(Boolean).join(", ") || "—"],
              ["Village", String(viewClient.village ?? "—")],
              ["Survey / Get No.", [viewClient.survey_no, viewClient.gat_no].filter(Boolean).join(" / ") || "—"],
              ["Site Code", String(viewClient.site_code ?? "—")],
              ["Site Address", String(viewClient.site_address ?? "—")],
              ["GSTIN", viewClient.gstin ?? "—"],
            ]} />
            <Button className="w-full mt-4" onClick={() => { setViewClient(null); setEditClient(viewClient); }}>
              Edit Client
            </Button>
          </div>
        ) : (
          <ClientFormFields
            client={editClient}
            onSave={handleSave}
            onCancel={() => { setPanelOpen(false); setEditClient(null); }}
          />
        )}
      </SlidePanel>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Client"
        message={`Remove ${deleteTarget?.name} from active clients?`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
