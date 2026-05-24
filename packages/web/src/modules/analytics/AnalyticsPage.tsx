import { useEffect, useState } from "react";
import { DashboardPage } from "@/modules/dashboard/DashboardPage";

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-[var(--color-muted-foreground)]">Extended business intelligence and trends</p>
      </div>
      <ExtendedAnalytics />
    </div>
  );
}

function ExtendedAnalytics() {
  const [borewellStats, setBorewellStats] = useState({ totalDepth: 0, avgDepth: 0, successRate: 0, revenuePerFoot: 0 });

  useEffect(() => {
    async function load() {
      const jobs = await window.api?.borewell.list() ?? [];
      const totalDepth = jobs.reduce((s: number, j: Record<string, unknown>) => s + (j.total_depth as number ?? 0), 0);
      const successCount = jobs.filter((j: Record<string, unknown>) => j.water_success).length;
      const totalCost = jobs.reduce((s: number, j: Record<string, unknown>) => s + (j.drilling_cost as number ?? 0), 0);
      setBorewellStats({
        totalDepth,
        avgDepth: jobs.length ? totalDepth / jobs.length : 0,
        successRate: jobs.length ? (successCount / jobs.length) * 100 : 0,
        revenuePerFoot: totalDepth ? totalCost / totalDepth : 0,
      });
    }
    load();
  }, []);

  const cards = [
    { label: "Total Feet Drilled", value: `${borewellStats.totalDepth.toFixed(0)} ft` },
    { label: "Average Depth", value: `${borewellStats.avgDepth.toFixed(0)} ft` },
    { label: "Water Success Rate", value: `${borewellStats.successRate.toFixed(1)}%` },
    { label: "Revenue per Foot", value: `₹${borewellStats.revenuePerFoot.toFixed(0)}` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-xl p-5">
            <p className="text-sm text-[var(--color-muted-foreground)]">{c.label}</p>
            <p className="text-2xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
      <DashboardPage />
    </div>
  );
}
