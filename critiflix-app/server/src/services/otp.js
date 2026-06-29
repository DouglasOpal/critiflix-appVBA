import crypto from 'crypto';
import { Otp } from '../models/Otp.js';
import { sendSms, smsEnabled } from './twilio.js';

// OTP delivery. Phone codes go out via Twilio SMS when Twilio creds are set;
// otherwise (and for email until an email provider is added) codes are
// "simulated": logged server-side and returned as devCode so the flow stays testable.
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

export async function sendOtp(channel, destination) {
  const dest = destination.toLowerCase();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await Otp.deleteMany({ channel, destination: dest, consumed: false });
  await Otp.create({ channel, destination: dest, codeHash: sha(code), expiresAt: new Date(Date.now() + 10 * 60000) });

  // Real delivery: SMS via Twilio for the phone channel.
  if (channel === 'phone' && smsEnabled) {
    try {
      await sendSms(destination, `Your CritiFlix code is ${code}. It expires in 10 minutes.`);
      return { simulated: false };
    } catch (e) {
      console.error('[otp] Twilio SMS failed, falling back to simulated:', e.message);
    }
  }

  // Simulated: log + return the code so testing works without a provider.
  console.log(`[otp] ${channel} -> ${destination}: ${code}`);
  return { simulated: true, devCode: code };
}

export async function verifyOtp(channel, destination, code) {
  const dest = destination.toLowerCase();
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
