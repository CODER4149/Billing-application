import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { RowActions, type RowActionHandlers } from "./RowActions";
import { StatusPill } from "./StatusPill";

export interface ResourceTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: ColumnDef<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  statusKey?: keyof T;
  createdAtKey?: keyof T;
  updatedAtKey?: keyof T;
  rowActions?: RowActionHandlers<T>;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  pageSize?: number;
  toolbarExtra?: React.ReactNode;
}

export function ResourceTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  searchPlaceholder = "Search...",
  rowActions,
  onRowClick,
  emptyMessage = "No records found",
  pageSize = 10,
  toolbarExtra,
}: ResourceTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const isMobile = useIsMobile();

  const allColumns = useMemo(() => {
    if (!rowActions) return columns;
    return [
      ...columns,
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => <RowActions row={row.original} handlers={rowActions} />,
        enableSorting: false,
      } as ColumnDef<T>,
    ];
  }, [columns, rowActions]);

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex h-10 w-full rounded-xl border border-[var(--color-input)] bg-[var(--color-background)] pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          />
        </div>
        {toolbarExtra}
      </div>

      {isMobile ? (
        <div className="space-y-3">
          {rows.length === 0 ? (
            <div className="glass rounded-xl py-12 text-center text-sm text-[var(--color-muted-foreground)]">
              {emptyMessage}
            </div>
          ) : (
            rows.map((row) => {
              const record = row.original;
              const status = record.status as string | undefined;
              const created = record.created_at as string | undefined;
              const updated = record.updated_at as string | undefined;
              return (
                <div
                  key={row.id}
                  className={cn(
                    "glass rounded-xl p-4 space-y-3 transition-shadow hover:shadow-md",
                    onRowClick && "cursor-pointer active:scale-[0.99]"
                  )}
                  onClick={() => onRowClick?.(record)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      {row.getVisibleCells()
                        .filter((cell) => cell.column.id !== "actions")
                        .slice(0, 2)
                        .map((cell) => (
                          <div key={cell.id} className="text-sm">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        ))}
                    </div>
                    {status && <StatusPill status={status} />}
                  </div>
                  {(created || updated) && (
                    <div className="text-xs text-[var(--color-muted-foreground)] flex gap-3">
                      {created && <span>Created {formatDate(created)}</span>}
                      {updated && updated !== created && <span>Updated {formatDate(updated)}</span>}
                    </div>
                  )}
                  {rowActions && (
                    <div className="flex justify-end pt-1 border-t border-[var(--color-border)]">
                      <RowActions row={record} handlers={rowActions} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden border border-[var(--color-border)]/60">
          <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--color-card)]/95 backdrop-blur border-b border-[var(--color-border)]">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th key={header.id} className="h-11 px-4 text-left font-medium text-[var(--color-muted-foreground)] whitespace-nowrap">
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            className="flex items-center gap-1 hover:text-[var(--color-foreground)]"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> :
                             header.column.getIsSorted() === "desc" ? <ChevronDown className="h-3.5 w-3.5" /> :
                             <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />}
                          </button>
                        ) : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={allColumns.length} className="h-32 text-center text-[var(--color-muted-foreground)]">
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-[var(--color-border)]/60 transition-colors hover:bg-[var(--color-accent)]/40",
                        onRowClick && "cursor-pointer"
                      )}
                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--color-muted-foreground)]">
        <span>
          {filteredCount} record{filteredCount !== 1 ? "s" : ""}
          {globalFilter ? " (filtered)" : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <span className="px-2 tabular-nums">
            {table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
          </span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
