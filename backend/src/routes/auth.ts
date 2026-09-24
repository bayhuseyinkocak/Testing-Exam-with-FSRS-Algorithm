import type { FastifyInstance } from 'fastify';
import { compare } from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, users } from '../db';
import { env } from '../config';
import { requireAuth } from '../plugins/auth';

const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export default async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Geçersiz giriş bilgileri' });
    }
    const { username, password } = parsed.data;

    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    const user = rows[0];
    if (!user) {
      return reply.code(401).send({ error: 'Kullanıcı adı veya şifre hatalı' });
    }

    const ok = await compare(password, user.password_hash);
    if (!ok) {
      return reply.code(401).send({ error: 'Kullanıcı adı veya şifre hatalı' });
    }

    const token = app.jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      { expiresIn: '7d' },
    );

    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    });

    return { user: { id: user.id, username: user.username, role: user.role } };
  });

  app.get('/me', { preHandler: [requireAuth] }, async (request) => {
    const rows = await db.select().from(users).where(eq(users.id, request.user.id)).limit(1);
    const user = rows[0];
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
