import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, FileText, CreditCard, Droplets,
  Truck, Receipt, BarChart3, ScrollText, Settings, UserCog,
  Database, ChevronLeft, ChevronRight, LogOut, Moon, Sun,
  Command, Search, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore, useAppStore, useThemeStore, applyTheme } from "@/store";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { CommandPalette } from "@/components/layout/CommandPalette";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/clients", icon: Users, label: "Clients" },
  { to: "/invoices", icon: FileText, label: "Invoices" },
  { to: "/payments", icon: CreditCard, label: "Payments" },
  { to: "/borewell-jobs", icon: Droplets, label: "Borewell Jobs" },
  { to: "/vehicles", icon: Truck, label: "Vehicles" },
  { to: "/expenses", icon: Receipt, label: "Expenses" },
  { to: "/gst", icon: BarChart3, label: "GST Reports" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/logs", icon: ScrollText, label: "Audit Logs" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/users", icon: UserCog, label: "Users" },
  { to: "/backup", icon: Database, label: "Backup" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, setCommandPaletteOpen } = useAppStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setCommandPaletteOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleThemeMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="gradient-bg flex min-h-screen">
      <CommandPalette />
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[var(--color-border)] bg-[var(--color-card)]/80 backdrop-blur-xl transition-all duration-300",
          sidebarCollapsed ? "w-[68px]" : "w-64"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-[var(--color-border)] px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white font-bold text-sm">
            BW
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden"
              >
                <p className="font-semibold text-sm whitespace-nowrap">Borewell ERP</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">Offline Billing</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]"
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[var(--color-border)] p-3 space-y-1">
          {!sidebarCollapsed && user && (
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium truncate">{user.fullName}</p>
              <p className="text-xs text-[var(--color-muted-foreground)] capitalize">{user.role}</p>
            </div>
          )}
          <button
            onClick={toggleThemeMode}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] transition-colors"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {!sidebarCollapsed && <span>Toggle Theme</span>}
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className={cn("flex flex-1 flex-col transition-all duration-300", sidebarCollapsed ? "ml-[68px]" : "ml-64")}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-background)]/80 backdrop-blur-xl px-6">
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex flex-1 max-w-md items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)]/50 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span>Search everywhere...</span>
            <kbd className="ml-auto hidden sm:inline-flex items-center gap-1 rounded border border-[var(--color-border)] px-1.5 py-0.5 text-xs">
              <Command className="h-3 w-3" />K
            </kbd>
          </button>

          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
        </header>

        <main className="flex-1 p-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
