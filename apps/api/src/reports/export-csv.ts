import { StreamableFile } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { AUDIT_ACTIONS } from '../audit/audit-actions';
import type { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../common/context/request-context';

export interface CsvColumn<T> {
  key: string;
  header: string;
  value: (row: T) => string | number | null | undefined;
}

export function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function toCsv<T>(columns: Array<CsvColumn<T>>, rows: T[]): string {
  const header = columns.map((column) => csvEscape(column.header)).join(',');
  const body = rows.map((row) => columns.map((column) => csvEscape(column.value(row))).join(','));
  return [header, ...body].join('\r\n');
}

export function csvFile(filename: string, csv: string): StreamableFile {
  const file = new StreamableFile(Buffer.from(csv, 'utf8'), {
    type: 'text/csv; charset=utf-8',
    disposition: `attachment; filename="${filename}"`,
  });
  return file;
}

export async function auditExport(
  audit: AuditService,
  actor: AuthPrincipal,
  report: string,
  filters: Record<string, unknown>,
  rowCount: number,
): Promise<void> {
  await audit.log({
    action: AUDIT_ACTIONS.REPORT_EXPORTED,
    tenantId: actor.tenantId,
    userId: actor.userId,
    entity: 'Report',
    entityId: report,
    metadata: { report, format: 'csv', filters: filters as Prisma.InputJsonValue, rowCount },
  });
}
