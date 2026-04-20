import { createHash, randomBytes, randomUUID } from "crypto";
import { PortalAccessToken } from "@/domain/types";
import { nowIso } from "@/lib/utils";
import { getStore } from "@/server/persistence/store";

export function hashPortalToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPortalToken(input: {
  organizationId: string;
  entityType: "QUOTE" | "INVOICE";
  entityId: string;
  expiresAt: string;
}) {
  const token = randomBytes(32).toString("hex");
  const timestamp = nowIso();
  const record: PortalAccessToken = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    organizationId: input.organizationId,
    entityType: input.entityType,
    entityId: input.entityId,
    tokenHash: hashPortalToken(token),
    expiresAt: input.expiresAt
  };

  await getStore().put("portalAccessTokens", record);
  return { token, record };
}

export async function validatePortalToken(token: string, entityType: "QUOTE" | "INVOICE") {
  const hashed = hashPortalToken(token);
  const matches = await getStore().list<PortalAccessToken>("portalAccessTokens", {
    tokenHash: hashed,
    entityType
  });

  const record = matches[0];
  if (!record) {
    throw new Error("Portal token was not found");
  }

  if (record.revokedAt) {
    throw new Error("Portal token has been revoked");
  }

  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    throw new Error("Portal token has expired");
  }

  return record;
}

export async function touchPortalToken(record: PortalAccessToken, requestMeta: { ip?: string; userAgent?: string }) {
  const updated: PortalAccessToken = {
    ...record,
    updatedAt: nowIso(),
    lastViewedAt: nowIso(),
    lastViewedIp: requestMeta.ip,
    lastViewedUserAgent: requestMeta.userAgent
  };
  await getStore().put("portalAccessTokens", updated);
  return updated;
}
