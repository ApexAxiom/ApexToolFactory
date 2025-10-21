import { ulid } from "ulid";

/**
 * Generates a ULID identifier suitable for S3 document keys.
 * @returns A unique ULID string.
 * @example
 * ```ts
 * const id = newId();
 * ```
 */
export const newId = () => ulid();

/**
 * Produces a YYYYMMDD string for the current day.
 * @returns String representation of the current date.
 * @example
 * ```ts
 * const serialKey = todayYmd();
 * ```
 */
export const todayYmd = () => new Date().toISOString().slice(0,10).replace(/-/g,"");