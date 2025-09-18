const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent": "Book Lens Service/1.0"
};

type RequestInput = Parameters<typeof fetch>[0];
type RequestOptions = (Parameters<typeof fetch>[1] extends undefined
  ? Record<string, never>
  : NonNullable<Parameters<typeof fetch>[1]>) & {
  timeoutMs?: number;
};

export async function request(
  input: RequestInput,
  { timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...init }: RequestOptions = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      headers: { ...DEFAULT_HEADERS, ...(headers as Record<string, string> | undefined) },
      signal: controller.signal
    });

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestJson<T>(
  input: RequestInput,
  options?: RequestOptions
): Promise<T> {
  const response = await request(input, options);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}
