// Media storage on Cloudflare R2 (S3-compatible API).
//
// Uploads arrive on disk in a temp folder (multer), are streamed to R2 in
// multipart chunks (videos can be 200 MB, so they never sit in memory), and the
// temp file is removed. The returned URL is the public R2 address, e.g.
//   https://media.critiflix.net/trailers/1729700000000_ab12cd34.mp4
//
// Without R2 credentials (local development) files stay in server/uploads and
// are served by Express at /uploads/<file>, exactly as before.
import fs from 'fs';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { env } from '../config/env.js';

export const r2Enabled = !!(env.r2AccountId && env.r2AccessKeyId && env.r2SecretAccessKey && env.r2Bucket);

let client = null;
function r2() {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: env.r2Endpoint || `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      forcePathStyle: !!env.r2Endpoint,
      credentials: { accessKeyId: env.r2AccessKeyId, secretAccessKey: env.r2SecretAccessKey },
    });
  }
  return client;
}

export const publicUrlFor = (key) => `${env.r2PublicUrl}/${key}`;

// Pushes a local file to R2 under `key` and deletes the local copy.
export async function putFile(localPath, key, contentType) {
  try {
    const upload = new Upload({
      client: r2(),
      params: {
        Bucket: env.r2Bucket,
        Key: key,
        Body: fs.createReadStream(localPath),
        ContentType: contentType || 'application/octet-stream',
        CacheControl: 'public, max-age=31536000, immutable',
      },
      queueSize: 4,
      partSize: 8 * 1024 * 1024,
    });
    await upload.done();
    return publicUrlFor(key);
  } finally {
    await fs.promises.unlink(localPath).catch(() => {});
  }
}

// Removes an object we previously stored. Ignores URLs that aren't ours
// (external links, YouTube, legacy /uploads paths) and never throws.
export async function deleteMedia(url) {
  if (!r2Enabled || !url || typeof url !== 'string') return false;
  const prefix = `${env.r2PublicUrl}/`;
  if (!url.startsWith(prefix)) return false;
  const key = decodeURIComponent(url.slice(prefix.length).split('?')[0]);
  try {
    await r2().send(new DeleteObjectCommand({ Bucket: env.r2Bucket, Key: key }));
    return true;
  } catch (e) {
    console.warn(`[r2] could not delete ${key}: ${e.message}`);
    return false;
  }
}
