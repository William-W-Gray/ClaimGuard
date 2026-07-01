import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 50] as const;

interface UsePaginationResult<T> {
  page: number;
  pageSize: number;
  pageItems: T[];
  totalItems: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

/**
 * Client-side pagination over an in-memory list.
 * Keeps page in range whenever the source data or page size changes.
 */
export function usePagination<T>(items: T[], initialPageSize = 10): UsePaginationResult<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Clamp the current page if data shrank (e.g. after filtering).
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const setPageSize = (size: number) => {
    setPageSizeRaw(size);
    setPage(1);
  };

  return {
    page: safePage,
    pageSize,
    pageItems,
    totalItems,
    totalPages,
    setPage: (p) => setPage(Math.min(Math.max(1, p), totalPages)),
    setPageSize,
  };
}

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: readonly number[];
  /** Noun shown in the summary, e.g. "claim" → "1–10 of 42 claims" */
  itemLabel?: string;
  className?: string;
}

/** Build a compact list of page tokens with ellipses for large ranges. */
function getPageTokens(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const tokens: Array<number | 'ellipsis'> = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  if (left > 2) tokens.push('ellipsis');
  for (let p = left; p <= right; p++) tokens.push(p);
  if (right < total - 1) tokens.push('ellipsis');

  tokens.push(total);
  return tokens;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  itemLabel = 'item',
  className,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const tokens = getPageTokens(page, totalPages);

  return (
    <nav
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-gray-100',
        className
      )}
      aria-label="Pagination"
    >
      {/* Summary + page size */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-500">
          Showing <span className="font-semibold text-gray-700">{start}</span>–
          <span className="font-semibold text-gray-700">{end}</span> of{' '}
          <span className="font-semibold text-gray-700">{totalItems}</span> {itemLabel}
          {totalItems !== 1 ? 's' : ''}
        </span>

        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="hidden sm:inline">Rows per page</span>
          <select
            className="form-select py-1 pl-2 pr-7 text-xs w-auto"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {tokens.map((token, idx) =>
          token === 'ellipsis' ? (
            <span key={`e-${idx}`} className="px-1.5 text-xs text-gray-400 select-none">
              …
            </span>
          ) : (
            <button
              key={token}
              onClick={() => onPageChange(token)}
              aria-current={token === page ? 'page' : undefined}
              className={cn(
                'inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg text-xs font-medium transition-colors',
                token === page
                  ? 'bg-brand-navy text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {token}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
