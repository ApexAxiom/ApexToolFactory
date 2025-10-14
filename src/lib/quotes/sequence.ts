import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '@/lib/prisma';

type TransactionClient = Prisma.TransactionClient;

async function allocate(orgId: string, client: PrismaClient | TransactionClient) {
  const sequence = await client.quoteSequence.upsert({
    where: { orgId },
    update: { next: { increment: 1 } },
    create: { orgId, next: 2 },
    select: { next: true },
  });

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const serial = String(sequence.next - 1).padStart(4, '0');
  return `Q${year}${month}${day}-${serial}`;
}

/**
 * Allocates a new quote number in a transaction-safe manner for the org.
 * @param orgId Tenant identifier.
 * @param client Optional transaction client to reuse within a broader transaction.
 * @returns The formatted quote number string.
 * @example
 * const quoteNumber = await allocateQuoteNumber(orgId, tx);
 */
export async function allocateQuoteNumber(orgId: string, client?: TransactionClient) {
  if (client) {
    return allocate(orgId, client);
  }
  return prisma.$transaction((tx) => allocate(orgId, tx));
}
