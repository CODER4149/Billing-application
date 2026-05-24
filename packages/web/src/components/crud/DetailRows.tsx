interface DetailRowsProps {
  rows: Array<[string, React.ReactNode]>;
}

export function DetailRows({ rows }: DetailRowsProps) {
  return (
    <div className="space-y-0 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 py-2.5 border-b border-[var(--color-border)] last:border-0">
          <span className="text-[var(--color-muted-foreground)] shrink-0">{label}</span>
          <span className="font-medium text-right capitalize">{value ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}
