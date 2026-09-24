import { buildApp } from '../src/app';

let appPromise: ReturnType<typeof buildApp> | null = null;

async function getApp() {
  if (!appPromise) appPromise = buildApp();
  return appPromise;
}

export default async function handler(req: any, res: any) {
  try {
    console.log('[handler]', req.method, req.url);
    if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    const app = await getApp();
    await app.ready();
    app.server.emit('request', req, res);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}
