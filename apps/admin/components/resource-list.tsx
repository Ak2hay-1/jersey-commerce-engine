'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Input } from '@jersey-commerce/ui';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import { PageHeader } from '@/components/page-header';
import { queryString } from '@/lib/api';
import { usePagedResource } from '@/lib/use-paged-resource';

interface ResourceListProps<T> {
  title: string;
  description?: string;
  path: string;
  columns: Array<DataTableColumn<T>>;
  rowHref?: (row: T) => string;
  searchKey?: string;
  extraQuery?: Record<string, string | undefined>;
  actions?: ReactNode;
  empty?: string;
}

export function ResourceList<T>({
  title,
  description,
  path,
  columns,
  rowHref,
  searchKey = 'search',
  extraQuery,
  actions,
  empty,
}: ResourceListProps<T>): React.JSX.Element {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const extraKey = JSON.stringify(extraQuery ?? {});
  const qs = useMemo(
    () =>
      queryString({
        page,
        pageSize: 20,
        [searchKey]: search || undefined,
        ...(JSON.parse(extraKey) as Record<string, string | undefined>),
      }),
    [extraKey, page, search, searchKey],
  );
  const { data, loading, error } = usePagedResource<T>(`${path}${qs}`);

  return (
    <div className="space-y-4">
      <PageHeader title={title} description={description} actions={actions} />
      <Input
        aria-label="Search"
        placeholder="Search"
        value={search}
        onChange={(event) => {
          setPage(1);
          setSearch(event.target.value);
        }}
        className="max-w-sm"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        loading={loading}
        empty={empty}
        rowHref={rowHref}
        page={data?.meta.page ?? page}
        totalPages={data?.meta.totalPages ?? 1}
        onPageChange={setPage}
        caption={title}
      />
    </div>
  );
}
