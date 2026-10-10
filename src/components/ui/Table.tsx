"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function TableContainer({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        clsx(
          "w-full overflow-hidden rounded-2xl border border-[#1b253b] bg-[#0c101a] shadow-xl shadow-black/40",
          className
        )
      )}
      {...props}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Table({
  className,
  children,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={twMerge(clsx("w-full text-left text-xs text-slate-300 border-collapse", className))}
      {...props}
    >
      {children}
    </table>
  );
}

export function TableHead({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={twMerge(
        clsx("bg-[#090d18] border-b border-[#1b253b] text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400", className)
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={twMerge(clsx("divide-y divide-[#1b253b]/60", className))} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({
  className,
  hoverable = true,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { hoverable?: boolean }) {
  return (
    <tr
      className={twMerge(
        clsx(
          "transition-colors",
          hoverable ? "hover:bg-slate-800/40" : "",
          className
        )
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeader({
  className,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={twMerge(clsx("px-4 py-3.5 whitespace-nowrap select-none", className))}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={twMerge(clsx("px-4 py-3.5 whitespace-nowrap align-middle", className))}
      {...props}
    >
      {children}
    </td>
  );
}

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
}

export function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: TablePaginationProps) {
  return (
    <div className="px-4 py-3 border-t border-[#1b253b] bg-[#090d18] flex items-center justify-between text-xs text-slate-400 font-mono">
      <div>
        {totalItems !== undefined && (
          <span>
            Showing{" "}
            <strong className="text-white font-medium">
              {Math.min((currentPage - 1) * (itemsPerPage || 10) + 1, totalItems)}
            </strong>{" "}
            to{" "}
            <strong className="text-white font-medium">
              {Math.min(currentPage * (itemsPerPage || 10), totalItems)}
            </strong>{" "}
            of <strong className="text-white font-medium">{totalItems}</strong> entries
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-[#1b253b] bg-[#0c101a] text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-2">
          Page {currentPage} of {Math.max(totalPages, 1)}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-[#1b253b] bg-[#0c101a] text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
