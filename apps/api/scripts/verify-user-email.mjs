/**
 * Manually verify a user's email in local MongoDB (development helper).
 *
 * Usage:
 *   node apps/api/scripts/verify-user-email.mjs sourav@gluckglobal.com
 */
import mongoose from 'mongoose';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node verify-user-email.mjs <email>');
  process.exit(1);
}

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fe-platform';

await mongoose.connect(uri);
const users = mongoose.connection.db.collection('users');
const result = await users.updateOne(
  { email: email.toLowerCase(), isDeleted: { $ne: true } },
  {
    $set: {
      emailVerifiedAt: new Date(),
      status: 'active',
    },
  },
);

if (result.matchedCount === 0) {
  console.error(`No user found for ${email}`);
  process.exitCode = 1;
} else {
  console.log(`Verified ${email}`);
}

await mongoose.disconnect();
