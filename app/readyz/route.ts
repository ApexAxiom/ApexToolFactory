import { prisma } from '@/lib/prisma';

/**
 * Database readiness probe for App Runner.
 * @returns HTTP 200 when Prisma can reach the database, otherwise 503.
 * @example
 * const res = await fetch('/readyz');
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new Response('ready', { status: 200 });
  } catch (error) {
    return new Response('not-ready', { status: 503 });
  }
}
