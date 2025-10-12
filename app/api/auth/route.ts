import { NextResponse } from 'next/server';
import { z } from 'zod';

const AuthSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
});

export async function POST(request: Request) {
  const body = await request.json();
  const payload = AuthSchema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }
  // Stub: would check credentials with Prisma + iron-session
  return NextResponse.json({ ok: true, organizationId: 'org_seed', userId: 'seed_owner' });
}
