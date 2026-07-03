// Termii delivery — SMS tokens (transactional "dnd" route) + WhatsApp (promotions).
// Nigeria-focused, reliable for local OTP + marketing. Credentials from env;
// callers fall back to "simulated" (logged) mode when unset.
import { env } from '../config/env.js';

export const smsEnabled = !!(env.termiiApiKey && env.termiiSenderId);
export const whatsappEnabled = !!env.termiiApiKey;

const BASE = (env.termiiBaseUrl || 'https://api.ng.termii.com').replace(/\/+$/, '');

function toIntl(num) {
  let s = String(num).replace(/[^\d]/g, '');
  if (s.startsWith('0')) s = `234${s.slice(1)}`; // Nigerian local -> intl
  return s;
}

async function post(path, payload) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: env.termiiApiKey, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data.code && data.code !== 'ok')) throw new Error(data.message || `Termii error (${res.status})`);
  return data;
}

export async function sendSms(to, text) {
  if (!smsEnabled) return { simulated: true };
  const d = await post('/api/sms/send', { to: toIntl(to), from: env.termiiSenderId, sms: text, type: 'plain', channel: 'dnd' });
  return { simulated: false, id: d.message_id };
}

export async function sendWhatsApp(to, text) {
  if (!whatsappEnabled) return { simulated: true };
  const d = await post('/api/sms/send', { to: toIntl(to), from: env.termiiSenderId || 'Termii', sms: text, type: 'plain', channel: 'whatsapp' });
  return { simulated: false, id: d.message_id };
}
