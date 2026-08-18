'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@jersey-commerce/ui';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  hideOnMobile?: boolean;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  loading?: boolean;
  empty?: string;
  rowHref?: (row: T) => string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  caption?: string;
}

export function DataTable<T>({
  columns,
  rows,
  loading,
  empty = 'No records found.',
  rowHref,
  page = 1,
  totalPages = 1,
  onPageChange,
  caption,
}: DataTableProps<T>): React.JSX.Element {
  return (
    <div className="rounded-lg border bg-background">
      <Table>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key} className={column.hideOnMobile ? `hidden md:table-cell ${column.className ?? ''}` : column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <TableRow key={`s-${index}`}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}
          {!loading && rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-10 text-center text-sm text-muted-foreground">
                {empty}
              </TableCell>
            </TableRow>
          ) : null}
          {!loading
            ? rows.map((row, index) => {
                const href = rowHref?.(row);
                return (
                  <TableRow key={index}>
                    {columns.map((column, columnIndex) => {
                      const content = column.render(row);
                      return (
                        <TableCell
                          key={column.key}
                          className={column.hideOnMobile ? `hidden md:table-cell ${column.className ?? ''}` : column.className}
                        >
                          {href && columnIndex === 0 ? (
                            <Link href={href} className="font-medium text-foreground underline-offset-4 hover:underline">
                              {content}
                            </Link>
                          ) : (
                            content
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            : null}
        </TableBody>
      </Table>
      {onPageChange ? (
        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
