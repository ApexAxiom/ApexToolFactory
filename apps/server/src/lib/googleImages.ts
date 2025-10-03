import { cfg } from "../config.js";
import { requestJson } from "./http.js";

export interface ImageResult {
  url: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

interface GoogleImageItem {
  link: string;
  image?: {
    width?: number;
    height?: number;
    thumbnailLink?: string;
  };
}

interface GoogleImageResponse {
  items?: GoogleImageItem[];
}

export async function searchImages(query: string): Promise<ImageResult[]> {
  if (!cfg.GOOGLE_CSE_API_KEY || !cfg.GOOGLE_CSE_CX) {
    return [];
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", cfg.GOOGLE_CSE_API_KEY);
  url.searchParams.set("cx", cfg.GOOGLE_CSE_CX);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("searchType", "image");
  url.searchParams.set("num", "6");
  url.searchParams.set("safe", "active");
  url.searchParams.set("imgSize", "medium");

  const data = await requestJson<GoogleImageResponse>(url.toString(), {
    timeoutMs: 6000
  });

  return (data.items ?? []).map((item) => {
    const result: ImageResult = { url: item.link };
    if (item.image?.width !== undefined) result.width = item.image.width;
    if (item.image?.height !== undefined) result.height = item.image.height;
    if (item.image?.thumbnailLink !== undefined) result.thumbnailUrl = item.image.thumbnailLink;
    return result;
  });
}
