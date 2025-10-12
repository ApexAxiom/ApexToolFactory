import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/db';
import { requireSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const s3 = process.env.ASSET_BUCKET && process.env.AWS_REGION ? new S3Client({ region: process.env.AWS_REGION }) : null;

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await requireSession();
  const quote = await prisma.quote.findFirst({
    where: { id: params.id, organizationId: user.organizationId },
    include: {
      organization: { include: { settings: true } },
      lineItems: true,
      property: true,
      customer: true,
    },
  });
  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  const doc = new PDFDocument({ size: 'LETTER', margin: 48 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk as Buffer));

  const settings = quote.organization.settings;
  const primary = settings?.brandPrimaryFrom ?? '#3b82f6';
  const logoRel = settings?.logoUrl || 'placeholder-logo.svg';
  const logoPath = path.isAbsolute(logoRel) || logoRel.startsWith('http') ? null : path.join(process.cwd(), 'public', logoRel);
  if (logoPath && fs.existsSync(logoPath)) {
    doc.image(logoPath, 48, 36, { width: 96 });
  }

  doc.fontSize(20).fillColor(primary).text(quote.organization.name, 160, 48, { align: 'left' });
  doc.moveDown();
  doc.fontSize(12).fillColor('#0f172a').text(`Quote #: ${quote.quoteNumber}`);
  doc.text(`Customer: ${quote.customer.name}`);
  doc.text(`Property: ${quote.property.address}`);
  doc.text(`Expires: ${quote.expiresAt.toDateString()}`);
  doc.moveDown();

  doc.fontSize(14).text('Line Items');
  doc.moveDown(0.5);
  for (const item of quote.lineItems) {
    doc.fontSize(12).text(`${item.label} — $${item.amount.toFixed(2)}`);
  }
  doc.moveDown();
  doc.fontSize(14).text(`Total: $${quote.total.toFixed(2)}`, { align: 'right' });
  doc.moveDown(2);
  doc.fontSize(12).text('Authorized Signature: __________________________');

  doc.end();
  await new Promise((resolve) => doc.on('end', resolve));
  const pdf = Buffer.concat(chunks);

  if (s3) {
    const key = `${quote.organizationId}/quotes/${quote.id}.pdf`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.ASSET_BUCKET!,
        Key: key,
        Body: pdf,
        ContentType: 'application/pdf',
      }),
    );
    await prisma.quote.update({ where: { id: quote.id }, data: { pdfKey: key } });
  }

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="quote-${params.id}.pdf"`,
    },
  });
}
