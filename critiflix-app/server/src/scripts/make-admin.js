// Create or reset the admin account WITHOUT wiping any data.
// Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from env.
// Run on Render Shell:  node src/scripts/make-admin.js
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/User.js';

if (!env.adminPassword) {
  console.error('[make-admin] ADMIN_PASSWORD is not set — set it first, then re-run.');
  process.exit(1);
}

await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });

const email = env.adminEmail;
const passwordHash = await User.hashPassword(env.adminPassword);

let admin = await User.findOne({ email });
if (admin) {
  admin.role = 'admin';
  admin.name = env.adminName;
  admin.passwordHash = passwordHash;
  admin.emailVerified = true;
  admin.status = 'active';
  await admin.save();
  console.log(`[make-admin] reset password for existing admin: ${email}`);
} else {
  admin = await User.create({
    code: 'AD-0001', role: 'admin', name: env.adminName, email,
    passwordHash, status: 'active', avatarColor: '#E50914', emailVerified: true,
  });
  console.log(`[make-admin] created new admin: ${email}`);
}

await mongoose.disconnect();
process.exit(0);
