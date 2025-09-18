import { Router, type Request, type Response } from "express";

import { searchImages } from "../lib/googleImages.js";
import { sanitize } from "../lib/sanitize.js";

const router: ReturnType<typeof Router> = Router();

router.get("/images", async (req: Request, res: Response) => {
  const raw = typeof req.query.q === "string" ? req.query.q : "";
  const query = sanitize(raw);

  if (!query) {
    return res.json({ query: "", results: [] });
  }

  try {
    const results = await searchImages(query);
    return res.json({ query, results });
  } catch (error) {
    // eslint-disable-next-line no-console -- surface provider failure for observability
    console.error("Image search failed", error);
    return res.status(502).json({ error: "Unable to load images" });
  }
});

export default router;
