import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST() {
  const transport = nodemailer.createTransport({ jsonTransport: true });
  const info = await transport.sendMail({
    to: 'customer@example.com',
    from: 'quotes@example.com',
    subject: 'Your pest-control quote is ready',
    text: 'Review your quote at https://example.com/quotes/Q-2024-0004',
  });
  return NextResponse.json({ preview: info.message });
}
