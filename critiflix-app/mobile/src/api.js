// API client with JWT access + refresh tokens and transparent token refresh.
// Simulator / web: http://localhost:4000 works. On a physical device set your
// machine's LAN IP via mobile/.env:  EXPO_PUBLIC_API_BASE=http://192.168.1.20:4000
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE = "https://critiflix.onrender.com";

// Build a full URL for media stored on the API (posters/trailers come back as /uploads/...).
export const mediaUrl = (path) => (!path ? null : /^https?:\/\//.test(path) ? path : `${API_BASE}${path}`);

let accessToken = null;
let refreshToken = null;

export async function loadTokens() {
  accessToken = await AsyncStorage.getItem('cf_access');
  refreshToken = await AsyncStorage.getItem('cf_refresh');
  return { accessToken, refreshToken };
}
export async function setTokens(a, r) {
  accessToken = a || null;
  refreshToken = r || null;
  if (a) await AsyncStorage.setItem('cf_access', a); else await AsyncStorage.removeItem('cf_access');
  if (r) await AsyncStorage.setItem('cf_refresh', r); else await AsyncStorage.removeItem('cf_refresh');
}
export const getRefreshToken = () => refreshToken;

// How long to wait before giving up on a request (ms). Most "timed out" errors
// mean the device can't reach API_BASE — usually a wrong EXPO_PUBLIC_API_BASE
// (e.g. localhost on a physical phone) or a firewall blocking the port.
const TIMEOUT_MS = 15000;

class NetworkError extends Error {}

async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    // AbortError (timeout) or a low-level fetch failure both mean "couldn't reach the server".
    throw new NetworkError(`Can't reach the CritiFlix server at ${API_BASE}. Check that the backend is running and that EXPO_PUBLIC_API_BASE points to your computer's LAN IP (not localhost) on the same Wi-Fi.`);
  } finally {
    clearTimeout(timer);
  }
}

async function raw(path, { method = 'GET', body, auth = true } = {}) {
  return fetchWithTimeout(`${API_BASE}/api${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(auth && accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function tryRefresh() {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) { await setTokens(null, null); return false; }
    const data = await res.json();
    await setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch { return false; }
}

async function request(path, opts = {}) {
  let res = await raw(path, opts);
  if (res.status === 401 && opts.auth !== false && !opts._retry) {
    if (await tryRefresh()) res = await raw(path, { ...opts, _retry: true });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Multipart upload (video/image). RN sets the multipart boundary itself, so we
// must NOT set content-type. `file` is { uri, name, type }; extra string fields optional.
async function upload(path, file, fields = {}, _retry = false) {
  const form = new FormData();
  form.append('file', file);
  Object.entries(fields).forEach(([k, v]) => form.append(k, String(v)));
  const res = await fetchWithTimeout(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: { ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}) },
    body: form,
  }, 180000); // large media can take a while over LAN
  if (res.status === 401 && !_retry && (await tryRefresh())) return upload(path, file, fields, true);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data;
}

export const api = {
  // auth
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  logout: (rt) => request('/auth/logout', { method: 'POST', body: { refreshToken: rt }, auth: false }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),
  // app
  config: () => request('/config', { auth: false }),
  titles: (sort = 'priority', genre) => request(`/titles?sort=${sort}${genre && genre !== 'All' ? `&genre=${encodeURIComponent(genre)}` : ''}`),
  title: (id) => request(`/titles/${id}`),
  submitTitle: (payload) => request('/titles', { method: 'POST', body: payload }),
  editTitle: (id, payload) => request(`/titles/${id}`, { method: 'PATCH', body: payload }),
  watch: (id) => request(`/titles/${id}/watch`, { method: 'POST' }),
  review: (id, payload) => request(`/titles/${id}/review`, { method: 'POST', body: payload }),
  points: () => request('/me/points'),
  myReviews: () => request('/me/reviews'),
  redeem: (payload) => request('/me/redeem', { method: 'POST', body: payload }),
  referrals: () => request('/me/referrals'),
  subscribe: (plan) => request('/me/subscribe', { method: 'POST', body: { plan } }),
  studio: () => request('/me/studio'),
  setLogo: (logoUrl) => request('/me/logo', { method: 'POST', body: { logoUrl } }),
  setAvatar: (avatarUrl) => request('/me/avatar', { method: 'POST', body: { avatarUrl } }),
  notifications: () => request('/notifications'),
  notificationsUnread: () => request('/notifications/unread-count'),
  markNotificationsRead: (id) => request('/notifications/read', { method: 'POST', body: id ? { id } : {} }),
  // social + creators
  creator: (id) => request(`/creators/${id}`),
  criticProfile: (id) => request(`/critics/${id}`),
  follow: (id) => request(`/users/${id}/follow`, { method: 'POST' }),
  unfollow: (id) => request(`/users/${id}/follow`, { method: 'DELETE' }),
  announcements: () => request('/announcements'),
  // watch progress (in-app tracked player)
  watchProgress: (id, watchedSeconds, durationSeconds) => request(`/titles/${id}/watch`, { method: 'POST', body: { watchedSeconds, durationSeconds } }),
  // OTP auth
  otpRequest: (channel, destination) => request('/auth/otp/request', { method: 'POST', body: { channel, destination }, auth: false }),
  otpVerify: (channel, destination, code) => request('/auth/otp/verify', { method: 'POST', body: { channel, destination, code }, auth: false }),
  // uploads (creator)
  uploadVideo: (file, durationSec) => upload('/uploads/video', file, durationSec ? { durationSec } : {}),
  uploadImage: (file) => upload('/uploads/image', file),
};
