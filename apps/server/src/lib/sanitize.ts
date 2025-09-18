const TRIM_REGEX = /\s+/g;

export function sanitize(text: string | null | undefined): string {
  if (typeof text !== 'string') {
    return '';
  }

  return text
    .normalize('NFKC')
    .replace(TRIM_REGEX, ' ')
    .trim();
}
