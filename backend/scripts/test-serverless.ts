import http from 'node:http';
import { buildApp } from '../src/app';

async function main() {
  const app = await buildApp();
  await app.ready();

  const server = http.createServer((req, res) => {
    app.server.emit('request', req, res);
  });

  const port = 8790;
  server.listen(port, () => {
    console.log('serverless simülasyonu dinliyor: ' + port);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
