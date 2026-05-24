import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RowActionHandlers<T> {
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
}

interface RowActionsProps<T> {
  row: T;
  handlers: RowActionHandlers<T>;
  className?: string;
  stopPropagation?: boolean;
}

export function RowActions<T>({ row, handlers, className, stopPropagation = true }: RowActionsProps<T>) {
  const wrap = (fn?: (row: T) => void) => (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
    fn?.(row);
  };

  return (
    <div className={cn("flex items-center justify-end gap-0.5", className)} onClick={(e) => stopPropagation && e.stopPropagation()}>
      {handlers.onView && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={wrap(handlers.onView)} title="View">
          <Eye className="h-4 w-4" />
        </Button>
      )}
      {handlers.onEdit && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={wrap(handlers.onEdit)} title="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {handlers.onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[var(--color-destructive)] hover:text-[var(--color-destructive)]"
          onClick={wrap(handlers.onDelete)}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
