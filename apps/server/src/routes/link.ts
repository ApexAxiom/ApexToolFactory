import { Router } from 'express';

const router = Router();
router.post('/', (_req, res) => res.status(501).send());

export default router;
