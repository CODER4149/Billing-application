import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { useAuthStore, useThemeStore } from "@/store";

const SETTING_GROUPS = [
  {
    title: "Company Details",
    category: "company",
    fields: [
      { key: "company.name", label: "Company Name" },
      { key: "company.proprietor", label: "Proprietor" },
      { key: "company.address", label: "Address" },
      { key: "company.city", label: "City" },
      { key: "company.state", label: "State" },
      { key: "company.pincode", label: "Pincode" },
      { key: "company.phone", label: "Primary Phone" },
      { key: "company.phone2", label: "Phone 2" },
      { key: "company.phone3", label: "Phone 3" },
      { key: "company.phone4", label: "Phone 4" },
      { key: "company.email", label: "Email" },
      { key: "company.gstin", label: "GSTIN" },
    ],
  },
  {
    title: "GST Settings",
    category: "gst",
    fields: [
      { key: "gst.default_cgst", label: "Default CGST (%)" },
      { key: "gst.default_sgst", label: "Default SGST (%)" },
      { key: "gst.default_igst", label: "Default IGST (%)" },
    ],
  },
  {
    title: "Invoice Settings",
    category: "invoice",
    fields: [
      { key: "invoice.prefix", label: "Invoice Prefix" },
      { key: "invoice.next_number", label: "Next Invoice Number" },
      { key: "invoice.due_days", label: "Default Due Days" },
    ],
  },
  {
    title: "Backup Settings",
    category: "backup",
    fields: [
      { key: "backup.auto_enabled", label: "Auto Backup (true/false)" },
      { key: "backup.schedule", label: "Schedule (daily/weekly)" },
      { key: "backup.retention_days", label: "Retention Days" },
    ],
  },
];

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    api.settings.getAll().then(setSettings);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await api.settings.update(settings, user?.id);
    toast.success("Settings saved");
    setSaving(false);
  };

  const update = (key: string, value: string) => setSettings((s) => ({ ...s, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-[var(--color-muted-foreground)]">Configure application preferences</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save All"}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Theme</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTheme(t); update("theme.mode", t); }}
              className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                theme === t ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-accent)] hover:opacity-80"
              }`}
            >
              {t}
            </button>
          ))}
        </CardContent>
      </Card>

      {SETTING_GROUPS.map((group) => (
        <Card key={group.title}>
          <CardHeader><CardTitle>{group.title}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  value={settings[field.key] ?? ""}
                  onChange={(e) => update(field.key, e.target.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
