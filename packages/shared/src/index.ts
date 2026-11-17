export * from './effect-space';
export * from './gift-flight';
export * from './interaction-timing';
import { z } from 'zod';
import { usernameSchema, type LiveConnectionState, type SourceMode } from './live';
import { defaultGiftCatalog, giftCatalogSchema, giftGroupSchema, type GiftConfirmed, type LeaderboardEntry, type ObservedGift } from './gifts';
export * from './gifts';
export * from './gift-show';
export * from './petals';
import type {GiftShowStatus} from './gift-show';
export * from './live';
export * from './fortune';
export * from './lantern';
export * from './environment';
export * from './camera';
export * from './camera-motion';
export * from './card-presentation';
export * from './floor-v2';
export * from './ground-routes';
import type {ActorTravel,CeremonyJourney} from './ground-routes';
import type {CameraState,CameraDisplay} from './camera';
import type { EnvironmentState } from './environment';
import type { LanternTopic, LanternReveal, LanternStatus } from './lantern';
import type { FortuneIntent, FortuneReveal, FortuneStatus } from './fortune';

export const settingsSchema = z.object({
  templeFloorPreview:z.boolean().default(false),
  walkSpeed:z.number().min(100).max(240).default(160),
  cameraAuto:z.boolean().default(false),
  cameraDriftEnabled:z.boolean().default(false),
  cameraDriftSpeed:z.enum(['slow','medium','fast']).default('fast'),
  cameraGiftFocusEnabled:z.boolean().default(false),
  cameraHoldSeconds:z.number().int().min(15).max(180).default(60),
  cameraFade:z.boolean().default(true),
  cameraView:z.enum(['front','left','right','wide']).default('front'),
  cameraRemember:z.boolean().default(true),
  sceneSpace:z.enum(['hall','courtyard']).default('hall'),
  sceneLight:z.enum(['auto','day','sunset','night']).default('day'),
  sceneLightIntensity:z.number().min(.3).max(1).default(1),
  weatherAuto:z.boolean().default(false),
  weatherPreset:z.enum(['leaves','petals']).default('leaves'),
  giftTierEffects:z.boolean().default(true),
  compactGiftPanels: z.boolean().default(true),
  actorSize: z.number().min(1).max(1.8).default(1.45),
  idleActivities: z.boolean().default(true),
  giftCameraEnabled: z.boolean().default(true),
  chatBlockedWords: z.array(z.string().trim().min(1).max(40)).max(100).default([]),
  commentEffectsEnabled: z.boolean().default(true),
  showBlessingTree:z.boolean().default(false),
  flowerStyle:z.enum(['auto','pink','ivory','gold','peach']).default('auto'),
  petalDensity:z.enum(['low','medium','high']).default('medium'),
  treeEnabled: z.boolean().default(false),
  treeTarget: z.number().int().min(100).max(1000000).default(1000),
  standingMinutes: z.number().min(1).max(30).default(5),
  liveSafeLayout: z.boolean().default(true),
  lanternEnabled: z.boolean().default(false),
  lanternVoiceEnabled:z.boolean().default(true), lanternVolume:z.number().min(0).max(1).default(.8),
  speechBoost:z.number().min(1).max(3).default(1),
  templeName: z.string().trim().min(1).max(48).default('Vườn Sen An Lành'),
  maxActors: z.number().int().min(1).max(100).default(100),
  idleMinutes: z.number().min(0.1).max(60).default(8),
  animationSpeed: z.number().min(0.4).max(3).default(1),
  effectIntensity: z.number().min(0).max(1).default(0.65),
  showGuide: z.boolean().default(true), showRegister: z.boolean().default(true),
  showLabels: z.boolean().default(true), effects: z.boolean().default(true),
  showGiftThanks: z.boolean().default(true), autoJoinChat: z.boolean().default(true),
  autoJoinMember: z.boolean().default(false), safeRight: z.number().min(0).max(160).default(0),
  safeBottom: z.number().min(0).max(240).default(0),
  tiktokUsername: z.union([z.literal(''), usernameSchema]).default(''),
  likeEffects: z.boolean().default(false),
  theme: z.enum(['classic', 'golden']).default('golden'),
  showGiftPanel: z.boolean().default(true), showThanksPanel: z.boolean().default(true),
  showTicker: z.boolean().default(true), showBubbles: z.boolean().default(true),
  glow: z.boolean().default(true), smoke: z.boolean().default(true),
  flowers: z.boolean().default(true), candles: z.boolean().default(true),
  reducedEffects: z.boolean().default(false),
  giftCatalog: giftCatalogSchema.default(defaultGiftCatalog),
  masterMute: z.boolean().default(false), voiceVolume: z.number().min(0).max(1).default(.8),
  sfxVolume: z.number().min(0).max(1).default(.65), ambienceVolume: z.number().min(0).max(1).default(.15),
  ambienceEnabled: z.boolean().default(false), voiceMode: z.enum(['auto','fallback']).default('fallback'),
  voiceURI: z.string().max(250).default(''),
  fortuneEnabled: z.boolean().default(true), fortuneVoiceEnabled: z.boolean().default(false),
  fortuneVolume: z.number().min(0).max(1).default(.5),
  fortuneIntervalSeconds: z.number().int().min(7).max(30).default(7)
});
export type Settings = z.infer<typeof settingsSchema>;
export const defaultSettings = settingsSchema.parse({});
// Patch fields must not apply creation defaults: editing one slider preserves all other settings.
export const settingsPatchSchema = z.object({
  templeFloorPreview:settingsSchema.shape.templeFloorPreview.removeDefault().optional(),
  walkSpeed:settingsSchema.shape.walkSpeed.removeDefault().optional(),
  cameraAuto:settingsSchema.shape.cameraAuto.removeDefault().optional(),
  cameraDriftEnabled:settingsSchema.shape.cameraDriftEnabled.removeDefault().optional(),
  cameraDriftSpeed:settingsSchema.shape.cameraDriftSpeed.removeDefault().optional(),
  cameraGiftFocusEnabled:settingsSchema.shape.cameraGiftFocusEnabled.removeDefault().optional(),
  cameraHoldSeconds:settingsSchema.shape.cameraHoldSeconds.removeDefault().optional(),
  cameraFade:settingsSchema.shape.cameraFade.removeDefault().optional(),
  cameraView:settingsSchema.shape.cameraView.removeDefault().optional(),
  cameraRemember:settingsSchema.shape.cameraRemember.removeDefault().optional(),
  showBlessingTree:settingsSchema.shape.showBlessingTree.removeDefault().optional(),
  flowerStyle:settingsSchema.shape.flowerStyle.removeDefault().optional(),
  petalDensity:settingsSchema.shape.petalDensity.removeDefault().optional(),
  giftTierEffects:settingsSchema.shape.giftTierEffects.removeDefault().optional(),
  lanternVoiceEnabled:settingsSchema.shape.lanternVoiceEnabled.removeDefault().optional(),
  lanternVolume:settingsSchema.shape.lanternVolume.removeDefault().optional(),
  speechBoost:settingsSchema.shape.speechBoost.removeDefault().optional(),
  sceneSpace:settingsSchema.shape.sceneSpace.removeDefault().optional(),
  sceneLight:settingsSchema.shape.sceneLight.removeDefault().optional(),
  sceneLightIntensity:settingsSchema.shape.sceneLightIntensity.removeDefault().optional(),
  weatherAuto:settingsSchema.shape.weatherAuto.removeDefault().optional(),
  weatherPreset:settingsSchema.shape.weatherPreset.removeDefault().optional(),
  compactGiftPanels: settingsSchema.shape.compactGiftPanels.removeDefault().optional(),
  actorSize: settingsSchema.shape.actorSize.removeDefault().optional(),
  idleActivities: settingsSchema.shape.idleActivities.removeDefault().optional(),
  giftCameraEnabled: settingsSchema.shape.giftCameraEnabled.removeDefault().optional(),
  chatBlockedWords: settingsSchema.shape.chatBlockedWords.removeDefault().optional(),
  commentEffectsEnabled: settingsSchema.shape.commentEffectsEnabled.removeDefault().optional(),
  treeEnabled: settingsSchema.shape.treeEnabled.removeDefault().optional(),
  treeTarget: settingsSchema.shape.treeTarget.removeDefault().optional(),
  standingMinutes: settingsSchema.shape.standingMinutes.removeDefault().optional(),
  liveSafeLayout: settingsSchema.shape.liveSafeLayout.removeDefault().optional(),
  lanternEnabled: settingsSchema.shape.lanternEnabled.removeDefault().optional(),
  templeName: settingsSchema.shape.templeName.removeDefault().optional(),
  maxActors: settingsSchema.shape.maxActors.removeDefault().optional(),
  idleMinutes: settingsSchema.shape.idleMinutes.removeDefault().optional(),
  animationSpeed: settingsSchema.shape.animationSpeed.removeDefault().optional(),
  effectIntensity: settingsSchema.shape.effectIntensity.removeDefault().optional(),
  showGuide: settingsSchema.shape.showGuide.removeDefault().optional(),
  showRegister: settingsSchema.shape.showRegister.removeDefault().optional(),
  showLabels: settingsSchema.shape.showLabels.removeDefault().optional(),
  effects: settingsSchema.shape.effects.removeDefault().optional(),
  showGiftThanks: settingsSchema.shape.showGiftThanks.removeDefault().optional(),
  autoJoinChat: settingsSchema.shape.autoJoinChat.removeDefault().optional(),
  autoJoinMember: settingsSchema.shape.autoJoinMember.removeDefault().optional(),
  safeRight: settingsSchema.shape.safeRight.removeDefault().optional(),
  safeBottom: settingsSchema.shape.safeBottom.removeDefault().optional(),
  tiktokUsername: settingsSchema.shape.tiktokUsername.removeDefault().optional(),
  likeEffects: settingsSchema.shape.likeEffects.removeDefault().optional(),
  theme: settingsSchema.shape.theme.removeDefault().optional(),
  showGiftPanel: settingsSchema.shape.showGiftPanel.removeDefault().optional(),
  showThanksPanel: settingsSchema.shape.showThanksPanel.removeDefault().optional(),
  showTicker: settingsSchema.shape.showTicker.removeDefault().optional(),
  showBubbles: settingsSchema.shape.showBubbles.removeDefault().optional(),
  glow: settingsSchema.shape.glow.removeDefault().optional(),
  smoke: settingsSchema.shape.smoke.removeDefault().optional(),
  flowers: settingsSchema.shape.flowers.removeDefault().optional(),
  candles: settingsSchema.shape.candles.removeDefault().optional(),
  reducedEffects: settingsSchema.shape.reducedEffects.removeDefault().optional(),
  giftCatalog: giftCatalogSchema.optional(),
  masterMute: settingsSchema.shape.masterMute.removeDefault().optional(),
  voiceVolume: settingsSchema.shape.voiceVolume.removeDefault().optional(),
  sfxVolume: settingsSchema.shape.sfxVolume.removeDefault().optional(),
  ambienceVolume: settingsSchema.shape.ambienceVolume.removeDefault().optional(),
  ambienceEnabled: settingsSchema.shape.ambienceEnabled.removeDefault().optional(),
  voiceMode: settingsSchema.shape.voiceMode.removeDefault().optional(),
  voiceURI: settingsSchema.shape.voiceURI.removeDefault().optional(),
  fortuneEnabled: settingsSchema.shape.fortuneEnabled.removeDefault().optional(),
  fortuneVoiceEnabled: settingsSchema.shape.fortuneVoiceEnabled.removeDefault().optional(),
  fortuneVolume: settingsSchema.shape.fortuneVolume.removeDefault().optional(),
  fortuneIntervalSeconds: settingsSchema.shape.fortuneIntervalSeconds.removeDefault().optional()
});
import {safeAvatarUrl} from './avatar';
export {safeAvatarUrl} from './avatar';
export const rawEventSchema = z.object({
  avatarUrl: z.string().max(2048).optional(),
  type: z.enum(['chat', 'member', 'gift', 'like']), source: z.enum(['demo', 'tiktok']).default('demo'),
  scope: z.string().trim().min(1).max(160).optional(),
  eventId: z.string().min(1).max(160).optional(), userId: z.string().max(160).optional(),
  uniqueId: z.string().max(160).optional(), nickname: z.string().max(500).default('Khách an lành'),
  text: z.string().max(1000).default(''), likeCount: z.number().int().min(0).max(1000000).optional(),
  gift: z.object({ unitCoins:z.number().int().min(1).max(10000000).optional(), id: z.string().min(1).max(80), name: z.string().max(120).optional(), demoGroup: giftGroupSchema.optional(), count: z.number().int().min(1).max(9999), streakId: z.string().max(300).optional(), finished: z.boolean() }).optional()
}).refine(e => e.source !== 'tiktok' || Boolean(e.scope), { message: 'TikTok event requires a room scope' });
export type RawEvent = z.input<typeof rawEventSchema>;
// Internal intent only: rawEventSchema strips any browser-supplied fortuneIntent.
export interface DomainEvent { communityIntent?: {kind:'seat'|'bow'|'chant'|'incense'}|{kind:'effect';effect:CommentEffectKind}; chatText?: string; fortuneIntent?: FortuneIntent }
export interface DomainEvent { lanternIntent?: LanternTopic; avatarUrl?: string }
export interface DomainEvent { type: z.infer<typeof rawEventSchema>['type']; source: SourceMode; scope?: string; userKey: string; displayName: string; eventId?: string; keyword: 'lotus' | 'pray' | 'chat'; time: number; likeCount?: number; gift?: z.infer<typeof rawEventSchema>['gift'] }
export type ActorStatus = 'standing' | 'to-standing' | 'enter' | 'walk' | 'kneel' | 'pray' | 'idle' | 'exit';
export interface Seat { id: string; x: number; y: number; scale: number; side: 'left' | 'right' }
export interface WelcomeVisit { queuedAt: number; startedAt?: number; durationMs: number; lane: number; row?: number; reason?: 'welcome'|'bow'; origin?: Seat; journey?:CeremonyJourney }
export interface Actor { key: string; displayName: string; seatId: string; variant: number; joinedAt: number; lastActiveAt: number; status: ActorStatus; statusAt: number; welcome?: WelcomeVisit; standingSlot?: number; standingSince?: number; transitionFrom?: Seat; chantUntil?: number; travel?:ActorTravel }
/** Single centrally scheduled incense offering; snapshots and deltas resume at the same position. */
export interface OfferingRitual { actorId: string; seatId: string; startedAt: number; durationMs: number; source?:'gift'|'comment';journey?:CeremonyJourney; effect?: 'rose'|'candle'|'heart'|'lotus'|'bell'|'offering'|'fish'|'lantern'|'dragon' }
export interface SceneState {movement?:{enabled:boolean;moving:number;waiting:number;incenseQueued:number;incenseCompleted:number;incenseExpired:number;incenseCooldown:number;incenseBusy:number}}
export interface Toast { id: number; text: string; expiresAt: number }
export interface SceneAction { id: number; type: 'TREE_BLOOM' | 'COMMENT_EFFECT' | 'CHANT' | 'CHAT_BUBBLE' | 'USER_JOINED' | 'PRAY' | 'LOTUS_BLOOM' | 'GIFT_THANKS' | 'GIFT_CONFIRMED' | 'USER_EXITED' | 'LIKE_PULSE' | 'FORTUNE_REVEAL' | 'LANTERN_REVEAL'; actorId: string; at: number; commentEffect?: CommentEffect; bubble?: { text: string; expiresAt: number }; gift?: { id: string; count: number; displayName: string }; confirmedGift?: GiftConfirmed; fortune?: FortuneReveal; lantern?:LanternReveal }
export interface LogEntry { id: number; at: number; text: string }
export interface Metrics { cameraDisplays?:CameraDisplay[]; received: number; dropped: number; reasons: Record<string, number>; perSecond: number; pending: number; overlayCount: number; fps: number; quality: string; newActors: number; giftUnits: number; giftTransactions: number; likeUnits: number }
export interface SceneState { ritual?: OfferingRitual; sessionId: string; revision: number; serverTime: number; settings: Settings; actors: Actor[]; queue: number; total: number; recent: string[]; toasts: Toast[]; logs: LogEntry[]; metrics: Metrics; provider: 'connected' | 'reconnecting'; mode: SourceMode; connection: LiveConnectionState; leaderboard?: LeaderboardEntry[]; recentGifts?: GiftConfirmed[]; observedGifts?: ObservedGift[] }
export interface SceneDelta extends Omit<SceneState, 'actors'> { upserts: Actor[]; removed: string[]; actions: SceneAction[] }
export interface SceneState { fortune?: FortuneReveal; fortuneStatus?: FortuneStatus }
export interface SceneState { lantern?:LanternReveal; lanternStatus?:LanternStatus }
export const commandSchema = z.discriminatedUnion('type', [
  z.object({type:z.literal('camera-view'),view:z.enum(['front','left','right','wide'])}),
  z.object({type:z.literal('camera-stop')}),
  z.object({type:z.literal('weather'),preset:z.enum(['leaves','petals','stop'])}),
  z.object({ type: z.literal('add'), count: z.union([z.literal(1), z.literal(10), z.literal(100)]) }),
  z.object({ type: z.literal('event'), event: rawEventSchema.refine(e => e.source === 'demo', 'Chỉ được gửi event demo từ dashboard') }),
  z.object({ type: z.literal('reset') }), z.object({ type: z.literal('disconnect') }), z.object({ type: z.literal('retry') }),
  z.object({ type: z.literal('settings'), patch: settingsPatchSchema }),
  z.object({ type: z.literal('gift-demo'), group: giftGroupSchema, userId: z.string().min(1).max(160), nickname: z.string().max(500), units: z.number().int().min(1).max(9999).default(1) }),
  z.object({ type: z.literal('source'), mode: z.enum(['demo', 'tiktok']) }),
  z.object({ type: z.literal('live-connect'), username: usernameSchema }),
  z.object({ type: z.literal('live-disconnect') }),
  z.object({ type: z.literal('live-retry') })
]);
export type Command = z.input<typeof commandSchema>;
export interface SceneState { camera?:CameraState; environment?:EnvironmentState; giftShow?:GiftShowStatus }
export interface Reply { ok: boolean; error?: string }
export function cleanText(input: string, limit = 18): string {
  const value = input.normalize('NFC').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, '').replace(/(?:https?:\/\/|www\.)\S+/gi, '').replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/g, ' ').trim();
  const chars = Array.from(value);
  return chars.length > limit ? chars.slice(0, limit - 1).join('') + '…' : value;
}
export function normalizeKeyword(text: string): DomainEvent['keyword'] {
  const value = text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ');
  if (/\b(cau an|binh an|suc khoe)\b/.test(value)) return 'lotus';
  return /\b(le phat|a di da phat)\b/.test(value) ? 'pray' : 'chat';
}
export function normalizeEvent(raw: unknown, session: string, time: number): DomainEvent | null {
  const parsed = rawEventSchema.safeParse(raw);
  if (!parsed.success) return null;
  const e = parsed.data;
  const id = e.userId?.trim() || e.uniqueId?.trim();
  if (!id) return null;
  const field = e.userId?.trim() ? 'userId' : e.source === 'tiktok' ? 'displayId' : 'uniqueId';
  return { type: e.type, source: e.source, scope: e.scope, avatarUrl:safeAvatarUrl(e.avatarUrl), userKey: `${e.source}:${encodeURIComponent(e.source === 'tiktok' ? e.scope! : session)}:${field}:${encodeURIComponent(id)}`, displayName: cleanText(e.nickname) || 'Khách an lành', eventId: e.eventId, keyword: normalizeKeyword(e.text), time, gift: e.gift, likeCount: e.likeCount };
}
export const seats: Seat[] = Array.from({ length: 100 }, (_, index) => {
  const row=Math.floor(index/10),col=index%5,left=index%10<5;
  return {id:`seat-${index}`,x:left?55+col*85:685+col*85,y:1110+row*73,scale:.60+row*.025,side:left?'left':'right'};
});
export function isStanding(actor:Actor) { return actor.seatId.startsWith('standing-'); }
export function actorHome(actor:Actor):Seat {
  const seat=seats.find(s=>s.id===actor.seatId);if(seat)return seat;
  const i=actor.standingSlot??0;
  return {id:actor.seatId,x:60+(i%10)*106,y:1785+Math.floor(i/10)*76,scale:.75,side:i%10<5?'left':'right'};
}
export interface PrayerStatus {queued:number;active:number;completed:number;expired:number;cooldown:number;busy:number}
export interface SceneState { room?: {seated:number;standing:number;visibleStanding:number}; prayerStatus?:PrayerStatus }
export function applyDelta(state: SceneState, delta: SceneDelta): SceneState {
  const map = new Map(state.actors.map(a => [a.key, a]));
  delta.removed.forEach(key => map.delete(key)); delta.upserts.forEach(a => map.set(a.key, a));
  const { upserts: _u, removed: _r, actions: _a, ...rest } = delta;
  return { ...rest, actors: [...map.values()] };
}

