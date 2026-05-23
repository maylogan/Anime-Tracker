import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const LoadingSkeleton = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-base p-4 animate-pulse">
          <div className="bg-dark-700 h-64 rounded-lg mb-4" />
          <div className="bg-dark-700 h-6 rounded w-3/4 mb-3" />
          <div className="bg-dark-700 h-4 rounded w-1/2 mb-4" />
          <div className="flex gap-2">
            <div className="bg-dark-700 h-6 rounded-full w-20" />
            <div className="bg-dark-700 h-6 rounded-full w-20" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const EmptyState = ({
  title = "No anime found",
  description = "Start by adding your first anime to your tracker",
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-accent-blue/10 border-2 border-accent-blue/30 flex items-center justify-center mb-4 mx-auto">
        <div className="w-8 h-8 rounded-full bg-accent-blue/20"></div>
      </div>
      <h3 className="text-2xl font-bold text-dark-50 mb-2">{title}</h3>
      <p className="text-dark-400 max-w-md">{description}</p>
    </motion.div>
  );
};

export const PaginationControls = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = "items",
}) => {
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [draftPage, setDraftPage] = useState(String(currentPage));

  useEffect(() => {
    setDraftPage(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      onPageChange(totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  if (!totalPages || totalPages <= 1) return null;

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const commitPage = () => {
    const parsed = Number.parseInt(draftPage, 10);
    const nextPage = Number.isNaN(parsed)
      ? currentPage
      : Math.min(totalPages, Math.max(1, parsed));

    setDraftPage(String(nextPage));
    setIsEditingPage(false);
    onPageChange(nextPage);
  };

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-dark-700 bg-dark-900/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-dark-300">
        Showing {startItem}-{endItem} of {totalItems} {itemLabel}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm font-semibold text-dark-50 transition-colors hover:border-accent-blue hover:text-accent-blue disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <div className="flex items-center gap-2 rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm font-semibold text-dark-300">
          <span>Page</span>
          {isEditingPage ? (
            <input
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              value={draftPage}
              onChange={(e) => setDraftPage(e.target.value.replace(/\D/g, ""))}
              onBlur={commitPage}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitPage();
                if (e.key === "Escape") {
                  setDraftPage(String(currentPage));
                  setIsEditingPage(false);
                }
              }}
              aria-label="Jump to page"
              className="w-14 rounded-md border border-dark-600 bg-dark-900 px-2 py-1 text-center text-dark-50 outline-none focus:border-accent-blue"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingPage(true)}
              className="rounded-md px-2 py-1 text-dark-50 transition-colors hover:text-accent-blue"
              aria-label={`Jump to page ${currentPage}`}
            >
              {currentPage}
            </button>
          )}
          <span>of {totalPages}</span>
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm font-semibold text-dark-50 transition-colors hover:border-accent-blue hover:text-accent-blue disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export const RatingStars = ({
  rating,
  onChange,
  interactive = false,
  size = "md",
}) => {
  const sizeClass =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-xl";

  return (
    <div className="flex gap-1">
      {Array.from({ length: 10 }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (interactive) onChange?.(i + 1);
          }}
          className={`${sizeClass} transition-all duration-200 ${
            interactive ? "cursor-pointer hover:scale-110" : "cursor-default"
          } ${i < rating ? "text-accent-orange" : "text-dark-600"}`}
          disabled={!interactive}
        >
          ★
        </button>
      ))}
    </div>
  );
};

export const Badge = ({ text, color = "purple", icon }) => {
  const colorClass = {
    purple: "badge-purple",
    pink: "badge-pink",
    cyan: "badge-cyan",
  }[color];

  return (
    <span className={colorClass}>
      {icon && <span className="mr-1">{icon}</span>}
      {text}
    </span>
  );
};

export const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="card-base w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-dark-800 border-b border-dark-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-3xl text-dark-400 hover:text-accent-blue transition-colors"
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </motion.div>
  );
};
