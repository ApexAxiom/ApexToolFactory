import { Router, type Request, type Response } from 'express';
import { searchWikidata } from '../lib/wikidata.js';
import { fetchSummary } from '../lib/wikipedia.js';

const router: ReturnType<typeof Router> = Router();
router.post('/', async (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };
  if (!text) return res.status(400).json({ error: 'text required' });
  const items = await searchWikidata(text);
  const summary = await fetchSummary(text);
  res.json({ query: text, items, summary });
});

export default router;
