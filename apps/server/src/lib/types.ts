export interface Entity {
  id: string;
  label: string;
  description?: string;
  url?: string;
  rank?: number;
}

export interface EntityPayload {
  query: string;
  items: Entity[];
  summary: string | null;
}
