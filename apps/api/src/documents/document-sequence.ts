import { asTx } from '../prisma/as-tx';

export const DOCUMENT_TYPES = {
  SALE_INVOICE: 'SALE_INVOICE',
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  ORDER: 'ORDER',
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

export const DOCUMENT_SEQUENCE_DEFAULTS: Record<DocumentType, { prefix: string; padLength: number }> = {
  SALE_INVOICE: { prefix: 'INV', padLength: 6 },
  PURCHASE_ORDER: { prefix: 'PO', padLength: 6 },
  ORDER: { prefix: 'ORD', padLength: 6 },
};

/**
 * Allocates the next document number under a row lock. Prefix and pad length live on
 * DocumentSequence so tenants can change them later without a code deploy.
 */
export async function nextDocumentNumber(
  tx: object,
  tenantId: string,
  documentType: DocumentType,
): Promise<string> {
  const client = asTx(tx);
  const defaults = DOCUMENT_SEQUENCE_DEFAULTS[documentType];
  let rows = await client.$queryRaw<
    Array<{ id: string; prefix: string; next_number: number; pad_length: number }>
  >`
    SELECT id, prefix, next_number, pad_length
    FROM document_sequences
    WHERE tenant_id = ${tenantId} AND document_type = ${documentType}
    FOR UPDATE
  `;
  if (!rows[0]) {
    try {
      await client.documentSequence.create({
        data: {
          tenantId,
          documentType,
          prefix: defaults.prefix,
          nextNumber: 1,
          padLength: defaults.padLength,
        },
      });
    } catch {
      // Concurrent first-document insert; lock the winner next.
    }
    rows = await client.$queryRaw`
      SELECT id, prefix, next_number, pad_length
      FROM document_sequences
      WHERE tenant_id = ${tenantId} AND document_type = ${documentType}
      FOR UPDATE
    `;
  }
  const sequence = rows[0];
  if (!sequence) {
    throw new Error(`${documentType} sequence could not be allocated.`);
  }
  const documentNumber = `${sequence.prefix}-${String(sequence.next_number).padStart(sequence.pad_length, '0')}`;
  await client.documentSequence.update({
    where: { id: sequence.id },
    data: { nextNumber: sequence.next_number + 1 },
  });
  return documentNumber;
}
