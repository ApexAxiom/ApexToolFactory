import { Router, type Request, type Response } from "express";

import { searchWikidata } from "../lib/wikidata.js";
import { fetchSummary } from "../lib/wikipedia.js";
import { sanitize } from "../lib/sanitize.js";

const router: ReturnType<typeof Router> = Router();

router.post("/", async (req: Request, res: Response) => {
  const payload = req.body as { text?: unknown };
  const query = sanitize(typeof payload?.text === "string" ? payload.text : "");

  if (!query) {
    return res.status(400).json({ error: "text required" });
  }

  try {
    const [items, summary] = await Promise.all([
      searchWikidata(query),
      fetchSummary(query)
    ]);

    const sorted = [...items].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));

    return res.json({ query, items: sorted, summary });
  } catch (error) {
    // eslint-disable-next-line no-console -- observability for integrations
    console.error("Entity lookup failed", error);
    return res.status(502).json({ error: "Unable to resolve entities" });
  }
});

export default router;
