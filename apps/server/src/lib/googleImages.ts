export interface ImageResult {
  url: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

export async function searchImages(query: string): Promise<ImageResult[]> {
  void query;
  return [];
}
