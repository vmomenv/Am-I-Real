import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { getDatabase } from '@/src/server/db/client';
import { hashAdminPassword, upsertAdminUser } from '@/src/server/admin/auth-service';

const username = process.env.ADMIN_USERNAME ?? 'admin';
const password = process.env.ADMIN_PASSWORD;

if (!password) {
  throw new Error('ADMIN_PASSWORD must be set before seeding the admin user.');
}

const db = getDatabase();

bootstrapDatabase(db);
upsertAdminUser(db, {
  username,
  passwordHash: hashAdminPassword(password),
});

console.log(`Seeded admin user "${username}".`);
