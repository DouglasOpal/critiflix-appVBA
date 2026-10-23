import dotenv from 'dotenv';
dotenv.config();

const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

export const env = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/critiflix',
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 10),
  seedPassword: process.env.SEED_PASSWORD || 'critiflix123',
  adminName: process.env.ADMIN_NAME || 'CritiFlix Admin',
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@critiflix.app').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',

  // Payments (optional — flows simulate when unset)
  paystackSecret: process.env.PAYSTACK_SECRET_KEY || '',
  paystackPublic: process.env.PAYSTACK_PUBLIC_KEY || '',
  paystackCallbackUrl: process.env.PAYSTACK_CALLBACK_URL || 'http://localhost:4000/api/me/subscribe/callback',

  // Twilio (SMS tokens + WhatsApp OTP/promotions; simulate when unset)
  twilioSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioFrom: process.env.TWILIO_FROM || '',                       // E.164 SMS-capable number, e.g. +12025550123
  twilioWhatsappFrom: process.env.TWILIO_WHATSAPP_FROM || '',      // e.g. whatsapp:+14155238886

  // Admin console: shared invite code gating self-service admin account creation.
  // Leave unset to disable the "create account" option entirely.
  adminSignupCode: process.env.ADMIN_SIGNUP_CODE || '',

  // Twilio SendGrid (email OTP + product update alerts; simulate when unset)
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || '',                         // must be a verified SendGrid sender
  emailFromName: process.env.EMAIL_FROM_NAME || 'CritiFlix',

  // Public addresses on the critiflix.net domain
  siteUrl: (process.env.PUBLIC_SITE_URL || 'https://critiflix.net').replace(/\/+$/, ''),
  apiUrl: (process.env.PUBLIC_API_URL || 'https://api.critiflix.net').replace(/\/+$/, ''),
  contactTo: process.env.CONTACT_TO || 'hello@critiflix.net',      // inbox for the website contact form

  // Cloudflare R2 media storage (S3-compatible). When unset, uploads fall back
  // to the local server/uploads folder (development only — not persistent on Render).
  r2AccountId: process.env.R2_ACCOUNT_ID || '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  r2Bucket: process.env.R2_BUCKET || 'critiflix-media',
  r2PublicUrl: (process.env.R2_PUBLIC_URL || 'https://media.critiflix.net').replace(/\/+$/, ''),
  r2Endpoint: process.env.R2_ENDPOINT || '',   // optional, e.g. https://<account>.eu.r2.cloudflarestorage.com for EU buckets
};

// Warn (don't crash) if running with insecure defaults outside dev.
export function assertProdSecrets() {
  if (env.isProd) {
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) throw new Error(`Missing required env in production: ${missing.join(', ')}`);
  }
}
