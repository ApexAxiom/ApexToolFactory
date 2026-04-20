import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";
import { env } from "@/config/env";
import { CollectionName, collections } from "@/server/persistence/collections";

type Primitive = string | number | boolean;
type FilterMap = Record<string, Primitive | undefined>;
type StoredEntity = { id: string };

interface StoreShape {
  [key: string]: Record<string, StoredEntity>;
}

export interface PersistenceStore {
  get<T extends StoredEntity>(collection: CollectionName, id: string): Promise<T | null>;
  put<T extends StoredEntity>(collection: CollectionName, item: T): Promise<T>;
  delete(collection: CollectionName, id: string): Promise<void>;
  list<T extends StoredEntity>(collection: CollectionName, filters?: FilterMap): Promise<T[]>;
}

let storeSingleton: PersistenceStore | null = null;

export function getStore(): PersistenceStore {
  if (storeSingleton) return storeSingleton;
  storeSingleton = env.PERSISTENCE_DRIVER === "dynamo" ? new DynamoStore() : new FileStore();
  return storeSingleton;
}

class FileStore implements PersistenceStore {
  private filePath = resolve(process.cwd(), env.DEV_DATA_FILE);

  async get<T extends StoredEntity>(collection: CollectionName, id: string) {
    const db = await this.read();
    return (db[collection]?.[id] as T | undefined) ?? null;
  }

  async put<T extends StoredEntity>(collection: CollectionName, item: T) {
    const db = await this.read();
    if (!db[collection]) db[collection] = {};
    db[collection][item.id] = item;
    await this.write(db);
    return item;
  }

  async delete(collection: CollectionName, id: string) {
    const db = await this.read();
    delete db[collection]?.[id];
    await this.write(db);
  }

  async list<T extends StoredEntity>(collection: CollectionName, filters: FilterMap = {}) {
    const db = await this.read();
    const values = Object.values(db[collection] ?? {}) as T[];
    return values.filter((item) => {
      const record = item as Record<string, unknown>;
      return Object.entries(filters).every(([key, value]) => value === undefined || record[key] === value);
    });
  }

  private async read(): Promise<StoreShape> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as StoreShape;
    } catch {
      return collections.reduce<StoreShape>((acc, collection) => {
        acc[collection] = {};
        return acc;
      }, {});
    }
  }

  private async write(db: StoreShape) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(db, null, 2));
  }
}

class DynamoStore implements PersistenceStore {
  private client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: env.AWS_REGION }));
  private tables: Record<CollectionName, string | undefined> = {
    organizations: env.TABLE_ORGANIZATIONS,
    branches: env.TABLE_BRANCHES,
    organizationMemberships: env.TABLE_ORGANIZATION_MEMBERSHIPS,
    customers: env.TABLE_CUSTOMERS,
    customerContacts: env.TABLE_CUSTOMER_CONTACTS,
    properties: env.TABLE_PROPERTIES,
    serviceTemplates: env.TABLE_SERVICE_TEMPLATES,
    rateCards: env.TABLE_RATE_CARDS,
    rateRules: env.TABLE_RATE_RULES,
    quotes: env.TABLE_QUOTES,
    quoteRevisions: env.TABLE_QUOTE_REVISIONS,
    quoteLines: env.TABLE_QUOTE_LINES,
    quoteAttachments: env.TABLE_QUOTE_ATTACHMENTS,
    quoteAcceptances: env.TABLE_QUOTE_ACCEPTANCES,
    invoices: env.TABLE_INVOICES,
    invoiceLines: env.TABLE_INVOICE_LINES,
    payments: env.TABLE_PAYMENTS,
    emailMessages: env.TABLE_EMAIL_MESSAGES,
    emailEvents: env.TABLE_EMAIL_EVENTS,
    portalAccessTokens: env.TABLE_PORTAL_ACCESS_TOKENS,
    subscriptions: env.TABLE_SUBSCRIPTIONS,
    auditEvents: env.TABLE_AUDIT_EVENTS
  };

  async get<T extends StoredEntity>(collection: CollectionName, id: string) {
    const tableName = this.table(collection);
    const response = await this.client.send(
      new GetCommand({
        TableName: tableName,
        Key: { id }
      })
    );
    return (response.Item as T | undefined) ?? null;
  }

  async put<T extends StoredEntity>(collection: CollectionName, item: T) {
    const tableName = this.table(collection);
    await this.client.send(
      new PutCommand({
        TableName: tableName,
        Item: item
      })
    );
    return item;
  }

  async delete(collection: CollectionName, id: string) {
    const tableName = this.table(collection);
    await this.client.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { id }
      })
    );
  }

  async list<T extends StoredEntity>(collection: CollectionName, filters: FilterMap = {}) {
    const tableName = this.table(collection);
    const activeFilters = Object.entries(filters).filter(([, value]) => value !== undefined);
    const response = await this.client.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression:
          activeFilters.length > 0
            ? activeFilters.map(([key], index) => `#k${index} = :v${index}`).join(" AND ")
            : undefined,
        ExpressionAttributeNames:
          activeFilters.length > 0
            ? Object.fromEntries(activeFilters.map(([key], index) => [`#k${index}`, key]))
            : undefined,
        ExpressionAttributeValues:
          activeFilters.length > 0
            ? Object.fromEntries(activeFilters.map(([, value], index) => [`:v${index}`, value]))
            : undefined
      })
    );

    return (response.Items as T[] | undefined) ?? [];
  }

  private table(collection: CollectionName) {
    const tableName = this.tables[collection];
    if (!tableName) {
      throw new Error(`Table for collection "${collection}" is not configured`);
    }
    return tableName;
  }
}
