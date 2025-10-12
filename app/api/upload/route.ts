import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createUploadRequest } from '@/lib/s3';

const UploadSchema = z.object({
  key: z.string(),
  contentType: z.string(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = UploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const bucket = process.env.ASSET_BUCKET ?? '';
  if (!bucket) {
    return NextResponse.json({
      url: `/storage/${parsed.data.key}`,
      key: parsed.data.key,
      note: 'Upload directly to local storage in development.',
    });
  }
  const result = await createUploadRequest(bucket, parsed.data);
  return NextResponse.json(result);
}
