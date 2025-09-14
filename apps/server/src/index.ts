import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
app.use(helmet());
app.use(cors());

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/_health', (_req, res) => {
  res.json({ status: 'ok' });
});

const port = process.env.PORT || 8787;
app.listen(Number(port), '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`server running on ${port}`);
});

export default app;
