import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../Button';

/**
 * Reusable Pagination component.
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  siblingCount = 1,
  totalItems,
  pageSize,
  className = '',
  ...rest
}) {
  const generatePageNumbers = () => {
    const pages = [];
    const totalNumbers = siblingCount * 2 + 3;
    const totalBlocks = totalNumbers + 2;

    if (totalPages <= totalBlocks) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, '...', totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;
      let rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + i + 1);
      return [firstPageIndex, '...', ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      let middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
      return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
    }

    return pages;
  };

  const pages = generatePageNumbers();

  const handlePrev = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <nav
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 w-full select-none ${className}`}
      aria-label="Pagination Navigation"
      {...rest}
    >
      {totalItems !== undefined && pageSize !== undefined && (
        <div className="text-xs text-[var(--color-text-secondary)]">
          Showing{' '}
          <span className="font-semibold text-[var(--color-text-primary)]">
            {Math.min((currentPage - 1) * pageSize + 1, totalItems)}
          </span>{' '}
          to{' '}
          <span className="font-semibold text-[var(--color-text-primary)]">
            {Math.min(currentPage * pageSize, totalItems)}
          </span>{' '}
          of <span className="font-semibold text-[var(--color-text-primary)]">{totalItems}</span> entries
        </div>
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={handlePrev}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
          aria-label="Previous Page"
        >
          Previous
        </Button>

        <div className="flex items-center gap-1 mx-1">
          {pages.map((page, idx) => {
            if (page === '...') {
              return (
                <span
                  key={`dots-${idx}`}
                  className="px-2 py-1 text-xs text-[var(--color-text-muted)] font-semibold select-none"
                >
                  ...
                </span>
              );
            }

            const isActive = page === currentPage;

            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange && onPageChange(page)}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  w-8 h-8 rounded-[var(--radius-md)] text-xs font-semibold flex items-center justify-center transition-all duration-150
                  ${isActive
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-hover)] border border-transparent hover:border-[var(--color-border-subtle)]'
                  }
                `}
              >
                {page}
              </button>
            );
          })}
        </div>

        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={handleNext}
          rightIcon={<ChevronRight className="w-4 h-4" />}
          aria-label="Next Page"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
