import { sanitize } from "./sanitize.js";

function tokenize(value: string): string[] {
  return sanitize(value)
    .toLowerCase()
    .split(' ')
    .filter(Boolean);
}

export function score(query: string, label: string, index: number): number {
  const tokensQuery = tokenize(query);
  const tokensLabel = tokenize(label);

  if (tokensQuery.length === 0 || tokensLabel.length === 0) {
    return Math.max(1, 100 - index);
  }

  const setQuery = new Set(tokensQuery);
  const setLabel = new Set(tokensLabel);
  let overlap = 0;

  for (const token of setLabel) {
    if (setQuery.has(token)) {
      overlap += 1;
    }
  }

  const unionSize = new Set([...tokensQuery, ...tokensLabel]).size || 1;
  const jaccard = overlap / unionSize;

  const startsWith = sanitize(label).toLowerCase().startsWith(sanitize(query).toLowerCase());
  const scoreBase = jaccard * 600;
  const prefixBonus = startsWith ? 200 : 0;
  const positionalPenalty = index * 15;

  return Math.max(1, Math.round(scoreBase + prefixBonus - positionalPenalty));
}
