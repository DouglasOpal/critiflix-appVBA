// POST /contact — the critiflix.net website contact form. Forwards each message
// to CONTACT_TO (hello@critiflix.net) through SendGrid, with Reply-To set to the
// visitor so the team can answer directly.
import { Router } from 'express';
import { env } from '../config/env.js';
import { sendEmail, emailEnabled } from '../services/email.js';

const r = Router();

const TOPICS = new Set([
  'Creator campaign packages', 'Studio or bulk partnership', 'Advertising and sponsorship',
  'Critic account or payouts', 'Press and media', 'Something else',
]);
const ROLES = new Set(['Creator', 'Critic', 'Brand', 'Press']);

// Simple in-memory rate limit: 5 messages per IP per 10 minutes.
const hits = new Map();
const WINDOW = 10 * 60 * 1000;
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 5;
}

const clean = (v, max) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

r.post('/', async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ error: 'Too many messages. Try again in a few minutes.' });

  const b = req.body || {};
  const name = clean(b.name, 120);
  const email = clean(b.email, 200);
  const phone = clean(b.phone, 40);
  const topic = TOPICS.has(b.topic) ? b.topic : 'Something else';
  const role = ROLES.has(b.role) ? b.role : 'Unknown';
  const message = String(b.message ?? '').trim().slice(0, 5000);

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) {
    return res.status(400).json({ error: 'Name, a valid email and a message are required.' });
  }
  if (!emailEnabled) {
    console.error('[contact] SENDGRID_API_KEY / EMAIL_FROM not set — message not sent');
    return res.status(503).json({ error: 'Contact form is not configured.' });
  }

  const text = `New message from the CritiFlix website\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || '-'}\nRole: ${role}\nTopic: ${topic}\n\n${message}`;
  const html = `<h2>New message from the CritiFlix website</h2>
<p><b>Name:</b> ${esc(name)}<br><b>Email:</b> ${esc(email)}<br><b>Phone:</b> ${esc(phone || '-')}<br><b>Role:</b> ${esc(role)}<br><b>Topic:</b> ${esc(topic)}</p>
<p style="white-space:pre-wrap">${esc(message)}</p>`;

  try {
    await sendEmail(env.contactTo, `[Website] ${topic} - ${name} (${role})`, text, html, { email, name });
    res.json({ ok: true });
  } catch (e) {
    console.error('[contact]', e.message);   // 401 = bad API key, 403 = sender not verified
    res.status(502).json({ error: 'Could not send right now.' });
  }
});

export default r;
