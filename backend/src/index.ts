import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { env } from './config';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import examRoutes from './routes/exams';
import topicRoutes from './routes/topics';
import questionCollectionRoutes from './routes/questions';
import questionItemRoutes from './routes/questionItem';
import studyRoutes from './routes/study';
import statsRoutes from './routes/stats';

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: 'token', signed: false },
  });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  app.get('/api/health', async () => ({ ok: true }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(examRoutes, { prefix: '/api/exams' });
  await app.register(topicRoutes, { prefix: '/api/exams/:examId/topics' });
  await app.register(questionCollectionRoutes, { prefix: '/api/exams/:examId/questions' });
  await app.register(questionItemRoutes, { prefix: '/api/questions' });
  await app.register(studyRoutes, { prefix: '/api/study' });
  await app.register(statsRoutes, { prefix: '/api/stats' });

  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
