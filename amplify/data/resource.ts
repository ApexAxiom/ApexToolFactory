import { defineData, a } from '@aws-amplify/backend';

const TEAM_GROUPS = ['Owner', 'OfficeManager', 'Estimator', 'Technician', 'Accounting'];

const companyAuth = (allow: any) => [allow.owner(), allow.groups(TEAM_GROUPS)];

export const data = defineData({
  schema: a
    .schema({
      RoleName: a.enum(['Owner', 'OfficeManager', 'Estimator', 'Technician', 'Accounting']),
      QuoteStatus: a.enum(['QUOTE', 'INVOICE', 'PAID', 'VOID']),
      InvoiceStatus: a.enum(['DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'VOID', 'OVERDUE']),
      WorkOrderStatus: a.enum(['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
      InventoryTxnType: a.enum(['RECEIPT', 'ADJUSTMENT', 'CONSUMPTION', 'TRANSFER']),

      Organization: a
        .model({
          id: a.id().required(),
          name: a.string().required(),
          legalName: a.string(),
          timezone: a.string(),
          currencyCode: a.string(),
          defaultTaxPct: a.float(),
          defaultTerms: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth),

      Branch: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          code: a.string(),
          name: a.string().required(),
          phone: a.string(),
          address1: a.string(),
          city: a.string(),
          state: a.string(),
          postalCode: a.string(),
          isActive: a.boolean(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byOrganization', {
            sortKey: 'createdAt',
            queryField: 'branchesByOrganization'
          })
        ]),

      UserProfile: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          branchId: a.string(),
          displayName: a.string(),
          email: a.string(),
          phone: a.string(),
          title: a.string(),
          isActive: a.boolean(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byOrganization', {
            sortKey: 'createdAt',
            queryField: 'userProfilesByOrganization'
          })
        ]),

      RoleAssignment: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          userId: a.string().required(),
          role: a.ref('RoleName').required(),
          branchId: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byOrganization', {
            sortKey: 'createdAt',
            queryField: 'roleAssignmentsByOrganization'
          }),
          index('byUser', {
            sortKey: 'createdAt',
            queryField: 'roleAssignmentsByUser'
          })
        ]),

      Vendor: a
        .model({
          id: a.id().required(),
          organizationId: a.string(),
          branchId: a.string(),
          name: a.string().required(),
          contactEmail: a.string(),
          contactPhone: a.string(),
          notes: a.string(),
          defaultTerms: a.string(),
          defaultTaxPct: a.float(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byOrganization', {
            sortKey: 'createdAt',
            queryField: 'vendorsByOrganization'
          }),
          index('byBranch', {
            sortKey: 'createdAt',
            queryField: 'vendorsByBranch'
          })
        ]),

      Supplier: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          branchId: a.string(),
          name: a.string().required(),
          contactName: a.string(),
          contactEmail: a.string(),
          contactPhone: a.string(),
          terms: a.string(),
          leadTimeDays: a.integer(),
          notes: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byOrganization', {
            sortKey: 'createdAt',
            queryField: 'suppliersByOrganization'
          }),
          index('byBranch', {
            sortKey: 'createdAt',
            queryField: 'suppliersByBranch'
          })
        ]),

      SupplierItem: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          supplierId: a.string().required(),
          sku: a.string().required(),
          name: a.string().required(),
          description: a.string(),
          category: a.string(),
          unitOfMeasure: a.string(),
          isActive: a.boolean(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('bySupplier', {
            sortKey: 'createdAt',
            queryField: 'supplierItemsBySupplier'
          }),
          index('byOrganization', {
            sortKey: 'createdAt',
            queryField: 'supplierItemsByOrganization'
          })
        ]),

      SupplierItemPrice: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          supplierItemId: a.string().required(),
          price: a.float().required(),
          currencyCode: a.string(),
          minOrderQty: a.integer(),
          effectiveFrom: a.datetime().required(),
          effectiveTo: a.datetime(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('bySupplierItem', {
            sortKey: 'effectiveFrom',
            queryField: 'supplierItemPricesByItem'
          })
        ]),

      ServiceTemplate: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          branchId: a.string(),
          code: a.string().required(),
          name: a.string().required(),
          description: a.string(),
          isActive: a.boolean(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byOrganization', {
            sortKey: 'createdAt',
            queryField: 'serviceTemplatesByOrganization'
          })
        ]),

      ServiceTemplateLine: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          templateId: a.string().required(),
          lineCode: a.string(),
          description: a.string().required(),
          quantity: a.float().required(),
          unitPrice: a.float().required(),
          costBasis: a.float(),
          taxable: a.boolean(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byTemplate', {
            sortKey: 'createdAt',
            queryField: 'serviceTemplateLinesByTemplate'
          })
        ]),

      Customer: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          branchId: a.string(),
          accountNumber: a.string(),
          name: a.string().required(),
          email: a.string(),
          phone: a.string(),
          billingAddress1: a.string(),
          billingCity: a.string(),
          billingState: a.string(),
          billingPostalCode: a.string(),
          notes: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byOrganization', {
            sortKey: 'createdAt',
            queryField: 'customersByOrganization'
          }),
          index('byBranch', {
            sortKey: 'createdAt',
            queryField: 'customersByBranch'
          })
        ]),

      CustomerContact: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          customerId: a.string().required(),
          name: a.string().required(),
          email: a.string(),
          phone: a.string(),
          role: a.string(),
          isPrimary: a.boolean(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byCustomer', {
            sortKey: 'createdAt',
            queryField: 'customerContactsByCustomer'
          })
        ]),

      Property: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          branchId: a.string(),
          customerId: a.string().required(),
          name: a.string(),
          address1: a.string(),
          city: a.string(),
          state: a.string(),
          postalCode: a.string(),
          sqft: a.float(),
          structureType: a.string(),
          infestationNotes: a.string(),
          lastServiceAt: a.datetime(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byCustomer', {
            sortKey: 'createdAt',
            queryField: 'propertiesByCustomer'
          }),
          index('byOrganization', {
            sortKey: 'createdAt',
            queryField: 'propertiesByOrganization'
          })
        ]),

      CustomerRateCard: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          customerId: a.string().required(),
          name: a.string().required(),
          effectiveFrom: a.datetime().required(),
          effectiveTo: a.datetime(),
          notes: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byCustomer', {
            sortKey: 'effectiveFrom',
            queryField: 'customerRateCardsByCustomer'
          })
        ]),

      RateRule: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          rateCardId: a.string().required(),
          serviceTemplateId: a.string(),
          lineCode: a.string(),
          ruleType: a.string(),
          value: a.float().required(),
          minimumCharge: a.float(),
          maximumCharge: a.float(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byRateCard', {
            sortKey: 'createdAt',
            queryField: 'rateRulesByRateCard'
          })
        ]),

      Client: a
        .model({
          id: a.id().required(),
          organizationId: a.string(),
          branchId: a.string(),
          vendorId: a.string().required(),
          name: a.string().required(),
          email: a.string(),
          phone: a.string(),
          address1: a.string(),
          city: a.string(),
          state: a.string(),
          postalCode: a.string(),
          notes: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byVendor', {
            sortKey: 'createdAt',
            queryField: 'clientsByVendor'
          })
        ]),

      Quote: a
        .model({
          id: a.id().required(),
          organizationId: a.string(),
          branchId: a.string(),
          vendorId: a.string().required(),
          clientId: a.string().required(),
          customerId: a.string(),
          propertyId: a.string(),
          clientName: a.string(),
          quoteNumber: a.string().required(),
          status: a.ref('QuoteStatus').required(),
          payload: a.string().required(),
          version: a.integer(),
          subtotal: a.float().required(),
          taxTotal: a.float().required(),
          grandTotal: a.float().required(),
          invoiceNumber: a.string(),
          invoiceDate: a.datetime(),
          convertedAt: a.datetime(),
          paidAt: a.datetime(),
          paymentMethod: a.string(),
          paymentNotes: a.string(),
          sentAt: a.datetime(),
          acceptedAt: a.datetime(),
          expiresAt: a.datetime(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byVendor', {
            sortKey: 'createdAt',
            queryField: 'quotesByVendor'
          }),
          index('byQuoteNumber', {
            sortKey: 'createdAt',
            queryField: 'quoteByNumber'
          }),
          index('byClient', {
            sortKey: 'createdAt',
            queryField: 'quotesByClient'
          }),
          index('byOrganization', {
            sortKey: 'createdAt',
            queryField: 'quotesByOrganization'
          }),
          index('byStatus', {
            sortKey: 'createdAt',
            queryField: 'quotesByStatus'
          })
        ]),

      QuoteLine: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          quoteId: a.string().required(),
          lineNumber: a.integer().required(),
          description: a.string().required(),
          qty: a.float().required(),
          unitPrice: a.float().required(),
          costBasis: a.float(),
          lineTotal: a.float().required(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byQuote', {
            sortKey: 'lineNumber',
            queryField: 'quoteLinesByQuote'
          })
        ]),

      QuoteRevision: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          quoteId: a.string().required(),
          revisionNumber: a.integer().required(),
          payload: a.string().required(),
          subtotal: a.float().required(),
          taxTotal: a.float().required(),
          grandTotal: a.float().required(),
          revisedBy: a.string(),
          revisedAt: a.datetime().required(),
          notes: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byQuote', {
            sortKey: 'revisionNumber',
            queryField: 'quoteRevisionsByQuote'
          })
        ]),

      QuoteAttachment: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          quoteId: a.string().required(),
          storageKey: a.string().required(),
          fileName: a.string(),
          mimeType: a.string(),
          size: a.integer(),
          capturedAt: a.datetime(),
          capturedBy: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byQuote', {
            sortKey: 'createdAt',
            queryField: 'quoteAttachmentsByQuote'
          }),
          index('byStorageKey', {
            sortKey: 'createdAt',
            queryField: 'quoteAttachmentByStorageKey'
          })
        ]),

      Invoice: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          branchId: a.string(),
          quoteId: a.string(),
          customerId: a.string(),
          propertyId: a.string(),
          invoiceNumber: a.string().required(),
          status: a.ref('InvoiceStatus').required(),
          issueDate: a.datetime().required(),
          dueDate: a.datetime(),
          subtotal: a.float().required(),
          taxTotal: a.float().required(),
          grandTotal: a.float().required(),
          paidTotal: a.float(),
          outstandingTotal: a.float(),
          notes: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byOrganization', {
            sortKey: 'issueDate',
            queryField: 'invoicesByOrganization'
          }),
          index('byStatus', {
            sortKey: 'issueDate',
            queryField: 'invoicesByStatus'
          }),
          index('byQuote', {
            sortKey: 'issueDate',
            queryField: 'invoiceByQuote'
          })
        ]),

      InvoiceLine: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          invoiceId: a.string().required(),
          lineNumber: a.integer().required(),
          description: a.string().required(),
          qty: a.float().required(),
          unitPrice: a.float().required(),
          lineTotal: a.float().required(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byInvoice', {
            sortKey: 'lineNumber',
            queryField: 'invoiceLinesByInvoice'
          })
        ]),

      Payment: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          invoiceId: a.string(),
          amount: a.float().required(),
          currencyCode: a.string(),
          paymentDate: a.datetime().required(),
          method: a.string(),
          reference: a.string(),
          notes: a.string(),
          status: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byInvoice', {
            sortKey: 'paymentDate',
            queryField: 'paymentsByInvoice'
          }),
          index('byOrganization', {
            sortKey: 'paymentDate',
            queryField: 'paymentsByOrganization'
          })
        ]),

      PaymentAllocation: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          paymentId: a.string().required(),
          invoiceId: a.string().required(),
          amount: a.float().required(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byPayment', {
            sortKey: 'createdAt',
            queryField: 'paymentAllocationsByPayment'
          }),
          index('byInvoice', {
            sortKey: 'createdAt',
            queryField: 'paymentAllocationsByInvoice'
          })
        ]),

      PurchaseOrder: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          branchId: a.string(),
          supplierId: a.string().required(),
          poNumber: a.string().required(),
          status: a.string().required(),
          orderDate: a.datetime().required(),
          expectedDate: a.datetime(),
          subtotal: a.float(),
          taxTotal: a.float(),
          grandTotal: a.float(),
          notes: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byOrganization', {
            sortKey: 'orderDate',
            queryField: 'purchaseOrdersByOrganization'
          }),
          index('bySupplier', {
            sortKey: 'orderDate',
            queryField: 'purchaseOrdersBySupplier'
          }),
          index('byStatus', {
            sortKey: 'orderDate',
            queryField: 'purchaseOrdersByStatus'
          })
        ]),

      PurchaseOrderLine: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          purchaseOrderId: a.string().required(),
          supplierItemId: a.string(),
          description: a.string(),
          qty: a.float().required(),
          unitCost: a.float().required(),
          lineTotal: a.float().required(),
          receivedQty: a.float(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byPurchaseOrder', {
            sortKey: 'createdAt',
            queryField: 'purchaseOrderLinesByPurchaseOrder'
          })
        ]),

      InventoryItem: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          branchId: a.string(),
          supplierItemId: a.string(),
          sku: a.string(),
          name: a.string().required(),
          unitOfMeasure: a.string(),
          onHandQty: a.float(),
          reorderPoint: a.float(),
          averageUnitCost: a.float(),
          lastCountedAt: a.datetime(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byOrganization', {
            sortKey: 'createdAt',
            queryField: 'inventoryItemsByOrganization'
          }),
          index('byBranch', {
            sortKey: 'createdAt',
            queryField: 'inventoryItemsByBranch'
          }),
          index('bySku', {
            sortKey: 'createdAt',
            queryField: 'inventoryItemBySku'
          })
        ]),

      InventoryTxn: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          inventoryItemId: a.string().required(),
          workOrderId: a.string(),
          purchaseOrderId: a.string(),
          type: a.ref('InventoryTxnType').required(),
          quantity: a.float().required(),
          unitCost: a.float(),
          occurredAt: a.datetime().required(),
          notes: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byInventoryItem', {
            sortKey: 'occurredAt',
            queryField: 'inventoryTxnsByItem'
          }),
          index('byWorkOrder', {
            sortKey: 'occurredAt',
            queryField: 'inventoryTxnsByWorkOrder'
          })
        ]),

      WorkOrder: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          branchId: a.string(),
          customerId: a.string(),
          propertyId: a.string(),
          quoteId: a.string(),
          invoiceId: a.string(),
          workOrderNumber: a.string(),
          status: a.ref('WorkOrderStatus').required(),
          scheduledStart: a.datetime(),
          scheduledEnd: a.datetime(),
          completedAt: a.datetime(),
          technicianUserId: a.string(),
          notes: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byOrganization', {
            sortKey: 'scheduledStart',
            queryField: 'workOrdersByOrganization'
          }),
          index('byStatus', {
            sortKey: 'scheduledStart',
            queryField: 'workOrdersByStatus'
          }),
          index('byTechnician', {
            sortKey: 'scheduledStart',
            queryField: 'workOrdersByTechnician'
          })
        ]),

      Route: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          branchId: a.string(),
          routeDate: a.datetime().required(),
          routeCode: a.string(),
          technicianUserId: a.string(),
          notes: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byOrganization', {
            sortKey: 'routeDate',
            queryField: 'routesByOrganization'
          }),
          index('byTechnician', {
            sortKey: 'routeDate',
            queryField: 'routesByTechnician'
          })
        ]),

      RouteStop: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          routeId: a.string().required(),
          workOrderId: a.string().required(),
          stopOrder: a.integer().required(),
          eta: a.datetime(),
          arrivedAt: a.datetime(),
          completedAt: a.datetime(),
          status: a.string(),
          notes: a.string(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byRoute', {
            sortKey: 'stopOrder',
            queryField: 'routeStopsByRoute'
          }),
          index('byWorkOrder', {
            sortKey: 'createdAt',
            queryField: 'routeStopsByWorkOrder'
          })
        ]),

      AuditEvent: a
        .model({
          id: a.id().required(),
          organizationId: a.string().required(),
          actorUserId: a.string(),
          action: a.string().required(),
          entityType: a.string().required(),
          entityId: a.string().required(),
          payload: a.string(),
          occurredAt: a.datetime().required(),
          createdAt: a.datetime().required().defaultToNow(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byOrganization', {
            sortKey: 'occurredAt',
            queryField: 'auditEventsByOrganization'
          }),
          index('byEntity', {
            sortKey: 'occurredAt',
            queryField: 'auditEventsByEntity'
          })
        ]),

      DailyCounter: a
        .model({
          counterKey: a.string().required(),
          organizationId: a.string(),
          branchId: a.string(),
          lastSequence: a.integer().required(),
          updatedAt: a.datetime().required().updatedAt()
        })
        .identifier(['counterKey'])
        .authorization(companyAuth)
        .secondaryIndexes((index) => [
          index('byOrganization', {
            sortKey: 'updatedAt',
            queryField: 'dailyCountersByOrganization'
          })
        ])
    })
    .authorization((allow) => [allow.owner(), allow.groups(TEAM_GROUPS)])
});
