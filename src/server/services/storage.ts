import { randomUUID } from "crypto";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/config/env";
import { QuoteAttachment } from "@/domain/types";
import { nowIso } from "@/lib/utils";
import { getStore } from "@/server/persistence/store";
import { writeAuditEvent } from "@/server/services/audit";
import { getQuote } from "@/server/services/quotes";

const s3 = new S3Client({ region: env.AWS_REGION });
let bucketCache: string | null | undefined;

export async function createUploadUrl(input: {
  organizationId: string;
  quoteId: string;
  fileName: string;
  contentType: string;
}) {
  const bucket = resolveAttachmentBucket();
  if (!bucket) {
    throw new Error("S3_ATTACHMENTS_BUCKET is not configured");
  }

  const key = `organizations/${input.organizationId}/quotes/${input.quoteId}/${randomUUID()}-${input.fileName}`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: input.contentType
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 60 * 10 });
  return { url, key };
}

export async function finalizeQuoteAttachment(input: {
  organizationId: string;
  actorUserId: string;
  quoteId: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  size: number;
  capturedAt?: string;
}) {
  const quote = await getQuote(input.quoteId);
  if (!quote || quote.organizationId !== input.organizationId) {
    throw new Error("Quote was not found");
  }

  const timestamp = nowIso();
  const attachment: QuoteAttachment = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: input.organizationId,
    quoteId: input.quoteId,
    revisionId: quote.currentRevisionId,
    storageKey: input.storageKey,
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.size,
    capturedAt: input.capturedAt || timestamp,
    capturedBy: input.actorUserId
  };

  await getStore().put("quoteAttachments", attachment);
  await writeAuditEvent({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "quote.attachment.finalized",
    entityType: "QuoteAttachment",
    entityId: attachment.id,
    occurredAt: timestamp,
    payload: JSON.stringify({ quoteId: input.quoteId, storageKey: input.storageKey })
  });

  return attachment;
}

function resolveAttachmentBucket() {
  if (env.S3_ATTACHMENTS_BUCKET) return env.S3_ATTACHMENTS_BUCKET;
  if (bucketCache !== undefined) return bucketCache;

  const outputPath = resolve(process.cwd(), "amplify_outputs.json");
  if (!existsSync(outputPath)) {
    bucketCache = null;
    return bucketCache;
  }

  try {
    const parsed = JSON.parse(readFileSync(outputPath, "utf8")) as {
      custom?: {
        storage?: {
          attachmentsBucket?: string;
        };
      };
    };
    bucketCache = parsed.custom?.storage?.attachmentsBucket || null;
  } catch {
    bucketCache = null;
  }

  return bucketCache;
}
