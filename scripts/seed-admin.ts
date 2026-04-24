import { bootstrapDatabase } from '@/src/server/db/bootstrap';
import { getDatabase } from '@/src/server/db/client';
import { seedAdminUser } from '@/src/server/admin/auth-service';

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  throw new Error('Usage: npm exec tsx scripts/seed-admin.ts <username> <password>');
}

const db = getDatabase();

bootstrapDatabase(db);
seedAdminUser(db, username, password);

console.log(`Seeded admin user "${username}".`);
