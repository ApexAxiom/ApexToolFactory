import { headers, cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth/session';
import { rateLimitKey } from '@/lib/security/rateLimit';
import { logError, logInfo } from '@/lib/log';

type FlashPayload = { message?: string; email?: string | undefined };

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function setFlash(payload: FlashPayload) {
  cookies().set('aa.flash', JSON.stringify(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30,
  });
}

async function loginAction(formData: FormData) {
  'use server';
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rate = await rateLimitKey(`login:${ip}`);
  if (!rate.ok) {
    setFlash({ message: 'Too many attempts. Try again in a few minutes.' });
    return redirect('/login');
  }

  const rawEmail = formData.get('email');
  const rawPassword = formData.get('password');
  const parsed = loginSchema.safeParse({
    email: typeof rawEmail === 'string' ? rawEmail.trim() : rawEmail,
    password: typeof rawPassword === 'string' ? rawPassword : rawPassword,
  });

  if (!parsed.success) {
    setFlash({ message: 'Please provide a valid email and password.', email: typeof rawEmail === 'string' ? rawEmail : undefined });
    return redirect('/login');
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    logError('auth.login.invalid_user', { email, requestId: headersList.get('x-request-id') ?? undefined });
    setFlash({ message: 'Invalid email or password.', email });
    return redirect('/login');
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    logError('auth.login.invalid_password', { userId: user.id, requestId: headersList.get('x-request-id') ?? undefined });
    setFlash({ message: 'Invalid email or password.', email });
    return redirect('/login');
  }

  const session = await getSession();
  session.user = { userId: user.id, orgId: user.orgId ?? null };
  await session.save();

  logInfo('auth.login.success', { userId: user.id, orgId: user.orgId, requestId: headersList.get('x-request-id') ?? undefined });

  cookies().set('aa.flash', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return redirect('/quotes');
}

export default async function LoginPage() {
  const session = await getSession();
  if (session.user) {
    redirect('/quotes');
  }

  const flashCookie = cookies().get('aa.flash');
  let flash: FlashPayload = {};
  if (flashCookie?.value) {
    try {
      flash = JSON.parse(flashCookie.value) as FlashPayload;
    } catch {
      flash = {};
    }
  }

  const initialEmail = flash.email ?? '';
  const error = flash.message ?? null;

  return (
    <main className="mx-auto mt-24 max-w-md px-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">Use your work email and password to access quotes.</p>
      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <form action={loginAction} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={initialEmail}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            autoComplete="current-password"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-sky-600 px-4 py-2 text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
