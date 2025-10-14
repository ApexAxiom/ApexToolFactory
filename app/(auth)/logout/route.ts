import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';
import { logInfo } from '@/lib/log';

export async function GET(request: Request) {
  const session = await getSession();
  const userId = session.user?.userId;
  await session.destroy();
  logInfo('auth.logout', { userId });
  return NextResponse.redirect(new URL('/login', request.url));
}
