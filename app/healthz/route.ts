/**
 * Lightweight deployment health check.
 * @returns An HTTP 200 response when the app is ready.
 */
export async function GET() {
  return new Response('ok', { status: 200 });
}
