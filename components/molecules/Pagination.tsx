import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  rowsPerPage?: number;
  totalRows?: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  rowsPerPage = 10,
  totalRows = 0,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const startRow = (currentPage - 1) * rowsPerPage + 1;
  const endRow = Math.min(currentPage * rowsPerPage, totalRows);

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRowsPerPage = parseInt(event.target.value);
    onRowsPerPageChange?.(newRowsPerPage);
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-coal-700 bg-claude-surface dark:bg-coal-850">
      {rowsPerPage && totalRows && onRowsPerPageChange ? (
        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-600 dark:text-coal-400">
            Rows per page:
          </span>
          <select
            value={rowsPerPage}
            onChange={handleRowsPerPageChange}
            className="border border-slate-300 dark:border-coal-600 bg-claude-surface dark:bg-coal-700 text-claude-ink dark:text-coal-100 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={60}>60</option>
          </select>
          <span className="text-sm text-slate-600 dark:text-coal-400">
            {startRow}-{endRow} of {totalRows}
          </span>
        </div>
      ) : (
        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-600 dark:text-coal-400">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm border border-slate-300 dark:border-coal-600 bg-claude-surface dark:bg-coal-700 text-claude-ink dark:text-coal-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-coal-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          Previous
        </button>
        
        <div className="flex items-center space-x-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // Show first page, last page, current page, and pages around current page
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`px-3 py-1 text-sm rounded-md ${
                    page === currentPage
                      ? 'bg-blue-600 dark:bg-blue-500 text-coal-100'
                      : 'border border-slate-300 dark:border-coal-600 bg-claude-surface dark:bg-coal-700 text-claude-ink dark:text-coal-100 hover:bg-slate-50 dark:hover:bg-coal-600'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400`}
                >
                  {page}
                </button>
              );
            } else if (
              page === currentPage - 2 ||
              page === currentPage + 2
            ) {
              return <span key={page} className="px-2 text-slate-400 dark:text-coal-500">...</span>;
            }
            return null;
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm border border-slate-300 dark:border-coal-600 bg-claude-surface dark:bg-coal-700 text-claude-ink dark:text-coal-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-coal-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        >
          Next
        </button>
      </div>
    </div>
  );
};
