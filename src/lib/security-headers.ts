/**
 * Builds security headers for every response to align with App Runner and SaaS guardrails.
 * @returns Array of tuples describing header key/value pairs.
 * @example
 * createSecureHeaders();
 */
export function createSecureHeaders(): Array<{ key: string; value: string }> {
  return [
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Content-Security-Policy",
      value: "default-src 'self'; img-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';",
    },
    { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
  ];
}