export type CommentEffectKind='candle'|'heart'|'lotus'|'bell'|'offering'|'fish'|'dragon'|'phoenix'|'long-phung'|'sen-heart'|'sen-fish'|'sen-candle';
export const commentEffectLabels:Record<CommentEffectKind,string>={candle:'Thắp nến',heart:'Trái tim',lotus:'Hoa sen',bell:'Thỉnh chuông',offering:'Ngũ quả',fish:'Cá chép',dragon:'Rồng vàng',phoenix:'Phượng hoàng','long-phung':'Long phụng','sen-heart':'Sen yêu thương','sen-fish':'Sen cá chép','sen-candle':'Sen ánh nến'};
export const effectInstructions=[
  {command:'thắp nến',description:'Nến vàng lung linh',icon:'❀'},
  {command:'trái tim',description:'Gửi chút yêu thương',icon:'♡'},
  {command:'hoa sen',description:'Đóa sen an lành',icon:'❃'},
  {command:'chuông',description:'Chuông bình an',icon:'◉'},
  {command:'ngũ quả',description:'Mâm quả rực rỡ',icon:'♧'},
  {command:'cá chép',description:'Cá vàng lướt nhẹ',icon:'≈'},
  {command:'rồng vàng',description:'Kim long tỏa sáng',icon:'☼'},
  {command:'hoa đăng',description:'Gửi lời cầu an',icon:'◇'},
  {command:'phượng hoàng',description:'Cánh phượng vàng',icon:'❀'},
  {command:'long phụng',description:'Rồng phượng hòa ca',icon:'☼'},
  {command:'sen yêu thương',description:'Sen cùng tim vàng',icon:'♡'},
  {command:'sen cá chép',description:'Đôi cá bên sen',icon:'≈'},
  {command:'sen ánh nến',description:'Ánh nến bên sen',icon:'❃'}
] as const;
export interface CommentEffect {id:string;actorId:string;displayName:string;avatarUrl?:string;effect:CommentEffectKind;startedAt:number;expiresAt:number}
export interface SceneState {commentEffects?:CommentEffect[];commentEffectStatus?:{shown:number;cooldown:number;busy:number;expired:number;preempted:number;queued:number;active:number}}
export interface BlessingTreeState {enabled:boolean;phase:'growing'|'bloom';target:number;nextTarget:number;progress:number;total:number;completed:number;cycle:number;startedAt?:number;endsAt?:number}
export interface SceneState {tree?:BlessingTreeState}
