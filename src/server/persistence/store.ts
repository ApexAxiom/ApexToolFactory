import { existsSync, readFileSync } from "fs";
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
  private queue = Promise.resolve();

  async get<T extends StoredEntity>(collection: CollectionName, id: string) {
    return this.runExclusive(async () => {
      const db = await this.read();
      return (db[collection]?.[id] as T | undefined) ?? null;
    });
  }

  async put<T extends StoredEntity>(collection: CollectionName, item: T) {
    return this.runExclusive(async () => {
      const db = await this.read();
      if (!db[collection]) db[collection] = {};
      db[collection][item.id] = item;
      await this.write(db);
      return item;
    });
  }

  async delete(collection: CollectionName, id: string) {
    await this.runExclusive(async () => {
      const db = await this.read();
      delete db[collection]?.[id];
      await this.write(db);
    });
  }

  async list<T extends StoredEntity>(collection: CollectionName, filters: FilterMap = {}) {
    return this.runExclusive(async () => {
      const db = await this.read();
      const values = Object.values(db[collection] ?? {}) as T[];
      return values.filter((item) => {
        const record = item as Record<string, unknown>;
        return Object.entries(filters).every(([key, value]) => value === undefined || record[key] === value);
      });
    });
  }

  private runExclusive<T>(operation: () => Promise<T>) {
    const next = this.queue.then(operation, operation);
    this.queue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
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
    organizations: resolveTableName("organizations", env.TABLE_ORGANIZATIONS),
    branches: resolveTableName("branches", env.TABLE_BRANCHES),
    organizationMemberships: resolveTableName("organizationMemberships", env.TABLE_ORGANIZATION_MEMBERSHIPS),
    customers: resolveTableName("customers", env.TABLE_CUSTOMERS),
    customerContacts: resolveTableName("customerContacts", env.TABLE_CUSTOMER_CONTACTS),
    properties: resolveTableName("properties", env.TABLE_PROPERTIES),
    serviceTemplates: resolveTableName("serviceTemplates", env.TABLE_SERVICE_TEMPLATES),
    rateCards: resolveTableName("rateCards", env.TABLE_RATE_CARDS),
    rateRules: resolveTableName("rateRules", env.TABLE_RATE_RULES),
    quotes: resolveTableName("quotes", env.TABLE_QUOTES),
    quoteRevisions: resolveTableName("quoteRevisions", env.TABLE_QUOTE_REVISIONS),
    quoteLines: resolveTableName("quoteLines", env.TABLE_QUOTE_LINES),
    quoteAttachments: resolveTableName("quoteAttachments", env.TABLE_QUOTE_ATTACHMENTS),
    quoteAcceptances: resolveTableName("quoteAcceptances", env.TABLE_QUOTE_ACCEPTANCES),
    invoices: resolveTableName("invoices", env.TABLE_INVOICES),
    invoiceLines: resolveTableName("invoiceLines", env.TABLE_INVOICE_LINES),
    payments: resolveTableName("payments", env.TABLE_PAYMENTS),
    emailMessages: resolveTableName("emailMessages", env.TABLE_EMAIL_MESSAGES),
    emailEvents: resolveTableName("emailEvents", env.TABLE_EMAIL_EVENTS),
    portalAccessTokens: resolveTableName("portalAccessTokens", env.TABLE_PORTAL_ACCESS_TOKENS),
    subscriptions: resolveTableName("subscriptions", env.TABLE_SUBSCRIPTIONS),
    auditEvents: resolveTableName("auditEvents", env.TABLE_AUDIT_EVENTS)
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

let amplifyTablesCache: Partial<Record<CollectionName, string>> | null = null;

function resolveTableName(collection: CollectionName, configured?: string) {
  return configured || readAmplifyTableOutputs()[collection];
}

function readAmplifyTableOutputs() {
  if (amplifyTablesCache) return amplifyTablesCache;

  const outputPath = resolve(process.cwd(), "amplify_outputs.json");
  if (!existsSync(outputPath)) {
    amplifyTablesCache = {};
    return amplifyTablesCache;
  }

  try {
    const parsed = JSON.parse(readFileSync(outputPath, "utf8")) as {
      custom?: {
        dynamodbTables?: Partial<Record<CollectionName, string>>;
      };
    };
    amplifyTablesCache = parsed.custom?.dynamodbTables ?? {};
  } catch {
    amplifyTablesCache = {};
  }

  return amplifyTablesCache;
}
