import {planGiftFlight,giftFlightBounds,giftFlightFits,giftComposition,type EffectSpaceState,giftTier,stableSeed,cleanText,type DomainEvent,type GiftConfirmed,type GiftPreview,type GiftShow,type GiftShowStatus,type Settings} from '@vuonsen/shared';
import {comboKey} from './combo-key';
type Entry={gift:GiftConfirmed|GiftPreview;at:number;preview:boolean};
/** Visual-only queue. Preview never calls scoring, voice or the ritual scheduler. */
export class GiftShowQueue {
  private queue:Entry[]=[];
  private active:GiftShow[]=[];
  private combos=new Map<string,{gift:GiftPreview;at:number}>();
  private closed=new Set<string>();private seen=new Set<string>();
  private lastLane=2;private medium=0;private large=0;
  private layout?:EffectSpaceState;
  private stats={received:0,previews:0,shown:0,expired:0,overflow:0,unknownValue:0};
  private enabled(s:Settings){return s.giftTierEffects&&s.effects&&s.flowers&&s.showGiftThanks&&s.effectIntensity>0;}
  finalCount(e:DomainEvent,session:string){
    const key=comboKey(e,session);return Math.max(e.gift?.count??1,key?this.combos.get(key)?.gift.units??1:1);
  }
  progress(e:DomainEvent,session:string,now:number,s:Settings){
    if(!e.gift||e.gift.finished||!this.enabled(s))return;
    const key=comboKey(e,session);if(!key||this.closed.has(key))return;
    const previous=this.combos.get(key);
    if(previous&&previous.gift.units>=e.gift.count)return;
    if(!previous&&this.combos.size>=2048)return;
    const gift:GiftPreview={comboKey:key,userKey:e.userKey,displayName:cleanText(e.displayName),avatarUrl:e.avatarUrl,
      giftId:e.gift.id,giftName:cleanText(e.gift.name||'Quà tặng',28),units:e.gift.count};
    this.combos.set(key,{gift,at:now});
    const active=this.active.find(a=>a.phase==='preview'&&a.gift.comboKey===key);
    if(active){active.gift=gift;return;}
    const queued=this.queue.find(a=>a.preview&&a.gift.comboKey===key);
    if(queued){queued.gift=gift;return;}
    // After hiding, retain quantity only; never replay a preview on every update.
    if(!previous)this.push({gift,at:now,preview:true});
  }
  private push(entry:Entry){if(this.queue.length>=20){this.stats.overflow++;return;}this.queue.push(entry);}
  enqueue(gift:GiftConfirmed,now:number,s:Settings){
    if(this.seen.has(gift.eventKey)||this.seen.size>=200000)return;
    this.seen.add(gift.eventKey);this.stats.received++;
    const key=gift.comboKey;
    if(key){this.closed.add(key);this.combos.delete(key);}
    if(!this.enabled(s))return;
    if(gift.unitCoins===undefined)this.stats.unknownValue++;
    const tier=gift.tier??giftTier(gift.totalCoins);
    const live=this.active.find(a=>a.phase==='preview'&&a.gift.comboKey===key&&key!==undefined&&a.endsAt>now);
    const promotedFlight=live?.flight&&tier===2?{...live.flight,groupTier:2 as const,ornamentSpace:'lotus' as const,ornaments:giftComposition(2).ornaments.map(o=>({x:o.x,y:o.y}))}:undefined;
    const fitsPromotion=!promotedFlight||!this.layout||giftFlightFits(this.layout,now,promotedFlight,this.active.filter(a=>a!==live&&a.endsAt>now).flatMap(a=>a.flight?[giftFlightBounds(a.flight)]:[]));
    if(live&&tier<=2&&fitsPromotion){
      if(tier===2){live.progressAtPromotion=Math.max(0,Math.min(1,(now-live.startedAt)/(live.endsAt-live.startedAt)));live.promotedAt=now;live.endsAt=live.startedAt+6000;}
      if(promotedFlight)live.flight=promotedFlight;
      live.gift=gift;live.phase='confirmed';live.tier=tier;live.variant=tier===1?'lotus':this.mediumVariant();
      // Extend medium choreography without jumping backwards along the flight path.
      this.stats.shown++;return;
    }
    const waiting=key?this.queue.find(a=>a.preview&&a.gift.comboKey===key):undefined;
    if(waiting){waiting.gift=gift;waiting.preview=false;waiting.at=now;}
    else this.push({gift,at:now,preview:false});
  }
  private mediumVariant(){return (['hearts','koi','candles'] as const)[this.medium++%3];}
  tick(now:number,s:Settings,cardVisible=false,layout?:EffectSpaceState){
    this.layout=layout;
    if(!this.enabled(s)){this.queue=[];this.active=[];this.combos.clear();return;}
    this.active=this.active.filter(a=>a.endsAt>now);
    for(const [key,c] of this.combos)if(now-c.at>300000){this.combos.delete(key);if(this.closed.size<200000)this.closed.add(key);}
    this.queue=this.queue.filter(q=>{if(now-q.at>30000){this.stats.expired++;return false;}return true;});
    while(this.queue.length&&!cardVisible){
      const q=this.queue[0],tier=q.preview?1:('tier' in q.gift?q.gift.tier:undefined)??giftTier(q.gift.totalCoins);
      const capacity=s.compactGiftPanels?2:1;
      if(this.active.length&&(tier>=3||this.active.some(a=>a.tier>=3)||this.active.length>=capacity))break;
      const used=new Set(this.active.map(a=>a.lane));
      const lanes:(0|2)[]=this.lastLane===0?[2,0]:[0,2];
      const lane=lanes.find(i=>!used.has(i))??0;
      const x=s.compactGiftPanels&&tier<=2?(lane===0?300:780):540;
      const id=q.preview?`preview:${q.gift.comboKey}`:(q.gift as GiftConfirmed).eventKey;
      const occupied=this.active.flatMap(a=>a.flight?[giftFlightBounds(a.flight)]:a.placement?[{x:a.placement.x-190,y:a.placement.y-305,width:380,height:610}]:[]);
      const flight=layout?planGiftFlight(layout,now,id,tier,x,occupied):undefined;
      if(layout&&!flight)break;
      this.lastLane=lane;
      this.queue.shift();
      const variant=tier===1?'lotus':tier===2?this.mediumVariant():tier===4?'long-phung':(['dragon','phoenix'] as const)[this.large++%2];
      this.active.push({flight,id,gift:q.gift,phase:q.preview?'preview':'confirmed',tier,variant,lane,jitter:stableSeed(id)%13-6,
        startedAt:now,endsAt:now+([0,4400,6000,8000,9000][tier])});
      if(q.preview)this.stats.previews++;else this.stats.shown++;
    }
  }
  snapshot():GiftShowStatus{return {...this.stats,pendingCombos:this.combos.size,queued:this.queue.length,active:this.active.map(a=>({...a,flight:a.flight?{...a.flight,ornaments:a.flight.ornaments.map(p=>p?{...p}:null)}:undefined,placement:a.placement?{...a.placement}:undefined,gift:{...a.gift}}))};}
  reset(){this.queue=[];this.active=[];this.layout=undefined;this.combos.clear();this.closed.clear();this.seen.clear();this.lastLane=2;this.medium=this.large=0;this.stats={received:0,previews:0,shown:0,expired:0,overflow:0,unknownValue:0};}
}
