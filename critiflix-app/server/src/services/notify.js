import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { sendExpoPush } from './push.js';

// Fan-out an in-app notification + push to many users (by role filter or specific ids).
export async function notifyUsers({ role, userIds, type = 'system', title, body = '', data = {} }) {
  let users;
  if (userIds) users = await User.find({ _id: { $in: userIds } }).select('_id pushTokens').lean();
  else {
    const q = role ? { role } : { role: { $ne: 'admin' } };
    users = await User.find(q).select('_id pushTokens').lean();
  }
  if (!users.length) return 0;
  await Notification.insertMany(users.map((u) => ({ user: u._id, type, title, body, data })), { ordered: false }).catch(() => {});
  const tokens = users.flatMap((u) => u.pushTokens || []);
  if (tokens.length) sendExpoPush(tokens, { title, body, data }).catch(() => {});
  return users.length;
}

export async function notifyOne(userId, payload) {
  await Notification.create({ user: userId, ...payload });
  const u = await User.findById(userId).select('pushTokens').lean();
  if (u?.pushTokens?.length) sendExpoPush(u.pushTokens, payload).catch(() => {});
}
