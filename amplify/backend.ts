import { defineBackend, a } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { createQuoteWithNumber } from './functions/createQuoteWithNumber/resource';
import { convertQuoteToInvoice } from './functions/convertQuoteToInvoice/resource';
import { storage } from './storage/resource';

export const backend = defineBackend({
  auth,
  data,
  createQuoteWithNumber,
  convertQuoteToInvoice,
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
    .authorization((allow) => [allow.owner()])
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
    .authorization((allow) => [allow.owner()])
    .handler(a.handler.function(convertQuoteToInvoice))
);
