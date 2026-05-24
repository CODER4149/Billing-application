import { useEffect, useState } from "react";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface UserFormFieldsProps {
  user?: Record<string, unknown> | null;
  roles: Array<{ name: string }>;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export function UserFormFields({ user, roles, onSave, onCancel }: UserFormFieldsProps) {
  const [form, setForm] = useState({
    username: "", fullName: "", email: "", role: "operator", password: "", isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        username: String(user.username ?? ""),
        fullName: String(user.full_name ?? ""),
        email: String(user.email ?? ""),
        role: String(user.role ?? "operator"),
        password: "",
        isActive: Boolean(user.is_active),
      });
    }
  }, [user]);

  const set = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.username.trim() || !form.fullName.trim()) {
      setError("Username and full name are required");
      return;
    }
    if (!user && !form.password.trim()) {
      setError("Password is required for new users");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        username: form.username,
        fullName: form.fullName,
        email: form.email || undefined,
        role: form.role,
        isActive: form.isActive,
        ...(form.password ? { password: form.password } : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]">{error}</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Username *</Label>
          <Input value={form.username} onChange={(e) => set("username", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Full Name *</Label>
          <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Role *</Label>
          <Select value={form.role} onChange={(e) => set("role", e.target.value)}>
            {roles.map((r) => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>{user ? "New Password (leave blank to keep)" : "Password *"}</Label>
          <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
        </div>
        {user && (
          <div className="space-y-2 flex items-end sm:col-span-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              Active user
            </label>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : user ? "Update User" : "Create User"}</Button>
      </div>
    </form>
  );
}
