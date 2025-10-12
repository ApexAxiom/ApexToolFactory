import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { stringifyChemicals } from '@/lib/csv';

export async function GET() {
  const store = cookies();
  const session = await getSession(store);
  const user = session.user;
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await prisma.chemical.findMany({
    where: { organizationId: user.organizationId },
    select: {
      name: true,
      packageSize: true,
      packageUnit: true,
      packageCost: true,
      wastePercent: true,
      vendorSku: true,
      concentration: true,
    },
    orderBy: { name: 'asc' },
  });

  const csv = stringifyChemicals(rows.map((row) => ({
    name: row.name,
    packageSize: row.packageSize,
    packageUnit: row.packageUnit,
    packageCost: row.packageCost,
    wastePercent: row.wastePercent,
    vendorSku: row.vendorSku ?? '',
    concentration: row.concentration ?? '',
  })));

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="chemicals.csv"',
    },
  });
}
