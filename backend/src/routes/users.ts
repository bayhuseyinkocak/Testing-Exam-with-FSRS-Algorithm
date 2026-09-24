import type { FastifyInstance } from 'fastify';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, users } from '../db';
import { requireAdmin } from '../plugins/auth';

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(200),
  role: z.enum(['admin', 'user']).default('user'),
});

export default async function userRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Gecersiz veri',
        details: parsed.error.issues.map((i) => i.message),
      });
    }
    const { username, password, role } = parsed.data;

    const exists = db.select({ id: users.id }).from(users).where(eq(users.username, username)).get();
    if (exists) {
      return reply.code(409).send({ error: 'Bu kullanici adi zaten mevcut' });
    }

    const passwordHash = await hash(password, 10);
    const result = db.insert(users).values({ username, password_hash: passwordHash, role }).run();
    const id = Number(result.lastInsertRowid);

    return reply.code(201).send({ user: { id, username, role } });
  });
}
