import 'dotenv/config';

export const env = {
  PORT: Number(process.env.PORT ?? 8787),
  HOST: process.env.HOST ?? '127.0.0.1',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5433/app',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const;
