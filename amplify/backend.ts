import { defineBackend, a } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { createQuoteWithNumber } from './functions/createQuoteWithNumber/resource';
import { convertQuoteToInvoice } from './functions/convertQuoteToInvoice/resource';
import { backfillQuoteNormalization } from './functions/backfillQuoteNormalization/resource';
import { storage } from './storage/resource';

const TEAM_GROUPS = ['Owner', 'OfficeManager', 'Estimator', 'Technician', 'Accounting'];

export const backend = defineBackend({
  auth,
  data,
  createQuoteWithNumber,
  convertQuoteToInvoice,
  backfillQuoteNormalization,
  storage
});

data.addMutation(
  'createQuoteWithNumber',
  a
    .mutation()
    .arguments({
      vendorId: a.id().required(),
      clientId: a.id().required(),
      clientName: a.string(),
      payload: a.string().required(),
      subtotal: a.float().required(),
      taxTotal: a.float().required(),
      grandTotal: a.float().required()
    })
    .returns(a.ref('Quote'))
    .authorization((allow) => [allow.owner(), allow.groups(TEAM_GROUPS)])
    .handler(a.handler.function(createQuoteWithNumber))
);

data.addMutation(
  'convertQuoteToInvoice',
  a
    .mutation()
    .arguments({
      quoteId: a.id().required(),
      invoiceNumber: a.string().required(),
      invoiceDate: a.datetime().required()
    })
    .returns(a.ref('Quote'))
    .authorization((allow) => [allow.owner(), allow.groups(TEAM_GROUPS)])
    .handler(a.handler.function(convertQuoteToInvoice))
);

data.addMutation(
  'runQuoteNormalizationBackfill',
  a
    .mutation()
    .arguments({
      organizationId: a.string(),
      limit: a.integer()
    })
    .returns(a.string())
    .authorization((allow) => [allow.owner(), allow.groups(TEAM_GROUPS)])
    .handler(a.handler.function(backfillQuoteNormalization))
);
