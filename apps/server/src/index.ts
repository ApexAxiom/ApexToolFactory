import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { cfg, providers } from './config.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
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

app.get('/api/link', (req, res) => {
  const q = req.query.q as string;
  res.json({ query: q, results: [] });
});

app.get('/api/media', (req, res) => {
  const q = req.query.q as string;
  res.json({ query: q, results: [] });
});

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
