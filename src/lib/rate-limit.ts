const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Performs an in-memory rate limit keyed by IP address.
 * @param ip Remote address to bucket requests by.
 * @param limit Maximum allowed requests within the window.
 * @param windowMs Rolling window duration in milliseconds.
 * @returns True when the request is permitted; false when rejected.
 * @example
 * if (!rateLimitByIp(ip, 10, 60_000)) throw new Error('Too many requests');
 */
export function rateLimitByIp(ip: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) {
    return false;
  }
  bucket.count += 1;
  return true;
}
