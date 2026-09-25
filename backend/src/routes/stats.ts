import type { FastifyInstance } from 'fastify';
import { db, users } from '../db';
import { requireAuth, requireAdmin } from '../plugins/auth';
import { getOverview } from '../services/stats';
import { optimizeForUser, resetUserParams } from '../services/optimizer';

export default async function statsRoutes(app: FastifyInstance) {
  app.get('/overview', { preHandler: [requireAuth] }, async (request) => {
    return getOverview(request.user.id);
  });

  app.post('/optimize', { preHandler: [requireAdmin] }, async () => {
    const allUsers = await db.select({ id: users.id, username: users.username }).from(users);
    const results = [];
    for (const u of allUsers) {
      const r = await optimizeForUser(u.id);
      results.push({
        user_id: u.id,
        username: u.username,
        review_count: r.review_count,
        optimized: r.optimized,
        error: r.error ?? null,
      });
    }
    return { results };
  });

  app.post('/optimize/reset', { preHandler: [requireAdmin] }, async () => {
    const allUsers = await db.select({ id: users.id }).from(users);
    let reset = 0;
    for (const u of allUsers) {
      reset += await resetUserParams(u.id);
    }
    return { reset };
  });
}
