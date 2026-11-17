import { z } from 'zod';
export const fortuneIntentSchema = z.discriminatedUnion('scope', [
  z.object({scope:z.literal('by_number'),number:z.number().int().min(1).max(576)}),
  z.object({scope:z.literal('chu_de'),theme:z.string().max(40).nullable()}),
  z.object({scope:z.enum(['con_giap','tan_mui_1991']),theme:z.string().min(1).max(40)})
]);
export type FortuneIntent = z.infer<typeof fortuneIntentSchema>;
export const fortuneRevealSchema = z.object({
  version:z.literal(1),revealId:z.string().min(1).max(100),sessionId:z.string().min(1).max(80),
  fortuneId:z.string().regex(/^DM27-\d{3}$/),number:z.number().int().min(1).max(576),
  displayName:z.string().min(1).max(80),theme:z.string().max(40),themeLabel:z.string().max(60),
  title:z.string().max(100),short:z.string().max(300),action:z.string().max(180),blessing:z.string().max(200),
  startedAt:z.number().finite(),expiresAt:z.number().finite()
});
export type FortuneReveal = z.infer<typeof fortuneRevealSchema>;
export interface FortuneStatus {
  available:boolean; queued:number; revealed:number; cooldown:number; alreadyToday:number;
  duplicate:number; busy:number; disabled:number;
}
