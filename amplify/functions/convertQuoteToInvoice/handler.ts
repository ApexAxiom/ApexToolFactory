import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient({});

interface ConvertQuoteArguments {
  quoteId: string;
  invoiceNumber: string;
  invoiceDate: string;
}

interface AppSyncEvent {
  arguments: ConvertQuoteArguments;
  identity?: {
    sub?: string;
    username?: string;
  };
}

const quoteTable = process.env.QUOTE_TABLE_NAME;

if (!quoteTable) {
  throw new Error('Missing table binding for quote conversion function');
}

function resolveOwnerId(event: AppSyncEvent): string {
  const ownerId = event.identity?.sub || event.identity?.username;
  if (!ownerId) {
    throw new Error('Unauthenticated request');
  }
  return ownerId;
}

export const handler = async (event: AppSyncEvent) => {
  const ownerId = resolveOwnerId(event);
  const { quoteId, invoiceNumber, invoiceDate } = event.arguments;

  if (!quoteId) {
    throw new Error('quoteId is required');
  }
  if (!invoiceNumber) {
    throw new Error('invoiceNumber is required');
  }
  if (!invoiceDate) {
    throw new Error('invoiceDate is required');
  }

  const timestamp = new Date().toISOString();

  const response = await ddb.send(
    new UpdateItemCommand({
      TableName: quoteTable,
      Key: { id: { S: quoteId } },
      UpdateExpression:
        'SET #status = :invoice, invoiceNumber = :invoiceNumber, invoiceDate = :invoiceDate, convertedAt = :convertedAt, updatedAt = :updatedAt',
      ConditionExpression: 'attribute_exists(id) AND #owner = :owner',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#owner': 'owner'
      },
      ExpressionAttributeValues: {
        ':invoice': { S: 'INVOICE' },
        ':invoiceNumber': { S: invoiceNumber },
        ':invoiceDate': { S: invoiceDate },
        ':convertedAt': { S: timestamp },
        ':updatedAt': { S: timestamp },
        ':owner': { S: ownerId }
      },
      ReturnValues: 'ALL_NEW'
    })
  );

  if (!response.Attributes) {
    throw new Error('Quote not found');
  }

  return unmarshall(response.Attributes);
};
