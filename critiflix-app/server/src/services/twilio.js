// Twilio delivery for SMS one-time codes and WhatsApp promotions.
// All credentials come from env; if they're unset the callers fall back to
// "simulated" mode so the app still works for local/offline testing.
import { env } from '../config/env.js';

export const smsEnabled = !!(env.twilioSid && env.twilioToken && env.twilioFrom);
export const whatsappEnabled = !!(env.twilioSid && env.twilioToken && env.twilioWhatsappFrom);

let client = null;
async function getClient() {
  if (client) return client;
  const { default: twilio } = await import('twilio');
  client = twilio(env.twilioSid, env.twilioToken);
  return client;
}

// E.164 normalisation: strip spaces/dashes, expand a Nigerian local number
// (0xxxxxxxxxx -> +234xxxxxxxxxx), keep a leading + otherwise.
function e164(num) {
  let s = String(num).trim().replace(/[^\d+]/g, '');
  if (!s.startsWith('+')) {
    if (s.startsWith('0')) s = `234${s.slice(1)}`; // Nigerian local -> intl
    s = `+${s}`;
  }
  return s;
}

export async function sendSms(to, body) {
  if (!smsEnabled) return { simulated: true };
  const c = await getClient();
  const msg = await c.messages.create({ from: env.twilioFrom, to: e164(to), body });
  return { simulated: false, sid: msg.sid };
}

export async function sendWhatsApp(to, body) {
  if (!whatsappEnabled) return { simulated: true };
  const c = await getClient();
  const from = env.twilioWhatsappFrom.startsWith('whatsapp:') ? env.twilioWhatsappFrom : `whatsapp:${env.twilioWhatsappFrom}`;
  const msg = await c.messages.create({ from, to: `whatsapp:${e164(to)}`, body });
  return { simulated: false, sid: msg.sid };
}
