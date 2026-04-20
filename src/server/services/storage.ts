import { randomUUID } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/config/env";
import { QuoteAttachment } from "@/domain/types";
import { nowIso } from "@/lib/utils";
import { getStore } from "@/server/persistence/store";
import { writeAuditEvent } from "@/server/services/audit";
import { getQuote } from "@/server/services/quotes";

const s3 = new S3Client({ region: env.AWS_REGION });

export async function createUploadUrl(input: {
  organizationId: string;
  quoteId: string;
  fileName: string;
  contentType: string;
}) {
  if (!env.S3_ATTACHMENTS_BUCKET) {
    throw new Error("S3_ATTACHMENTS_BUCKET is not configured");
  }

  const key = `organizations/${input.organizationId}/quotes/${input.quoteId}/${randomUUID()}-${input.fileName}`;
  const command = new PutObjectCommand({
    Bucket: env.S3_ATTACHMENTS_BUCKET,
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
