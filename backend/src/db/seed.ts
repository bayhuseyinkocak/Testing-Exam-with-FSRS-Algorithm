import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, users, exams } from './index';

async function main() {
  const adminUsername = 'admin';
  const existingAdmin = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, adminUsername))
    .limit(1);
  if (existingAdmin.length === 0) {
    const passwordHash = await hash(process.env.ADMIN_PASSWORD ?? 'admin123', 10);
    await db.insert(users).values({ username: adminUsername, password_hash: passwordHash, role: 'admin' });
    console.log('Admin kullanicisi olusturuldu (username: admin)');
  } else {
    console.log('Admin kullanicisi zaten var');
  }

  const sampleExams = [
    { name: 'Microsoft AB-730', code: 'AB-730', description: 'Microsoft sertifika sinavi AB-730' },
    { name: 'Microsoft AB-731', code: 'AB-731', description: 'Microsoft sertifika sinavi AB-731' },
    { name: 'Almanca B2', code: 'DE-B2', description: 'Almanca B2 seviye sinavi' },
  ];
  for (const exam of sampleExams) {
    const found = await db.select({ id: exams.id }).from(exams).where(eq(exams.code, exam.code)).limit(1);
    if (found.length === 0) {
      await db.insert(exams).values(exam);
      console.log('Ornek sinav eklendi:', exam.name);
    }
  }
  console.log('Seed tamamlandi.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
