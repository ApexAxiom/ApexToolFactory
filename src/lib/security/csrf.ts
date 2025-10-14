import crypto from 'crypto';
import { cookies } from 'next/headers';

const CSRF_COOKIE = 'aa.csrf';

/**
 * Issues a CSRF token and persists it in an HttpOnly cookie.
 * @returns The generated token for embedding in forms.
 * @example
 * const token = issueCsrfToken();
 * <input type="hidden" name="csrf" value={token} />;
 */
export function issueCsrfToken() {
  const token = crypto.randomBytes(24).toString('base64url');
  cookies().set(CSRF_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return token;
}

/**
 * Validates a submitted CSRF token against the stored cookie.
 * @param submitted Token value provided by the client.
 * @throws When the token is missing or does not match.
 * @example
 * verifyCsrfToken(formData.get('csrf')?.toString());
 */
export function verifyCsrfToken(submitted: string | null | undefined) {
  const stored = cookies().get(CSRF_COOKIE)?.value;
  if (!stored || !submitted || stored !== submitted) {
    throw new Error('Invalid CSRF token');
  }
}
