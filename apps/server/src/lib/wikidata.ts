import { requestJson } from "./http.js";
import { sanitize } from "./sanitize.js";
import { score } from "./scoring.js";
import type { Entity } from "./types.js";

interface WikidataSearchEntity {
  id: string;
  label: string;
  description?: string;
  concepturi?: string;
}

interface WikidataSearchResponse {
  search: WikidataSearchEntity[];
}

const ENDPOINT = new URL("https://www.wikidata.org/w/api.php");

ENDPOINT.searchParams.set("action", "wbsearchentities");
ENDPOINT.searchParams.set("format", "json");
ENDPOINT.searchParams.set("language", "en");
ENDPOINT.searchParams.set("uselang", "en");
ENDPOINT.searchParams.set("type", "item");
ENDPOINT.searchParams.set("limit", "5");

export async function searchWikidata(query: string): Promise<Entity[]> {
  const cleaned = sanitize(query);
  if (!cleaned) {
    return [];
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("search", cleaned);

  const data = await requestJson<WikidataSearchResponse>(url.toString(), {
    timeoutMs: 6000
  });

  return data.search.map((item, index) => {
    const entity: Entity = {
      id: item.id,
      label: item.label,
      rank: score(cleaned, item.label, index)
    };
    if (item.description !== undefined) entity.description = item.description;
    if (item.concepturi !== undefined) entity.url = item.concepturi;
    return entity;
  });
}
