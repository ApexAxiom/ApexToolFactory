import { defineFunction } from '@aws-amplify/backend';
import { data } from '../../data/resource';

export const convertQuoteToInvoice = defineFunction({
  name: 'convert-quote-to-invoice',
  entry: './handler.ts',
  timeoutSeconds: 10,
  environment: {
    QUOTE_TABLE_NAME: data.resources.tables.Quote.tableName
  }
});

convertQuoteToInvoice.permissions.dynamodb({
  actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem'],
  resources: [data.resources.tables.Quote.arn]
});
