import type { FastifyInstance } from 'fastify';
import { asc, count, eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { db, users, reviewLogs } from '../db';
import { requireAdmin } from '../plugins/auth';

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(200),
  role: z.enum(['admin', 'user']).default('user'),
});

export default async function userRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [requireAdmin] }, async () => {
    const list = db.select().from(users).orderBy(asc(users.created_at)).all();
    const withCounts = list.map((u) => {
      const row = db
        .select({ c: count() })
        .from(reviewLogs)
        .where(eq(reviewLogs.user_id, u.id))
        .get();
      return {
        id: u.id,
        username: u.username,
        role: u.role,
        created_at: u.created_at,
        review_count: row?.c ?? 0,
      };
    });
    return { users: withCounts };
  });

  app.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Geçersiz veri',
        details: parsed.error.issues.map((i) => i.message),
      });
    }
    const { username, password, role } = parsed.data;

    const exists = db.select({ id: users.id }).from(users).where(eq(users.username, username)).get();
    if (exists) {
      return reply.code(409).send({ error: 'Bu kullanıcı adı zaten mevcut' });
    }

    const passwordHash = await hash(password, 10);
    const result = db.insert(users).values({ username, password_hash: passwordHash, role }).run();
    const id = Number(result.lastInsertRowid);

    return reply.code(201).send({ user: { id, username, role } });
  });

  app.delete('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (id === request.user.id) {
      return reply.code(400).send({ error: 'Kendi hesabınızı silemezsiniz' });
    }
    const user = db.select().from(users).where(eq(users.id, id)).get();
    if (!user) {
      return reply.code(404).send({ error: 'Kullanıcı bulunamadı' });
    }
    if (user.role === 'admin') {
      const admins = db.select({ c: count() }).from(users).where(eq(users.role, 'admin')).get();
      if ((admins?.c ?? 0) <= 1) {
        return reply.code(400).send({ error: 'Son admin kullanıcı silinemez' });
      }
    }
    db.delete(users).where(eq(users.id, id)).run();
    return { ok: true };
  });
}
