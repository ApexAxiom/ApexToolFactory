import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const region = process.env.AWS_REGION ?? 'us-east-1';

const s3 = new S3Client({ region });

export interface UploadRequestInput {
  key: string;
  contentType: string;
}

/**
 * Generates a pre-signed URL that lets the client upload to S3 directly.
 * @param bucket Bucket name from env.
 * @param input Upload request metadata.
 * @returns Signed url and target key.
 * @example
 * await createUploadRequest(process.env.ASSET_BUCKET!, { key: 'org/123/logo.png', contentType: 'image/png' });
 */
export async function createUploadRequest(bucket: string, input: UploadRequestInput) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ContentType: input.contentType,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 300 });
  return { url, key: input.key };
}
