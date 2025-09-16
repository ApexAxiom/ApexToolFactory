import path from 'node:path';
import { fileURLToPath } from 'node:url';

import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { cfg, providers } from './config.js';
import linkRouter from './routes/link.js';
import mediaRouter from './routes/media.js';
import proxyRouter from './routes/proxy.js';

const app: Express = express();
app.use(helmet());
app.use(cors({ origin: cfg.ALLOW_ORIGIN }));
app.use(express.json());

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', mode: cfg.BOOKLENS_MODE });
});

app.get('/api/_health', (_req, res) => {
  res.json({ status: 'ok', mode: cfg.BOOKLENS_MODE, providers: providers() });
});

app.get('/api/config', (_req, res) => {
  res.json({ mode: cfg.BOOKLENS_MODE, providers: providers() });
});

app.post('/api/entities', (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text) {
    return res.status(400).json({ error: 'text required' });
  }
  res.json([]);
});

app.use('/api/link', linkRouter);
app.use('/api/media', mediaRouter);
app.use('/api/proxy', proxyRouter);

if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDir = path.resolve(__dirname, '../../web/dist');
  app.use(express.static(clientDir));
}

const port = cfg.PORT;
app.listen(Number(port), '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`server running on ${port}`);
});

export default app;
