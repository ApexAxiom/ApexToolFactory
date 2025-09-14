import { Router } from 'express';

const router = Router();
router.get('/images', (_req, res) => res.status(501).send());

export default router;
