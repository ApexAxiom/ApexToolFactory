import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const s3 = process.env.ASSET_BUCKET && process.env.AWS_REGION ? new S3Client({ region: process.env.AWS_REGION }) : null;
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const user = await requireSession();
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.startsWith('application/octet-stream')) {
    return NextResponse.json({ error: 'Send raw bytes with content-type application/octet-stream' }, { status: 400 });
  }
  const filename = req.headers.get('x-filename') || 'upload.bin';
  const type = (req.headers.get('x-type') || 'logo').toString();
  const ext = path.extname(filename) || '';
  const key = `${user.organizationId}/${type}/${crypto.randomUUID()}${ext}`;
  const bytes = Buffer.from(await req.arrayBuffer());

  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.ASSET_BUCKET!,
        Key: key,
        Body: bytes,
        ContentType: guess(ext),
      }),
    );
    return NextResponse.json({ key, url: `s3://${process.env.ASSET_BUCKET}/${key}` });
  }

  const filePath = path.join(process.cwd(), 'storage', key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, bytes);
  return NextResponse.json({ key, url: `file://${filePath}` });
}

function guess(ext: string) {
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
}
