type WindowState = { count: number; resetAt: number };
const memory: Record<string, WindowState> = {};
const MAX_ATTEMPTS = parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS ?? '10', 10);
const WINDOW_SEC = parseInt(process.env.RATE_LIMIT_WINDOW_SEC ?? '300', 10);

/**
 * Applies an in-memory sliding window rate limit for a key.
 * @param key Identifier such as an IP address or user email.
 * @returns Rate-limit outcome with remaining attempts and reset timestamp.
 * @example
 * const result = await rateLimitKey(`login:${ip}`);
 * if (!result.ok) throw new Error('Too many attempts');
 */
export async function rateLimitKey(key: string) {
  const now = Date.now();
  const windowState = memory[key];
  if (!windowState || now > windowState.resetAt) {
    const nextWindow: WindowState = { count: 1, resetAt: now + WINDOW_SEC * 1000 };
    memory[key] = nextWindow;
    return { ok: true, remaining: Math.max(0, MAX_ATTEMPTS - 1), resetAt: nextWindow.resetAt };
  }

  if (windowState.count >= MAX_ATTEMPTS) {
    return { ok: false, remaining: 0, resetAt: windowState.resetAt };
  }

  windowState.count += 1;
  return { ok: true, remaining: Math.max(0, MAX_ATTEMPTS - windowState.count), resetAt: windowState.resetAt };
}
