import { z } from 'zod';

const envSchema = z.object({
  BOOKLENS_MODE: z.enum(['demo', 'live']).default('demo'),
  PORT: z.coerce.number().default(8080),
  ALLOW_ORIGIN: z.string().default('*'),
  GOOGLE_CSE_API_KEY: z.string().optional(),
  GOOGLE_CSE_CX: z.string().optional(),
  OPENAI_API_KEY: z.string().optional()
});

export const cfg = envSchema.parse(process.env);
export const isLive = cfg.BOOKLENS_MODE === 'live';
export const isDemo = !isLive;

export function providers() {
  return {
    wikipedia: true,
    wikidata: true,
    googleCse: Boolean(cfg.GOOGLE_CSE_API_KEY && cfg.GOOGLE_CSE_CX),
    openai: Boolean(cfg.OPENAI_API_KEY)
  };
}
