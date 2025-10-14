const message = 'Legacy API endpoint disabled. Use the server-rendered app flows.';

export async function GET() {
  return new Response(message, { status: 410 });
}

export async function POST() {
  return GET();
}

export async function PUT() {
  return GET();
}
