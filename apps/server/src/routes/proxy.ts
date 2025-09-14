import { Router } from 'express';

const router = Router();
router.get('/', (_req, res) => res.status(501).send());

export default router;
