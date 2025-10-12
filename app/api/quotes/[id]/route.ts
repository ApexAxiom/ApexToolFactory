import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await requireSession();
  const quote = await prisma.quote.findFirst({
    where: { id: params.id, organizationId: user.organizationId },
    include: {
      property: { include: { customer: true } },
    },
  });
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const lineItems = await prisma.quoteLineItem.findMany({
    where: { quoteId: quote.id, organizationId: user.organizationId },
    orderBy: { id: 'asc' },
  });
  return NextResponse.json({ quote, lineItems });
}
