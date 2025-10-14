/**
 * Emits a JSON-formatted info log to stdout.
 * @param message Short event name.
 * @param meta Additional structured metadata.
 * @example
 * logInfo('quote.created', { quoteId });
 */
export function logInfo(message: string, meta: Record<string, unknown> = {}) {
  const payload = { level: 'info', msg: message, ...meta };
  console.log(JSON.stringify(payload));
}

/**
 * Emits a JSON-formatted error log to stderr.
 * @param message Short event name.
 * @param meta Additional structured metadata.
 * @example
 * logError('quote.create.failed', { error: err.message });
 */
export function logError(message: string, meta: Record<string, unknown> = {}) {
  const payload = { level: 'error', msg: message, ...meta };
  console.error(JSON.stringify(payload));
}
