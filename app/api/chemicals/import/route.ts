import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { parseChemicalsCsv } from '@/lib/csv';

const ImportSchema = z.object({ csv: z.string().min(1) });

export async function POST(request: Request) {
  const store = cookies();
  const session = await getSession(store);
  const user = session.user;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request
    .json()
    .then((body) => ImportSchema.safeParse(body))
    .catch(() => ({ success: false as const }));

  if (!payload || !payload.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  let chemicals;
  try {
    chemicals = parseChemicalsCsv(payload.data.csv).filter((item) => item.name.length > 0);
  } catch (error) {
    return NextResponse.json({ error: 'Malformed CSV' }, { status: 400 });
  }

  if (chemicals.length === 0) {
    return NextResponse.json({ error: 'No rows to import' }, { status: 400 });
  }

  await prisma.$transaction(
    chemicals.map((chemical) =>
      prisma.chemical.upsert({
        where: { organizationId_name: { organizationId: user.organizationId, name: chemical.name } },
        update: {
          packageSize: chemical.packageSize,
          packageUnit: chemical.packageUnit,
          packageCost: chemical.packageCost,
          wastePercent: chemical.wastePercent,
          vendorSku: chemical.vendorSku,
          concentration: chemical.concentration,
        },
        create: {
          organizationId: user.organizationId,
          name: chemical.name,
          packageSize: chemical.packageSize,
          packageUnit: chemical.packageUnit,
          packageCost: chemical.packageCost,
          wastePercent: chemical.wastePercent,
          vendorSku: chemical.vendorSku,
          concentration: chemical.concentration,
        },
      }),
    ),
  );

  return NextResponse.json({ imported: chemicals.length });
}
