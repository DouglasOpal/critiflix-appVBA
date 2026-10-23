import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import os from 'os';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { protect, requireRole } from '../middleware/auth.js';
import { badRequest } from '../utils/ApiError.js';
import { r2Enabled, putFile } from '../services/storage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Legacy/local folder: still served at /uploads for older links and local dev.
export const UPLOAD_DIR = join(__dirname, '../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true }); // create on boot so writes never ENOENT
// With R2 on, multer only stages files here briefly before they go to Cloudflare.
const STAGING_DIR = join(os.tmpdir(), 'critiflix-uploads');
fs.mkdirSync(STAGING_DIR, { recursive: true });

export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;          // 8 MB
export const MAX_TRAILER_SECONDS = 180;           // 3 minutes

const MIME_EXT = {
  'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/x-m4v': '.m4v', 'video/webm': '.webm',
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic',
};
const EXT_MIME = {
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.m4v': 'video/x-m4v', '.webm': 'video/webm',
  '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska', '.3gp': 'video/3gpp',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.heic': 'image/heic', '.heif': 'image/heif',
};
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, r2Enabled ? STAGING_DIR : UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = (extname(file.originalname || '') || MIME_EXT[file.mimetype] || '').toLowerCase();
    cb(null, `${Date.now()}_${nanoid(8)}${ext}`);
  },
});

// Accept by mimetype OR by file extension — some Android content URIs arrive as
// application/octet-stream even though the file is a real video/image.
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|avi|mkv|3gp)$/i;
const IMAGE_EXT = /\.(jpg|jpeg|png|webp|heic|heif)$/i;
const okVideo = (f) => f.mimetype.startsWith('video/') || VIDEO_EXT.test(f.originalname || '');
const okImage = (f) => f.mimetype.startsWith('image/') || IMAGE_EXT.test(f.originalname || '');

const videoUpload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_BYTES },
  fileFilter: (_req, file, cb) => (okVideo(file) ? cb(null, true) : cb(new Error('Only video files are allowed'))),
}).single('file');

const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => (okImage(file) ? cb(null, true) : cb(new Error('Only image files are allowed'))),
}).single('file');

// Wrap a multer middleware so its errors become clean 400s.
const run = (mw) => (req, res, next) =>
  mw(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(badRequest('File is too large'));
      return next(badRequest(err.message || 'Upload failed'));
    }
    if (!req.file) return next(badRequest('No file received (field name must be "file")'));
    next();
  });

const removeStaged = (file) => file?.path && fs.promises.unlink(file.path).catch(() => {});

// Sends the received file to Cloudflare R2 (or keeps it local in dev) and
// returns its public URL.
async function store(file, folder) {
  if (!r2Enabled) return `/uploads/${file.filename}`;
  const type = (file.mimetype && file.mimetype !== 'application/octet-stream')
    ? file.mimetype
    : EXT_MIME[extname(file.filename).toLowerCase()] || 'application/octet-stream';
  return putFile(file.path, `${folder}/${file.filename}`, type);
}

const r = Router();

// Only creators upload media.
r.post('/video', protect(), requireRole('creator'), run(videoUpload), async (req, res, next) => {
  const durationSec = Number(req.body?.durationSec) || null;
  if (durationSec && durationSec > MAX_TRAILER_SECONDS) {
    removeStaged(req.file);
    return res.status(400).json({ error: `Trailer must be ${MAX_TRAILER_SECONDS} seconds (3 min) or shorter` });
  }
  try {
    const url = await store(req.file, 'trailers');
    res.status(201).json({
      url,
      sizeBytes: req.file.size,
      durationSec,
      maxBytes: MAX_VIDEO_BYTES,
      maxSeconds: MAX_TRAILER_SECONDS,
    });
  } catch (e) {
    removeStaged(req.file);
    console.error('[uploads] video store failed:', e.message);
    next(badRequest('Could not save the video. Please try again.'));
  }
});

r.post('/image', protect(), run(imageUpload), async (req, res, next) => {
  try {
    const url = await store(req.file, 'images');
    res.status(201).json({ url, sizeBytes: req.file.size });
  } catch (e) {
    removeStaged(req.file);
    console.error('[uploads] image store failed:', e.message);
    next(badRequest('Could not save the image. Please try again.'));
  }
});

export default r;
