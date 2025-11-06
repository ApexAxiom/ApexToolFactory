import { DynamoDBClient, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

const ddb = new DynamoDBClient({});

interface CreateQuoteWithNumberArguments {
  vendorId: string;
  payload: string;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
}

interface AppSyncEvent {
  arguments: CreateQuoteWithNumberArguments;
  identity?: {
    sub?: string;
    username?: string;
  };
}

const quoteTable = process.env.QUOTE_TABLE_NAME;
const counterTable = process.env.DAILY_COUNTER_TABLE_NAME;

if (!quoteTable || !counterTable) {
  throw new Error('Missing table bindings for quote creation function');
}

function resolveOwnerId(event: AppSyncEvent): string {
  const ownerId = event.identity?.sub || event.identity?.username;
  if (!ownerId) {
    throw new Error('Unauthenticated request');
  }
  return ownerId;
}

function sequenceKey(ownerId: string, vendorId: string, date: string): string {
  return `${ownerId}#${vendorId}#${date}`;
}

export const handler = async (event: AppSyncEvent) => {
  const ownerId = resolveOwnerId(event);
  const { vendorId, payload, subtotal, taxTotal, grandTotal } = event.arguments;

  if (!vendorId) {
    throw new Error('vendorId is required');
  }
  if (typeof payload !== 'string' || !payload.length) {
    throw new Error('payload is required');
  }

  const today = new Date();
  const dateStamp = today.toISOString().slice(0, 10);
  const counterKey = sequenceKey(ownerId, vendorId, dateStamp);
  const timestamp = new Date().toISOString();

  const counterResult = await ddb.send(
    new UpdateItemCommand({
      TableName: counterTable,
      Key: marshall({ counterKey }),
      UpdateExpression:
        'SET #owner = if_not_exists(#owner, :owner), lastSequence = if_not_exists(lastSequence, :zero) + :step, updatedAt = :ts',
      ExpressionAttributeNames: {
        '#owner': 'owner'
      },
      ConditionExpression: 'attribute_not_exists(#owner) OR #owner = :owner',
      ExpressionAttributeValues: {
        ':owner': { S: ownerId },
        ':zero': { N: '0' },
        ':step': { N: '1' },
        ':ts': { S: timestamp }
      },
      ReturnValues: 'UPDATED_NEW'
    })
  );

  const rawSeq = counterResult.Attributes?.lastSequence;
  const sequenceValue = rawSeq?.N ? Number(rawSeq.N) : 0;
  const padded = sequenceValue.toString().padStart(3, '0');
  const quoteNumber = `Q${dateStamp.replace(/-/g, '')}-${padded}`;

  const quoteId = randomUUID();

  await ddb.send(
    new PutItemCommand({
      TableName: quoteTable,
      Item: marshall({
        id: quoteId,
        owner: ownerId,
        vendorId,
        quoteNumber,
        status: 'QUOTE',
        payload,
        subtotal,
        taxTotal,
        grandTotal,
        createdAt: timestamp,
        updatedAt: timestamp
      })
    })
  );

  return {
    id: quoteId,
    owner: ownerId,
    vendorId,
    quoteNumber,
    status: 'QUOTE',
    payload,
    subtotal,
    taxTotal,
    grandTotal,
    invoiceNumber: null,
    invoiceDate: null,
    convertedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
};
