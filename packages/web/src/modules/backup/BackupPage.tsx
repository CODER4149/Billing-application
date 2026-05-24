import { useEffect, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Database, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/input";
import { api } from "@/services/api";
import { formatDate } from "@/lib/utils";

export function BackupPage() {
  const [backups, setBackups] = useState<Array<{ name: string; path: string; size: number; createdAt: string }>>([]);
  const [creating, setCreating] = useState(false);

  const load = () => api.backup.list().then(setBackups);
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    const result = await api.backup.create();
    toast.success(`Backup created: ${result.path.split(/[/\\]/).pop()}`);
    setCreating(false);
    load();
  };

  const handleRestore = async (path: string) => {
    if (!confirm("Restore this backup? Current data will be replaced. App restart required.")) return;
    const result = await api.backup.restore(path);
    toast.success(result.message);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const columns: ColumnDef<{ name: string; path: string; size: number; createdAt: string }>[] = [
    { accessorKey: "name", header: "File", cell: ({ row }) => <span className="font-mono text-sm">{row.original.name}</span> },
    { accessorKey: "size", header: "Size", cell: ({ row }) => formatSize(row.original.size) },
    { accessorKey: "createdAt", header: "Created", cell: ({ row }) => formatDate(row.original.createdAt) },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" onClick={() => handleRestore(row.original.path)}>
          <RotateCcw className="h-3 w-3" /> Restore
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Backup & Restore</h1>
          <p className="text-[var(--color-muted-foreground)]">Protect your local database</p>
        </div>
        <Button onClick={handleCreate} disabled={creating}>
          <Database className="h-4 w-4" /> {creating ? "Creating..." : "Create Backup"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Database, title: "Auto Backup", desc: "Daily scheduled backups enabled" },
          { icon: Download, title: "Local Storage", desc: "All backups stored on your device" },
          { icon: RotateCcw, title: "Safe Restore", desc: "Pre-restore safety copy created" },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="p-4">
            <Icon className="h-8 w-8 text-[var(--color-primary)] mb-2" />
            <p className="font-medium">{title}</p>
            <p className="text-sm text-[var(--color-muted-foreground)]">{desc}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Backup History</CardTitle></CardHeader>
        <CardContent>
          <DataTable data={backups} columns={columns} searchPlaceholder="Search backups..." />
        </CardContent>
      </Card>
    </div>
  );
}
