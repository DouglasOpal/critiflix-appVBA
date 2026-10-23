// Twilio SendGrid delivery for email one-time codes and product update alerts.
// Uses the SendGrid v3 Web API directly (no extra SDK dependency — just fetch).
// Credentials come from env; callers fall back to "simulated" (logged) mode
// when unset, same pattern as the SMS/WhatsApp Twilio service.
import { env } from '../config/env.js';

export const emailEnabled = !!(env.sendgridApiKey && env.emailFrom);

const BASE = 'https://api.sendgrid.com/v3/mail/send';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Sends a single email. `html` is optional — if omitted, a simple paragraph
// wrapper around `text` is used so callers can pass plain strings.
// `replyTo` (optional) is { email, name } — used by the website contact form so
// replies go straight to the visitor.
export async function sendEmail(to, subject, text, html, replyTo) {
  if (!emailEnabled) return { simulated: true };
  const body = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: env.emailFrom, name: env.emailFromName || 'CritiFlix' },
    ...(replyTo?.email ? { reply_to: replyTo } : {}),
    subject,
    content: [
      { type: 'text/plain', value: text },
      { type: 'text/html', value: html || `<p>${escapeHtml(text)}</p>` },
    ],
  };
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.sendgridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`SendGrid error (${res.status}): ${errText || 'send failed'}`);
  }
  // SendGrid returns 202 with no body on success; the message id is in a header.
  return { simulated: false, id: res.headers.get('x-message-id') || null };
}

// Fan-out helper for product update / announcement emails to many recipients.
// Sends individually (not one big personalizations array) so a bad address
// doesn't block delivery to everyone else; failures are collected, not thrown.
export async function sendBulkEmail(recipients, subject, text, html) {
  if (!emailEnabled) return { simulated: true, sent: 0, failed: recipients.length };
  let sent = 0;
  const failed = [];
  await Promise.all(recipients.map(async (to) => {
    try {
      await sendEmail(to, subject, text, html);
      sent += 1;
    } catch (e) {
      failed.push({ to, error: e.message });
    }
  }));
  return { simulated: false, sent, failed };
}
