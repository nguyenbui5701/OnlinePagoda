import {comboKey} from './combo-key';
import { createHash, randomUUID } from 'node:crypto';
import { giftTier, cleanText, giftDefinitions, type DomainEvent, type GiftConfirmed, type LeaderboardEntry, type ObservedGift, type Settings } from '@vuonsen/shared';
export class GiftScoreboard {
  private seen = new Set<string>(); private donors = new Map<string, LeaderboardEntry>(); private sequence = 0;
  recent: GiftConfirmed[] = []; observed: ObservedGift[] = [];
  confirm(e: DomainEvent, settings: Settings, session: string): GiftConfirmed | null {
    if (!e.gift?.finished) return null;
    const identity = [e.source, e.scope || session, e.userKey, e.gift.id];
    const hash = (parts: unknown[]) => createHash('sha256').update(JSON.stringify(parts)).digest('hex');
    const keys = [e.eventId && hash([e.source,e.scope || session,e.eventId]), e.gift.streakId && hash([...identity,e.gift.streakId])].filter(Boolean) as string[];
    // Session-long transaction dedupe: never evict then recount old gifts.
    if (keys.some(k => this.seen.has(k)) || this.seen.size >= 200000) return null;
    if (!keys.length) keys.push(randomUUID()); keys.forEach(k => this.seen.add(k));
    const demo = e.source === 'demo' && e.gift.demoGroup ? giftDefinitions.find(d => d.group === e.gift!.demoGroup) : undefined;
    const mapping = settings.giftCatalog.find(g => g.verified && g.giftId === e.gift!.id);
    const definition = giftDefinitions.find(d => d.group === (demo?.group || mapping?.group));
    const unitCoins=e.gift.unitCoins??mapping?.unitCoins;
    const totalCoins=unitCoins===undefined?undefined:unitCoins*e.gift.count;
    const gift: GiftConfirmed = { version:1, unitCoins,totalCoins,comboKey:comboKey(e,session),tier:!demo&&!mapping?Math.max(3,giftTier(totalCoins)) as 3|4:giftTier(totalCoins),valueSource:e.gift.unitCoins!==undefined?'payload':unitCoins!==undefined?'catalog':'unknown', eventKey:keys[0], source:e.source, roomId:e.scope || session,
      userId:decodeURIComponent(e.userKey.split(':').at(-1)!), userKey:e.userKey, displayName:e.displayName, avatarUrl:e.avatarUrl,
      giftId:e.gift.id, giftName:cleanText(e.gift.name || demo?.label || mapping?.label || 'Quà tặng',28) || 'Quà tặng',
      units:e.gift.count, receivedAt:e.time, mappedEffect:demo?.effect || mapping?.effect || 'lotus',
      thanksTemplateKey:demo?.group || mapping?.thanksTemplateKey || 'generic', scoreDelta:e.gift.count, mapped:Boolean(demo || mapping), actionLabel:definition?.action || 'Cảm ơn tấm lòng' };
    const donor = this.donors.get(e.userKey) || { key:e.userKey,displayName:e.displayName,score:0,units:0,firstAt:e.time,firstOrder:++this.sequence };
    donor.displayName=e.displayName; donor.score+=gift.scoreDelta; donor.units+=gift.units; this.donors.set(e.userKey,donor);
    this.recent=[gift,...this.recent].slice(0,3);
    this.observed=[{giftId:gift.giftId,giftName:gift.giftName,source:e.source,observedAt:e.time},...this.observed.filter(g=>g.giftId!==gift.giftId)].slice(0,64);
    return gift;
  }
  ranking() { return [...this.donors.values()].sort((a,b)=>b.score-a.score || a.firstAt-b.firstAt || a.firstOrder-b.firstOrder || a.key.localeCompare(b.key)).slice(0,10).map(d=>({...d})); }
  reset() { this.seen.clear(); this.donors.clear(); this.sequence=0; this.recent=[]; this.observed=[]; }
}
