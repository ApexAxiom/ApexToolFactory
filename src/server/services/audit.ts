import { randomUUID } from "crypto";
import { AuditEvent } from "@/domain/types";
import { nowIso } from "@/lib/utils";
import { getStore } from "@/server/persistence/store";

export async function writeAuditEvent(input: Omit<AuditEvent, "id" | "createdAt" | "updatedAt">) {
  const timestamp = nowIso();
  const event: AuditEvent = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...input
  };

  await getStore().put("auditEvents", event);
  return event;
}
