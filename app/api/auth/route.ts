import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/auth';
import { rateLimitByIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const LoginSchema = z.object({
  action: z.literal('login'),
  email: z.string().email(),
  password: z.string().min(8),
});
const SignupSchema = z.object({
  action: z.literal('signup'),
  organizationName: z.string().min(2),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});
const LogoutSchema = z.object({ action: z.literal('logout') });

export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown';
  if (!rateLimitByIp(ip, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const json = await req.json().catch(() => ({}));
  const store = cookies();
  const session = await getIronSession<SessionData>(store, sessionOptions);

  if (LoginSchema.safeParse(json).success) {
    const { email, password } = LoginSchema.parse(json);
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    session.user = {
      id: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
      name: user.name,
    };
    await session.save();
    return NextResponse.json({ ok: true });
  }

  if (SignupSchema.safeParse(json).success) {
    const { organizationName, name, email, password } = SignupSchema.parse(json);
    const passwordHash = await bcrypt.hash(password, 12);
    const org = await prisma.organization.create({ data: { name: organizationName } });
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'Owner',
        organizationId: org.id,
      },
    });
    await prisma.companySettings.create({
      data: {
        organizationId: org.id,
        currency: 'USD',
        taxRate: 0,
        unitsArea: 'ft2',
        unitsVolume: 'gallon',
        roundingRule: 'nearest_5',
        pricingMode: 'margin',
        targetMargin: 0.45,
        defaultMarkup: 0.3,
        hourlyWage: 22,
        burdenPercent: 0.28,
        crewSize: 1,
        travelFixedMin: 15,
        travelMinsPerMile: 1.5,
        minJobPrice: 95,
        quoteExpiryDays: 30,
        termsText: 'Payment due upon completion.',
        brandPrimaryFrom: '#3b82f6',
        brandPrimaryTo: '#10b981',
        brandAccent: '#0ea5e9',
        address: '',
        phone: '',
      },
    });
    session.user = {
      id: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
      name: user.name,
    };
    await session.save();
    return NextResponse.json({ ok: true });
  }

  if (LogoutSchema.safeParse(json).success) {
    await session.destroy();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
}
