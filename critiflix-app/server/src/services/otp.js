import crypto from 'crypto';
import { Otp } from '../models/Otp.js';
import { sendSms, smsEnabled, sendWhatsApp, whatsappEnabled } from './twilio.js';
import { sendEmail, emailEnabled } from './email.js';

// OTP delivery via Twilio (SMS + WhatsApp) and Twilio SendGrid (email).
// 'phone' -> SMS, 'whatsapp' -> WhatsApp, 'email' -> SendGrid.
// Codes are NEVER returned to the client (requirement 3) — only delivered and,
// when no provider is configured, logged server-side for local debugging.
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const norm = (channel, d) => (channel === 'email' ? String(d).toLowerCase() : String(d).trim());

export async function sendOtp(channel, destination) {
  const dest = norm(channel, destination);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await Otp.deleteMany({ channel, destination: dest, consumed: false });
  await Otp.create({ channel, destination: dest, codeHash: sha(code), expiresAt: new Date(Date.now() + 10 * 60000) });

  const body = `Your CritiFlix code is ${code}. It expires in 10 minutes.`;
  try {
    if (channel === 'whatsapp' && whatsappEnabled) { await sendWhatsApp(destination, body); return { sent: true }; }
    if (channel === 'phone' && smsEnabled) { await sendSms(destination, body); return { sent: true }; }
    if (channel === 'email' && emailEnabled) {
      await sendEmail(destination, 'Your CritiFlix confirmation code', body);
      return { sent: true };
    }
  } catch (e) {
    console.error(`[otp] Twilio ${channel} failed:`, e.message);
  }
  // No provider configured: log only (code is never sent back to the app).
  console.log(`[otp] ${channel} -> ${destination}: ${code}`);
  return { sent: false };
}

export async function verifyOtp(channel, destination, code) {
  const dest = norm(channel, destination);
  const rec = await Otp.findOne({ channel, destination: dest, consumed: false }).sort({ createdAt: -1 });
  if (!rec) return { ok: false, reason: 'Request a code first' };
  if (rec.expiresAt < new Date()) return { ok: false, reason: 'That code has expired' };
  if (rec.attempts >= 5) return { ok: false, reason: 'Too many attempts — request a new code' };
  rec.attempts += 1;
  if (rec.codeHash !== sha(code)) { await rec.save(); return { ok: false, reason: 'Incorrect code' }; }
  rec.consumed = true;
  await rec.save();
  return { ok: true };
}
