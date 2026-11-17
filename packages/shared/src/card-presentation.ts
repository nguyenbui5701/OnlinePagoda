/** Visual lifetime only. Never use this deadline to expire queues or audio. */
export const CARD_VISIBLE_MS = 4000;
export function cardPresentation(card:{startedAt:number;expiresAt:number},now:number){
 const displayEndsAt=Math.min(card.expiresAt,card.startedAt+CARD_VISIBLE_MS);
 const duration=Math.max(1,displayEndsAt-card.startedAt);
 const progress=Math.max(0,Math.min(1,(now-card.startedAt)/duration));
 return {displayEndsAt,visible:now>=card.startedAt&&now<displayEndsAt,progress,
  alpha:Math.max(0,Math.min(1,(now-card.startedAt)/180,(displayEndsAt-now)/180))};
}
