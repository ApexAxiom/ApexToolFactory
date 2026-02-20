import { DynamoDBClient, PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

const ddb = new DynamoDBClient({});

interface BackfillArguments {
  organizationId?: string | null;
  limit?: number | null;
}

interface BackfillEvent {
  arguments?: BackfillArguments;
}

const quoteTable = process.env.QUOTE_TABLE_NAME;
const quoteRevisionTable = process.env.QUOTE_REVISION_TABLE_NAME;
const quoteLineTable = process.env.QUOTE_LINE_TABLE_NAME;
const quoteAttachmentTable = process.env.QUOTE_ATTACHMENT_TABLE_NAME;

if (!quoteTable || !quoteRevisionTable || !quoteLineTable || !quoteAttachmentTable) {
  throw new Error('Missing table bindings for quote normalization backfill');
}

function numberValue(input: unknown): number {
  const parsed = Number(input ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePayload(payload: unknown): Record<string, unknown> {
  if (typeof payload !== 'string' || !payload.trim()) return {};
  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function revisionExists(quoteId: string): Promise<boolean> {
  const result = await ddb.send(
    new ScanCommand({
      TableName: quoteRevisionTable,
      FilterExpression: 'quoteId = :quoteId',
      ExpressionAttributeValues: {
        ':quoteId': { S: quoteId }
      },
      Limit: 1
    })
  );
  return Boolean(result.Items?.length);
}

async function createRevision(params: {
  organizationId: string;
  quoteId: string;
  payload: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  revisedAt: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  await ddb.send(
    new PutItemCommand({
      TableName: quoteRevisionTable,
      Item: marshall({
        id: randomUUID(),
        organizationId: params.organizationId,
        quoteId: params.quoteId,
        revisionNumber: 1,
        payload: params.payload,
        subtotal: params.subtotal,
        taxTotal: params.taxTotal,
        grandTotal: params.grandTotal,
        revisedBy: null,
        revisedAt: params.revisedAt,
        notes: 'Server-side backfill from legacy payload',
        createdAt: nowIso,
        updatedAt: nowIso
      }),
      ConditionExpression: 'attribute_not_exists(id)'
    })
  );
}

async function createLine(params: {
  organizationId: string;
  quoteId: string;
  subtotal: number;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  await ddb.send(
    new PutItemCommand({
      TableName: quoteLineTable,
      Item: marshall({
        id: randomUUID(),
        organizationId: params.organizationId,
        quoteId: params.quoteId,
        lineNumber: 1,
        description: 'Legacy subtotal',
        qty: 1,
        unitPrice: params.subtotal,
        costBasis: 0,
        lineTotal: params.subtotal,
        createdAt: nowIso,
        updatedAt: nowIso
      }),
      ConditionExpression: 'attribute_not_exists(id)'
    })
  );
}

async function createAttachments(params: {
  organizationId: string;
  quoteId: string;
  payloadObj: Record<string, unknown>;
  fallbackTimestamp: string;
}): Promise<void> {
  const rawAttachments = params.payloadObj.attachments;
  if (!Array.isArray(rawAttachments)) return;
  for (const entry of rawAttachments) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const key = typeof record.key === 'string' ? record.key : '';
    if (!key) continue;
    const nowIso = new Date().toISOString();
    await ddb.send(
      new PutItemCommand({
        TableName: quoteAttachmentTable,
        Item: marshall({
          id: randomUUID(),
          organizationId: params.organizationId,
          quoteId: params.quoteId,
          storageKey: key,
          fileName: typeof record.fileName === 'string' ? record.fileName : null,
          mimeType: typeof record.contentType === 'string' ? record.contentType : null,
          size: numberValue(record.size),
          capturedAt:
            typeof record.uploadedAt === 'string' && record.uploadedAt
              ? record.uploadedAt
              : params.fallbackTimestamp,
          capturedBy: null,
          createdAt: nowIso,
          updatedAt: nowIso
        }),
        ConditionExpression: 'attribute_not_exists(id)'
      })
    );
  }
}

export const handler = async (event: BackfillEvent) => {
  const organizationIdArg = event?.arguments?.organizationId || null;
  const limitArg = numberValue(event?.arguments?.limit ?? 500);
  const limit = Math.max(1, Math.min(1000, Math.floor(limitArg)));

  const scanParams: any = {
    TableName: quoteTable,
    Limit: limit
  };
  if (organizationIdArg) {
    scanParams.FilterExpression = 'organizationId = :organizationId';
    scanParams.ExpressionAttributeValues = {
      ':organizationId': { S: organizationIdArg }
    };
  }

  const quotesResult = await ddb.send(new ScanCommand(scanParams));
  const items = (quotesResult.Items || []).map((item) => unmarshall(item));

  let scanned = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const quote of items) {
    scanned += 1;
    const quoteId = typeof quote.id === 'string' ? quote.id : '';
    if (!quoteId) {
      skipped += 1;
      continue;
    }
    try {
      const exists = await revisionExists(quoteId);
      if (exists) {
        skipped += 1;
        continue;
      }

      const organizationId =
        (typeof quote.organizationId === 'string' && quote.organizationId) ||
        organizationIdArg ||
        'default-org';
      const payload = typeof quote.payload === 'string' ? quote.payload : '{}';
      const payloadObj = parsePayload(payload);
      const revisedAt = new Date().toISOString();
      const subtotal = numberValue(quote.subtotal);
      const taxTotal = numberValue(quote.taxTotal);
      const grandTotal = numberValue(quote.grandTotal);

      await createRevision({
        organizationId,
        quoteId,
        payload,
        subtotal,
        taxTotal,
        grandTotal,
        revisedAt
      });
      await createLine({
        organizationId,
        quoteId,
        subtotal
      });
      await createAttachments({
        organizationId,
        quoteId,
        payloadObj,
        fallbackTimestamp: revisedAt
      });

      migrated += 1;
    } catch (err: any) {
      failed += 1;
      errors.push(`${quoteId}: ${err?.message || String(err)}`);
    }
  }

  return JSON.stringify({
    scanned,
    migrated,
    skipped,
    failed,
    errors: errors.slice(0, 100)
  });
};
