import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  IndianRupee, TrendingUp, Clock, Receipt, Calendar,
  AlertTriangle, FileText, Droplets, Wallet, RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { KPICard } from "@/components/dashboard/KPICard";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, Skeleton } from "@/components/ui/input";
import { api } from "@/services/api";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#60a5fa", "#818cf8", "#a78bfa", "#fbbf24", "#fb923c", "#22c55e", "#ef4444", "#94a3b8"];

const SERVICE_LABELS: Record<string, string> = {
  drilling: "Drilling",
  pvc_pipe: "PVC Pipe",
  transportation: "Transportation",
  flushing: "Flushing",
  casing: "Casing",
  pump: "Pump",
  other: "Other",
};

export function DashboardPage() {
  const [kpis, setKpis] = useState<Record<string, number> | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<Array<{ period: string; revenue: number; collected: number }>>([]);
  const [statusDist, setStatusDist] = useState<Array<{ status: string; count: number; amount: number }>>([]);
  const [serviceSplit, setServiceSplit] = useState<Array<{ service_type: string; revenue: number }>>([]);
  const [topClients, setTopClients] = useState<Array<{ name: string; revenue: number; pending: number }>>([]);
  const [pendingAging, setPendingAging] = useState<Array<{ bucket: string; amount: number; count: number }>>([]);
  const [period, setPeriod] = useState("monthly");
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const [k, rt, sd, ss, tc, pa] = await Promise.all([
      api.dashboard.getKpis(),
      api.dashboard.revenueTrend(period),
      api.dashboard.statusDistribution(),
      api.dashboard.serviceSplit(),
      api.dashboard.topClients(),
      api.dashboard.pendingAging(),
    ]);
    setKpis(k);
    setRevenueTrend(rt.reverse());
    setStatusDist(sd);
    setServiceSplit(ss.map((s) => ({ ...s, name: SERVICE_LABELS[s.service_type] ?? s.service_type })));
    setTopClients(tc);
    setPendingAging(pa);
  };

  useEffect(() => { loadData(); }, [period]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await api.dashboard.refresh();
    await loadData();
    setRefreshing(false);
  };

  if (!kpis) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-[var(--color-muted-foreground)]">Real-time business overview</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard title="Total Revenue" value={kpis.totalRevenue} icon={IndianRupee} color="#60a5fa" delay={0} />
        <KPICard title="Total Pending" value={kpis.totalPending} icon={Clock} color="#fbbf24" delay={0.05} />
        <KPICard title="Total Paid" value={kpis.totalPaid} icon={Wallet} color="#22c55e" delay={0.1} />
        <KPICard title="GST Collected" value={kpis.gstCollected} icon={Receipt} color="#818cf8" delay={0.15} />
        <KPICard title="Today's Billing" value={kpis.todayBilling} icon={Calendar} color="#a78bfa" delay={0.2} />
        <KPICard title="Monthly Revenue" value={kpis.monthlyRevenue} icon={TrendingUp} color="#60a5fa" delay={0.25} trend={12} />
        <KPICard title="Overdue Amount" value={kpis.overdueAmount} icon={AlertTriangle} color="#ef4444" delay={0.3} />
        <KPICard title="Avg Invoice Value" value={kpis.averageInvoiceValue} icon={FileText} color="#94a3b8" delay={0.35} />
        <KPICard title="Total Jobs" value={kpis.totalJobs} icon={Droplets} format="number" color="#06b6d4" delay={0.4} />
        <KPICard title="Profit Estimate" value={kpis.profitEstimate} icon={IndianRupee} color="#22c55e" delay={0.45} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Revenue Trend</CardTitle>
              <div className="flex gap-1">
                {["daily", "weekly", "monthly", "yearly"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                      period === p ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="revenue" stroke="#60a5fa" fill="url(#revenueGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="collected" stroke="#22c55e" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Invoice Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusDist}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                >
                  {statusDist.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Legend formatter={(v) => v.replace(/_/g, " ")} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Service Revenue Split</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={serviceSplit} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={90} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="revenue" fill="#818cf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pending Aging Analysis</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pendingAging}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="amount" fill="#fbbf24" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top Clients</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="py-2 text-left font-medium text-[var(--color-muted-foreground)]">Client</th>
                  <th className="py-2 text-right font-medium text-[var(--color-muted-foreground)]">Revenue</th>
                  <th className="py-2 text-right font-medium text-[var(--color-muted-foreground)]">Pending</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((client, i) => (
                  <motion.tr
                    key={client.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-accent)]/30"
                  >
                    <td className="py-3 font-medium">{client.name}</td>
                    <td className="py-3 text-right text-[var(--color-success)]">{formatCurrency(client.revenue)}</td>
                    <td className="py-3 text-right text-[var(--color-warning)]">{formatCurrency(client.pending)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
