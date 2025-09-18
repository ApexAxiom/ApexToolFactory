import { request, requestJson } from "./http.js";
import { sanitize } from "./sanitize.js";

interface WikiSummaryResponse {
  extract?: string;
}

type OpenSearchResponse = [string, string[], string[], string[]];

const SUMMARY_ENDPOINT = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const OPENSEARCH_ENDPOINT = new URL("https://en.wikipedia.org/w/api.php");

OPENSEARCH_ENDPOINT.searchParams.set("action", "opensearch");
OPENSEARCH_ENDPOINT.searchParams.set("format", "json");
OPENSEARCH_ENDPOINT.searchParams.set("limit", "1");
OPENSEARCH_ENDPOINT.searchParams.set("namespace", "0");
OPENSEARCH_ENDPOINT.searchParams.set("redirects", "resolve");

async function resolveTitle(query: string): Promise<string | null> {
  const trimmed = sanitize(query);
  if (!trimmed) {
    return null;
  }

  const url = new URL(OPENSEARCH_ENDPOINT);
  url.searchParams.set("search", trimmed);

  const data = await requestJson<OpenSearchResponse>(url.toString(), {
    timeoutMs: 5000
  });

  const titles = data[1];
  if (Array.isArray(titles) && titles.length > 0) {
    return titles[0];
  }

  return trimmed;
}

export async function fetchSummary(query: string): Promise<string> {
  const title = await resolveTitle(query);
  if (!title) {
    return "";
  }

  const summaryUrl = SUMMARY_ENDPOINT + encodeURIComponent(title);

  const response = await request(summaryUrl, { timeoutMs: 5000 });

  if (response.status === 404) {
    return "";
  }

  if (!response.ok) {
    throw new Error(`Summary request failed with status ${response.status}`);
  }

  const data = (await response.json()) as WikiSummaryResponse;
  return sanitize(data.extract ?? "");
}
