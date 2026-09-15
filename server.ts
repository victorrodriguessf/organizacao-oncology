import express from 'express';
import { createAuth } from './auth';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); res.set('X-Content-Type-Options', 'nosniff'); next(); });
app.use('/api', express.json({ limit: '4kb' }));
const auth = await createAuth(root);
app.use('/api/auth', auth.router);
for (const name of ['library', 'workbook']) {
  app.get(`/api/${name}`, auth.requireAuth, async (_req, res) => {
    try { res.type('json').send(await readFile(path.join(root, 'data', `${name}.json`), 'utf8')); }
    catch { res.status(503).json({ error: 'Base indisponível. Execute a extração da planilha e recarregue.' }); }
  });
}
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', (_req, res) => res.status(404).json({ error: 'Recurso não encontrado.' }));
app.use(((error, _req, res, _next) => {
  const status = error?.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
  res.status(status).json({ error: status === 500 ? 'Não foi possível concluir a solicitação.' : 'Solicitação inválida.' });
}) as express.ErrorRequestHandler);
if (process.argv.includes('--production')) {
  app.use(express.static(path.join(root, 'dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ configFile: path.join(root, 'vite.config.ts'), root, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 3000);
app.listen(port, '127.0.0.1', () => console.log(`Oncology · http://127.0.0.1:${port}`));
