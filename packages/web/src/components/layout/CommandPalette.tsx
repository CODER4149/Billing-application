import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { useAppStore } from "@/store";
import {
  LayoutDashboard, Users, FileText, CreditCard, Droplets,
  Truck, Receipt, Settings, Database, ScrollText,
} from "lucide-react";

const commands = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Clients", icon: Users, path: "/clients" },
  { label: "Invoices", icon: FileText, path: "/invoices" },
  { label: "Payments", icon: CreditCard, path: "/payments" },
  { label: "Borewell Jobs", icon: Droplets, path: "/borewell-jobs" },
  { label: "Vehicles", icon: Truck, path: "/vehicles" },
  { label: "Expenses", icon: Receipt, path: "/expenses" },
  { label: "Audit Logs", icon: ScrollText, path: "/logs" },
  { label: "Settings", icon: Settings, path: "/settings" },
  { label: "Backup & Restore", icon: Database, path: "/backup" },
];

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore();
  const navigate = useNavigate();

  const run = (path: string) => {
    setCommandPaletteOpen(false);
    navigate(path);
  };

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setCommandPaletteOpen(false)}
      />
      <div className="absolute left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2">
        <Command className="glass rounded-xl shadow-2xl overflow-hidden">
          <Command.Input
            placeholder="Type a command or search..."
            className="w-full border-b border-[var(--color-border)] bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[var(--color-muted-foreground)]"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-[var(--color-muted-foreground)]">
              No results found.
            </Command.Empty>
            <Command.Group heading="Navigation" className="text-xs text-[var(--color-muted-foreground)] px-2 py-1.5">
              {commands.map(({ label, icon: Icon, path }) => (
                <Command.Item
                  key={path}
                  onSelect={() => run(path)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer aria-selected:bg-[var(--color-accent)]"
                >
                  <Icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  {label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
