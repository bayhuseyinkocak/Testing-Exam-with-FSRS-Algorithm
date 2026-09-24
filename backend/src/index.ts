import { buildApp } from './app';
import { env } from './config';

async function main() {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
