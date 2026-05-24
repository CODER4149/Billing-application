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
import { formatDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { UserFormFields } from "./UserFormFields";

type Row = Record<string, unknown> & { id: string; full_name: string };

const DEFAULT_ROLES = [
  { name: "admin" }, { name: "manager" }, { name: "accountant" }, { name: "operator" }, { name: "viewer" },
];

export function UsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Array<{ name: string }>>(DEFAULT_ROLES);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [viewRow, setViewRow] = useState<Row | null>(null);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const { user } = useAuthStore();
  const isMobile = useIsMobile();

  const load = async () => {
    setLoading(true);
    const [userData, roleData] = await Promise.all([
      api.users.list(),
      api.roles.list().catch(() => DEFAULT_ROLES),
    ]);
    setRows(userData as Row[]);
    if (roleData.length) setRoles(roleData.map((r) => ({ name: String(r.name) })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const columns: ColumnDef<Row>[] = [
    { accessorKey: "full_name", header: "Name", cell: ({ row }) => <span className="font-medium">{String(row.original.full_name)}</span> },
    { accessorKey: "username", header: "Username", cell: ({ row }) => <span className="font-mono text-xs">{String(row.original.username)}</span> },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "role", header: "Role", cell: ({ row }) => <span className="capitalize">{String(row.original.role)}</span> },
    { accessorKey: "is_active", header: "Status", cell: ({ row }) => <StatusPill status={row.original.is_active ? "active" : "cancelled"} /> },
    { accessorKey: "last_login_at", header: "Last Login", cell: ({ row }) => row.original.last_login_at ? formatDate(String(row.original.last_login_at)) : "Never" },
  ];

  const openCreate = () => { setEditRow(null); setViewRow(null); setPanelOpen(true); };
  const openEdit = (row: Row) => { setEditRow(row); setViewRow(null); setPanelOpen(true); };
  const openView = (row: Row) => { setViewRow(row); setEditRow(null); setPanelOpen(true); };

  const handleSave = async (data: Record<string, unknown>) => {
    if (editRow) {
      const result = await api.users.update(editRow.id, data, user?.id);
      if (!result.success) throw new Error(result.error ?? "Update failed");
      toast.success("User updated");
    } else {
      const result = await api.users.create(data, user?.id);
      if (!result.success) throw new Error(result.error ?? "Create failed");
      toast.success("User created");
    }
    setPanelOpen(false);
    setEditRow(null);
    await load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.users.delete(deleteTarget.id, user?.id);
    toast.success("User deactivated");
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage roles and access permissions"
        breadcrumbs={[{ label: "Users" }]}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add User</Button>}
      />
      <ResourceTable
        data={rows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search users..."
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
        title={viewRow ? String(viewRow.full_name) : editRow ? "Edit User" : "Add User"}
        size="md"
      >
        {viewRow ? (
          <div className="space-y-4">
            <DetailRows rows={[
              ["Username", String(viewRow.username)],
              ["Email", String(viewRow.email ?? "—")],
              ["Role", String(viewRow.role)],
              ["Status", viewRow.is_active ? "Active" : "Inactive"],
              ["Last Login", viewRow.last_login_at ? formatDate(String(viewRow.last_login_at)) : "Never"],
            ]} />
            <Button className="w-full" onClick={() => { setViewRow(null); setEditRow(viewRow); }}>Edit User</Button>
          </div>
        ) : (
          <UserFormFields user={editRow} roles={roles} onSave={handleSave} onCancel={() => { setPanelOpen(false); setEditRow(null); }} />
        )}
      </SlidePanel>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Deactivate User"
        message={`Deactivate ${deleteTarget?.full_name}? They will no longer be able to log in.`}
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  );
}
