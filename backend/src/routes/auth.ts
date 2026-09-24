import type { FastifyInstance } from 'fastify';
import { compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, users } from '../db';
import { requireAuth } from '../plugins/auth';

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export default async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Gecersiz giris bilgileri' });
    }
    const { username, password } = parsed.data;

    const user = db.select().from(users).where(eq(users.username, username)).get();
    if (!user) {
      return reply.code(401).send({ error: 'Kullanici adi veya sifre hatali' });
    }

    const ok = await compare(password, user.password_hash);
    if (!ok) {
      return reply.code(401).send({ error: 'Kullanici adi veya sifre hatali' });
    }

    const token = app.jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      { expiresIn: '7d' },
    );

    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return { user: { id: user.id, username: user.username, role: user.role } };
  });

  app.get('/me', { preHandler: [requireAuth] }, async (request) => {
    const user = db.select().from(users).where(eq(users.id, request.user.id)).get();
    if (!user) {
      return { user: null };
    }
    return { user: { id: user.id, username: user.username, role: user.role } };
  });

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { ok: true };
  });
}
