import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Pagination({ page, totalPages, total, limit, onPageChange, onLimitChange, loading }) {
  const pages = totalPages || 1;
  const currentPage = Math.max(1, Math.min(page, pages));

  const getVisiblePages = () => {
    const visible = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(pages, currentPage + 2);
    for (let i = start; i <= end; i++) visible.push(i);
    return visible;
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2 py-3">
      <div className="text-sm text-muted-foreground">
        {total !== undefined && (
          <span>
            Showing page <strong>{currentPage}</strong> of <strong>{pages}</strong>
            {total > 0 && <span className="ml-1">({total.toLocaleString()} total records)</span>}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onLimitChange && (
          <div className="flex items-center gap-2 mr-4">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Per page:</span>
            <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1 || loading} onClick={() => onPageChange(1)}>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1 || loading} onClick={() => onPageChange(currentPage - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1">
          {getVisiblePages().map((p) => (
            <Button
              key={p}
              variant={p === currentPage ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 text-xs"
              disabled={loading}
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= pages || loading} onClick={() => onPageChange(currentPage + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= pages || loading} onClick={() => onPageChange(pages)}>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
