// One-off: copy media still referenced as /uploads/<file> to Cloudflare R2 and
// rewrite the database links to the public R2 URL.
//
//   node src/scripts/migrate-uploads-to-r2.js           # dry run (shows what would change)
//   node src/scripts/migrate-uploads-to-r2.js --apply   # upload + update the database
//
// Needs MONGODB_URI and the R2_* variables. Run it where the old files still
// exist (e.g. your local copy of server/uploads). Links whose file is missing
// are listed so you can ask the creator to re-upload.
import fs from 'fs';
import { join, extname } from 'path';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Title } from '../models/Title.js';
import { User } from '../models/User.js';
import { UPLOAD_DIR } from '../routes/uploads.js';
import { r2Enabled, publicUrlFor } from '../services/storage.js';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const APPLY = process.argv.includes('--apply');
const TYPES = {
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.m4v': 'video/x-m4v', '.webm': 'video/webm',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.heic': 'image/heic',
};
const FIELDS = [
  [Title, ['trailerUrl', 'posterSmall', 'posterLarge'], (f) => (f === 'trailerUrl' ? 'trailers' : 'images')],
  [User, ['avatarUrl', 'logoUrl'], () => 'images'],
];

if (!r2Enabled) { console.error('Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET first.'); process.exit(1); }
const s3 = new S3Client({
  region: 'auto',
  endpoint: env.r2Endpoint || `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
  forcePathStyle: !!env.r2Endpoint,
  credentials: { accessKeyId: env.r2AccessKeyId, secretAccessKey: env.r2SecretAccessKey },
});

await mongoose.connect(env.mongoUri);
const uploaded = new Map();   // local filename -> public URL
let changed = 0; const missing = [];

for (const [Model, fields, folderFor] of FIELDS) {
  for (const field of fields) {
    const docs = await Model.find({ [field]: { $regex: '^/uploads/' } }).select(field).lean();
    for (const d of docs) {
      const file = d[field].replace(/^\/uploads\//, '').split('?')[0];
      const local = join(UPLOAD_DIR, file);
      if (!fs.existsSync(local)) { missing.push(`${Model.modelName}.${field} ${d._id} -> ${d[field]}`); continue; }
      const key = `${folderFor(field)}/${file}`;
      let url = uploaded.get(file);
      if (!url) {
        url = publicUrlFor(key);
        if (APPLY) {
          await new Upload({ client: s3, params: {
            Bucket: env.r2Bucket, Key: key, Body: fs.createReadStream(local),
            ContentType: TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
            CacheControl: 'public, max-age=31536000, immutable',
          } }).done();
        }
        uploaded.set(file, url);
      }
      console.log(`${APPLY ? 'moved' : 'would move'}  ${Model.modelName}.${field}  ${d[field]}  ->  ${url}`);
      if (APPLY) await Model.updateOne({ _id: d._id }, { $set: { [field]: url } });
      changed += 1;
    }
  }
}

console.log(`\n${changed} link(s) ${APPLY ? 'updated' : 'to update'}, ${uploaded.size} file(s) ${APPLY ? 'uploaded' : 'to upload'}.`);
if (missing.length) {
  console.log(`\n${missing.length} link(s) point to files that no longer exist on this machine:`);
  missing.forEach((m) => console.log('  ' + m));
}
if (!APPLY) console.log('\nDry run only. Re-run with --apply to upload and update the database.');
await mongoose.disconnect();
