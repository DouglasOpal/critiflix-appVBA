// Send push notifications to Expo push tokens via Expo's push service.
const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
const isExpoToken = (t) => typeof t === 'string' && t.startsWith('ExponentPushToken');

export async function sendExpoPush(tokens, { title, body, data = {} }) {
  const to = [...new Set((tokens || []).filter(isExpoToken))];
  if (!to.length) return { sent: 0 };
  const messages = to.map((t) => ({ to: t, sound: 'default', title, body, data, channelId: 'default' }));
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      if (res.ok) sent += batch.length; else console.error('[push] Expo', res.status);
    } catch (e) { console.error('[push] send failed:', e.message); }
  }
  return { sent };
}
