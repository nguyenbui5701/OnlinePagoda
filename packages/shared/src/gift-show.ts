import type { GiftConfirmed } from './gifts';
export type GiftTier=1|2|3|4;
export const giftVariants=['lotus','hearts','koi','candles','dragon','phoenix','long-phung'] as const;
export type GiftVariant=typeof giftVariants[number];
/** Deliberately lacks score/voice/ritual fields. Never pass a preview to GiftConfirmed consumers. */
export interface GiftPreview {comboKey:string;userKey:string;displayName:string;avatarUrl?:string;giftId:string;giftName:string;units:number;totalCoins?:undefined}
export interface GiftFlight {x:number;y:number;rise:number;angle:number;groupTier?:GiftTier;ornamentSpace?:'lotus';ornamentScale?:number;stageBottom?:number;ornaments:({x:number;y:number}|null)[]}
export interface GiftShow {flight?:GiftFlight;placement?:{x:number;y:number};promotedAt?:number;progressAtPromotion?:number;id:string;gift:GiftConfirmed|GiftPreview;phase?:'preview'|'confirmed';tier:GiftTier;variant:GiftVariant;lane:0|1|2;jitter:number;startedAt:number;endsAt:number}
export interface GiftShowStatus {active:GiftShow[];queued:number;shown:number;expired:number;overflow:number;unknownValue:number;received?:number;previews?:number;pendingCombos?:number}
export function giftTier(total?:number):GiftTier{return total===undefined?3:total>=30?4:total>=10?3:total>=5?2:1;}
export function stableSeed(value:string){let n=2166136261;for(const c of value)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
