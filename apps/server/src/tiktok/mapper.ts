import { z } from 'zod';
import { rawEventSchema, safeAvatarUrl, type RawEvent } from '@vuonsen/shared';

export const webcastTypes = ['chat', 'member', 'gift', 'like', 'roomUser'] as const;
export type WebcastType = typeof webcastTypes[number];
const id = z.string().trim().max(160).optional();
const commonSchema = z.object({ msgId: id, roomId: id, createTime: id }).optional();
const userSchema = z.object({ id, displayId: id, nickname: z.string().max(500).optional() }).optional();
const baseSchema = z.object({ common: commonSchema, user: userSchema });
const chatSchema = baseSchema.extend({ content: z.string().max(1000).refine(s => s.trim().length > 0) });
const giftSchema = baseSchema.extend({
  giftId: z.string().trim().min(1).max(80), groupId: id, orderId: id,
  toUser: z.object({ id }).optional(), repeatCount: z.number().int().min(1).max(9999),
  repeatEnd: z.number().int().min(0).max(1), gift: z.object({ type: z.number().int().min(0), name: z.string().max(120).optional(), diamondCount:z.number().int().min(0).max(10000000).optional() })
});
const likeSchema = baseSchema.extend({ count: z.number().int().min(0).max(1000000) });
const roomSchema = z.object({ common: commonSchema, total: z.string().regex(/^\d{1,20}$/) });
const nonzeroId = (value?: string) => value && !/^0+$/.test(value) ? value : undefined;
export type MappedEvent = { kind: 'event'; event: RawEvent } | { kind:'progress'; event:RawEvent } | { kind: 'viewers'; total: string } | { kind: 'ignored'; reason: string };

function avatarOf(raw:unknown):string|undefined {
  const user=(raw as {user?:Record<string,unknown>})?.user;
  for(const size of ['avatarThumb','avatarMedium','avatarLarge']){
    const list=(user?.[size] as {urlList?:unknown})?.urlList;
    if(Array.isArray(list))for(const value of list.slice(0,3)){const url=safeAvatarUrl(value);if(url)return url;}
  }
}
/** Modern fields only; the optional avatar is narrowed to one public CDN URL. */
export function mapTikTokEvent(type: WebcastType, raw: unknown, roomId: string, connectedSince: number): MappedEvent {
  const schema = type === 'chat' ? chatSchema : type === 'gift' ? giftSchema : type === 'like' ? likeSchema : type === 'roomUser' ? roomSchema : baseSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { kind: 'ignored', reason: 'Payload TikTok không hợp lệ' };
  const value = parsed.data;
  const messageRoom = nonzeroId(value.common?.roomId);
  if (messageRoom && messageRoom !== roomId) return { kind: 'ignored', reason: 'Sự kiện thuộc phòng khác' };
  const timestamp = Number(value.common?.createTime);
  const timestampMs = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  if (Number.isFinite(timestampMs) && timestampMs > 0 && timestampMs < connectedSince - 5000) return { kind: 'ignored', reason: 'Bỏ sự kiện lịch sử trước kết nối' };
  if (type === 'roomUser') return { kind: 'viewers', total: roomSchema.parse(raw).total };
  const user = baseSchema.parse(raw).user;
  const userId = nonzeroId(user?.id), uniqueId = nonzeroId(user?.displayId);
  if (!userId && !uniqueId) return { kind: 'ignored', reason: 'TikTok thiếu user.id và displayId' };
  const msgId = nonzeroId(value.common?.msgId);
  const event: RawEvent = { type, source: 'tiktok', scope: roomId, userId, uniqueId,
    nickname: user?.nickname || uniqueId || 'Khách an lành', avatarUrl:avatarOf(raw), eventId: msgId ? `${type}:${msgId}` : undefined };
  if (type === 'chat') event.text = chatSchema.parse(raw).content;
  if (type === 'like') event.likeCount = likeSchema.parse(raw).count;
  if (type === 'gift') {
    const gift = giftSchema.parse(raw);
    const group = nonzeroId(gift.groupId), order = nonzeroId(gift.orderId);
    // giftId denotes a product, never a transaction. Distinguish recipients and room in the streak key.
    event.gift = { ...(gift.gift.diamondCount?{unitCoins:gift.gift.diamondCount}:{}), id: gift.giftId, ...(gift.gift.name ? {name:gift.gift.name} : {}), count: gift.repeatCount, finished: gift.gift.type!==1||gift.repeatEnd===1,
      streakId: gift.gift.type === 1 && group ? JSON.stringify([gift.giftId, group, gift.toUser?.id || '']) : order ? `order:${order}` : undefined };
  }
  if(event.gift&&!event.gift.finished&&!event.gift.streakId)return {kind:'ignored',reason:'Combo chưa có định danh tin cậy'};
  const validated = rawEventSchema.safeParse(event);
  return validated.success ? { kind: validated.data.gift?.finished===false?'progress':'event', event: validated.data } : { kind: 'ignored', reason: 'Sự kiện TikTok vượt giới hạn ứng dụng' };
}

/** Copy only bounded selected fields into IPC, never tokens or a raw object graph. */
export function selectWireFields(type: WebcastType, raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const pick = (value: unknown, fields: string[]) => {
    if (!value || typeof value !== 'object') return undefined;
    const obj = value as Record<string, unknown>;
    return Object.fromEntries(fields.map(key => [key, obj[key]]));
  };
  const result: Record<string, unknown> = { common: pick(r.common, ['msgId', 'roomId', 'createTime']), user: pick(r.user, ['id', 'displayId', 'nickname']) };
  const avatar=avatarOf(raw);if(avatar&&result.user)(result.user as Record<string,unknown>).avatarThumb={urlList:[avatar]};
  if (type === 'chat') result.content = r.content;
  if (type === 'like') result.count = r.count;
  if (type === 'roomUser') result.total = r.total;
  if (type === 'gift') Object.assign(result, { giftId: r.giftId, groupId: r.groupId, orderId: r.orderId, repeatCount: r.repeatCount, repeatEnd: r.repeatEnd, gift: pick(r.gift, ['type', 'name', 'diamondCount']), toUser: pick(r.toUser, ['id']) });
  return result;
}
