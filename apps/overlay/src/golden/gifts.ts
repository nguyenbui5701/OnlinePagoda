import { z } from 'zod';
import config from './gifts.json';
export const giftMappingSchema = z.object({
  giftId: z.string().regex(/^\d{1,30}$/),
  label: z.string().trim().min(1).max(22).regex(/^[\p{L}\p{N}\s-]+$/u),
  effect: z.enum(['lotus', 'candle', 'bell']),
  verified: z.literal(true)
});
export const giftConfigSchema = z.object({ mappings: z.array(giftMappingSchema).max(64).refine(rows => new Set(rows.map(r => r.giftId)).size === rows.length) });
const parsed = giftConfigSchema.safeParse(config);
export const giftMappings = parsed.success ? parsed.data.mappings : [];
