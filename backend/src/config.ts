import 'dotenv/config';

export const env = {
  PORT: Number(process.env.PORT ?? 8787),
  HOST: process.env.HOST ?? '127.0.0.1',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  DATABASE_PATH: process.env.DATABASE_PATH ?? './data/app.db',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const;
