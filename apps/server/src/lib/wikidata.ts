export interface WikidataItem {
  id: string;
  label: string;
  description?: string;
}

export async function searchWikidata(query: string): Promise<WikidataItem[]> {
  void query;
  return [];
}
