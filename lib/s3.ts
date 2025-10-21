import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

// AWS_REGION is auto-provided by AWS Amplify, but fallback to us-east-1 for local dev
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
const BUCKET = process.env.S3_BUCKET!;
// The AWS SDK automatically discovers credentials from the environment or the
// hosting IAM role, so we rely on the default credential provider chain.
export const s3 = new S3Client({ region: REGION });
const enc = (o:any)=>Buffer.from(JSON.stringify(o));

/**
 * Writes a JSON-serializable value to S3 at the provided key.
 * @param key - S3 object key relative to the configured bucket.
 * @param value - Serializable value to persist.
 * @returns Promise that resolves when the upload completes.
 * @example
 * ```ts
 * await putJson(paths.meta("default"), { serialDate: "20240601" });
 * ```
 */
export async function putJson(key: string, value: any) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: enc(value), ContentType: "application/json" }));
}

/**
 * Retrieves and parses JSON stored at the specified key.
 * @param key - S3 object key to fetch.
 * @returns Parsed JSON object or null when not found.
 * @example
 * ```ts
 * const meta = await getJson(paths.meta("default"));
 * ```
 */
export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const r = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = await r.Body!.transformToString();
    return JSON.parse(body) as T;
  } catch (e:any) {
    if (e?.$metadata?.httpStatusCode === 404) return null;
    throw e;
  }
}

/**
 * Lists objects stored under the given prefix.
 * @param prefix - Path prefix (e.g. `orgs/default/quotes/`).
 * @returns AWS response from ListObjectsV2.
 * @example
 * ```ts
 * const objects = await listPrefix(paths.org("default"));
 * ```
 */
export async function listPrefix(prefix:string) {
  return s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }));
}

/**
 * Deletes the object stored at the specified key.
 * @param key - S3 key to delete.
 * @returns Promise resolving when deletion finishes.
 * @example
 * ```ts
 * await del(paths.quote("default", "Q1"));
 * ```
 */
export async function del(key:string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * Helper paths for consistent key construction.
 */
export const paths = {
  org:(orgId:string)=>`orgs/${orgId}/`,
  meta:(orgId:string)=>`orgs/${orgId}/meta.json`,
  index:(orgId:string)=>`orgs/${orgId}/index.json`,
  customer:(orgId:string,id:string)=>`orgs/${orgId}/customers/${id}.json`,
  property:(orgId:string,id:string)=>`orgs/${orgId}/properties/${id}.json`,
  template:(orgId:string,id:string)=>`orgs/${orgId}/templates/${id}.json`,
  quote:(orgId:string,id:string)=>`orgs/${orgId}/quotes/${id}.json`
};

/**
 * Executes a callback while holding a best-effort lock for the organization.
 * @param orgId - Organization identifier used for the lock key.
 * @param fn - Async callback executed when the lock is acquired.
 * @returns Promise resolving after the callback completes.
 * @example
 * ```ts
 * await withLock("default", async () => {
 *   await putJson("key", {});
 * });
 * ```
 */
export async function withLock(orgId:string, fn:()=>Promise<void>) {
  const key = `orgs/${orgId}/locks/meta.lock`;
  for (let i=0;i<20;i++){
    try {
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: enc({ts:Date.now()}), ContentType:"application/json", /* @ts-ignore */ IfNoneMatch: "*" }));
      break;
    } catch { await new Promise(r=>setTimeout(r, 100 + Math.random()*250)); }
  }
  try { await fn(); } finally { try { await del(key); } catch {} }
}
