import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/input";
import { api } from "@/services/api";
import { formatCurrency } from "@/lib/utils";

export function GstReportsPage() {
  const [summary, setSummary] = useState<Array<Record<string, unknown>>>([]);
  const year = new Date().getFullYear().toString();

  useEffect(() => {
    api.gst.summary(year).then(setSummary);
  }, [year]);

  interface GstTotals { taxable: number; cgst: number; sgst: number; igst: number; totalTax: number }

  const totals = summary.reduce<GstTotals>(
    (acc, row) => ({
      taxable: acc.taxable + Number(row.taxable ?? 0),
      cgst: acc.cgst + Number(row.cgst ?? 0),
      sgst: acc.sgst + Number(row.sgst ?? 0),
      igst: acc.igst + Number(row.igst ?? 0),
      totalTax: acc.totalTax + Number(row.total_tax ?? 0),
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, totalTax: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">GST Reports</h1>
        <p className="text-[var(--color-muted-foreground)]">Tax summary for FY {year}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Taxable Amount", value: totals.taxable },
          { label: "CGST", value: totals.cgst },
          { label: "SGST", value: totals.sgst },
          { label: "IGST", value: totals.igst },
          { label: "Total Tax", value: totals.totalTax },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">{item.label}</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(item.value)}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Monthly GST Breakdown</CardTitle></CardHeader>
        <CardContent>
          {summary.length === 0 ? (
            <p className="text-center py-12 text-[var(--color-muted-foreground)]">No GST records for this year</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={summary}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="cgst" name="CGST" fill="#60a5fa" stackId="a" />
                <Bar dataKey="sgst" name="SGST" fill="#818cf8" stackId="a" />
                <Bar dataKey="igst" name="IGST" fill="#a78bfa" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
