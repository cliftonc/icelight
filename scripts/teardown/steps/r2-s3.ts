/**
 * R2 S3-compatible API helpers for teardown
 *
 * The Cloudflare REST API can only delete one object per request (and is rate
 * limited to 1,200 requests per 5 minutes), and cannot see incomplete multipart
 * uploads at all - which still block bucket deletion. The S3 API supports bulk
 * DeleteObjects and listing/aborting multipart uploads.
 *
 * S3 credentials are derived from the Cloudflare API token:
 * access key ID = token ID, secret access key = SHA-256 of the token value.
 */

import { createHash } from 'crypto';
import { AwsClient } from 'aws4fetch';

export interface R2S3Client {
  client: AwsClient;
  bucketUrl: string;
}

/**
 * Look up the token ID (user-owned or account-owned tokens)
 */
async function getTokenId(apiToken: string, accountId: string): Promise<string | null> {
  const urls = [
    'https://api.cloudflare.com/client/v4/user/tokens/verify',
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/tokens/verify`,
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${apiToken}` } });
      if (!response.ok) continue;
      const data = (await response.json()) as { success: boolean; result?: { id?: string } };
      if (data.success && data.result?.id) return data.result.id;
    } catch {
      // Try the next endpoint
    }
  }
  return null;
}

/**
 * Create an S3 client for an R2 bucket, or null if the token can't be resolved
 */
export async function createR2S3Client(
  bucketName: string,
  apiToken: string,
  accountId: string
): Promise<R2S3Client | null> {
  const tokenId = await getTokenId(apiToken, accountId);
  if (!tokenId) return null;

  return {
    client: new AwsClient({
      accessKeyId: tokenId,
      secretAccessKey: createHash('sha256').update(apiToken).digest('hex'),
      service: 's3',
      region: 'auto',
    }),
    bucketUrl: `https://${accountId}.r2.cloudflarestorage.com/${bucketName}`,
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function xmlValues(xml: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g');
  return Array.from(xml.matchAll(pattern), (match) => unescapeXml(match[1]));
}

/**
 * Delete objects in batches of 1,000 with S3 DeleteObjects
 */
export async function bulkDeleteObjectsS3(
  s3: R2S3Client,
  keys: string[],
  onProgress?: (deleted: number, total: number) => void
): Promise<{ deleted: number; failed: number }> {
  let deleted = 0;
  let failed = 0;

  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const body =
      '<?xml version="1.0" encoding="UTF-8"?><Delete><Quiet>true</Quiet>' +
      batch.map((key) => `<Object><Key>${escapeXml(key)}</Key></Object>`).join('') +
      '</Delete>';

    try {
      const response = await s3.client.fetch(`${s3.bucketUrl}?delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Content-MD5': createHash('md5').update(body).digest('base64'),
        },
        body,
      });
      if (!response.ok) {
        failed += batch.length;
        continue;
      }
      // Quiet mode only reports failures
      const errors = xmlValues(await response.text(), 'Error').length;
      failed += errors;
      deleted += batch.length - errors;
    } catch {
      failed += batch.length;
    }

    onProgress?.(deleted, keys.length);
  }

  return { deleted, failed };
}

/**
 * Abort all incomplete multipart uploads in the bucket.
 *
 * Pipeline sinks write Parquet files as multipart uploads; deleting a pipeline
 * mid-write leaves uploads that are invisible to object listings but still
 * prevent the bucket from being deleted.
 */
export async function abortMultipartUploads(s3: R2S3Client): Promise<{ aborted: number; failed: number }> {
  let aborted = 0;
  let failed = 0;
  let keyMarker: string | undefined;
  let uploadIdMarker: string | undefined;

  for (;;) {
    let query = 'uploads';
    if (keyMarker) query += `&key-marker=${encodeURIComponent(keyMarker)}`;
    if (uploadIdMarker) query += `&upload-id-marker=${encodeURIComponent(uploadIdMarker)}`;

    const response = await s3.client.fetch(`${s3.bucketUrl}?${query}`);
    if (!response.ok) {
      throw new Error(`Listing multipart uploads failed: ${response.status} ${await response.text()}`);
    }
    const xml = await response.text();

    for (const upload of xmlValues(xml, 'Upload')) {
      const [key] = xmlValues(upload, 'Key');
      const [uploadId] = xmlValues(upload, 'UploadId');
      if (!key || !uploadId) continue;

      const path = key.split('/').map(encodeURIComponent).join('/');
      const abort = await s3.client.fetch(`${s3.bucketUrl}/${path}?uploadId=${encodeURIComponent(uploadId)}`, {
        method: 'DELETE',
      });
      if (abort.ok || abort.status === 404) aborted++;
      else failed++;
    }

    if (xmlValues(xml, 'IsTruncated')[0] !== 'true') break;
    keyMarker = xmlValues(xml, 'NextKeyMarker')[0];
    uploadIdMarker = xmlValues(xml, 'NextUploadIdMarker')[0];
    if (!keyMarker) break;
  }

  return { aborted, failed };
}
