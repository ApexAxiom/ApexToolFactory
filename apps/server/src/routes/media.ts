import { Router, type Request, type Response } from 'express';
import { searchImages } from '../lib/googleImages.js';

const router: ReturnType<typeof Router> = Router();
router.get('/images', async (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  const results = q ? await searchImages(q) : [];
  res.json({ query: q, results });
});

export default router;
