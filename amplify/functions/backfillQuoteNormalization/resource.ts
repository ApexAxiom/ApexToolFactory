import { defineFunction } from '@aws-amplify/backend';
import { data } from '../../data/resource';

export const backfillQuoteNormalization = defineFunction({
  name: 'backfill-quote-normalization',
  entry: './handler.ts',
  timeoutSeconds: 60,
  environment: {
    QUOTE_TABLE_NAME: data.resources.tables.Quote.tableName,
    QUOTE_REVISION_TABLE_NAME: data.resources.tables.QuoteRevision.tableName,
    QUOTE_LINE_TABLE_NAME: data.resources.tables.QuoteLine.tableName,
    QUOTE_ATTACHMENT_TABLE_NAME: data.resources.tables.QuoteAttachment.tableName
  }
});

backfillQuoteNormalization.permissions.dynamodb({
  actions: ['dynamodb:Scan', 'dynamodb:GetItem', 'dynamodb:PutItem'],
  resources: [
    data.resources.tables.Quote.arn,
    data.resources.tables.QuoteRevision.arn,
    data.resources.tables.QuoteLine.arn,
    data.resources.tables.QuoteAttachment.arn
  ]
});
