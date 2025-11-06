import { defineFunction } from '@aws-amplify/backend';
import { data } from '../../data/resource';

export const createQuoteWithNumber = defineFunction({
  name: 'create-quote-with-number',
  entry: './handler.ts',
  timeoutSeconds: 10,
  environment: {
    QUOTE_TABLE_NAME: data.resources.tables.Quote.tableName,
    DAILY_COUNTER_TABLE_NAME: data.resources.tables.DailyCounter.tableName
  }
});

createQuoteWithNumber.permissions.dynamodb({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem'],
  resources: [
    data.resources.tables.Quote.arn,
    data.resources.tables.DailyCounter.arn
  ]
});
