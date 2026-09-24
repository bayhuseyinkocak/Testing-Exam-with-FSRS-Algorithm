import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../plugins/auth';
import { getOverview } from '../services/stats';

export default async function statsRoutes(app: FastifyInstance) {
  app.get('/overview', { preHandler: [requireAuth] }, async (request) => {
    return getOverview(request.user.id);
  });
}
