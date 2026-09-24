import type { FastifyReply, FastifyRequest } from 'fastify';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: number; username: string; role: 'admin' | 'user' };
    user: { id: number; username: string; role: 'admin' | 'user' };
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Yetkisiz erisim' });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Yetkisiz erisim' });
  }
  if (request.user.role !== 'admin') {
    return reply.code(403).send({ error: 'Bu islem icin admin yetkisi gerekli' });
  }
}
