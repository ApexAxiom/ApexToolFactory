import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 48 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk as Buffer));
  doc.fontSize(20).fillColor('#3b82f6').text('PestPro Quotation', { align: 'left' });
  doc.moveDown();
  doc.fontSize(12).fillColor('#0f172a').text(`Quote ID: ${params.id}`);
  doc.text('Customer: Jordan Residence');
  doc.text('Property: Jordan Residence');
  doc.moveDown();
  doc.text('Thank you for choosing PestPro for your pest-control needs.');
  doc.moveDown();
  doc.text('Line Items:');
  doc.text('- General Pest Interior/Exterior Service');
  doc.text('- Travel and logistics');
  doc.moveDown();
  doc.fontSize(14).text('Total: $385.00', { align: 'right' });
  doc.end();
  await new Promise((resolve) => doc.on('end', resolve));
  const pdf = Buffer.concat(chunks);
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="quote-${params.id}.pdf"`,
    },
  });
}
