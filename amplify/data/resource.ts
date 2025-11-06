import { defineData, a } from '@aws-amplify/backend';

export const data = defineData({
  schema: a
    .schema({
      QuoteStatus: a.enum(['QUOTE', 'INVOICE']),
      Vendor: a
        .model({
          id: a.id().required(),
          name: a.string().required(),
          contactEmail: a.string(),
          contactPhone: a.string(),
          notes: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization((allow) => [allow.owner()]),
      Quote: a
        .model({
          id: a.id().required(),
          vendorId: a.string().required(),
          quoteNumber: a.string().required(),
          status: a.ref('QuoteStatus').required(),
          payload: a.string().required(),
          subtotal: a.float().required(),
          taxTotal: a.float().required(),
          grandTotal: a.float().required(),
          invoiceNumber: a.string(),
          invoiceDate: a.datetime(),
          convertedAt: a.datetime(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization((allow) => [allow.owner()])
        .secondaryIndexes((index) => [
          index('byVendor', {
            sortKey: 'createdAt',
            queryField: 'quotesByVendor'
          }),
          index('byQuoteNumber', {
            sortKey: 'createdAt',
            queryField: 'quoteByNumber'
          })
        ]),
      DailyCounter: a
        .model({
          counterKey: a.string().required(),
          lastSequence: a.integer().required(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .identifier(['counterKey'])
        .authorization((allow) => [allow.owner()])
    })
    .authorization((allow) => [allow.owner()])
});
