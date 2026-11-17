import { createHash } from 'node:crypto';
import { interactionCooldownMs, cleanText, fortuneRevealSchema, type FortuneIntent, type FortuneReveal, type FortuneStatus } from '@vuonsen/shared';
import type { FortuneItem } from './fortune-catalog';
const localDate=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'});
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
type Request={sessionId:string;userKey:string;displayName:string;eventId?:string;intent:FortuneIntent;now:number};
export class FortuneQueue {
  private session='';private day='';private seen=new Set<string>();private daily=new Map<string,{draws:number;number:number}>();
  private last=new Map<string,number>();private pending:{displayName:string;item:FortuneItem}[]=[];
  private groups=new Map<string,readonly FortuneItem[]>();private byNumber=new Map<number,FortuneItem>();
  private lastReveal=-Infinity;private serial=0;active?:FortuneReveal;
  private counts={revealed:0,cooldown:0,alreadyToday:0,duplicate:0,busy:0,disabled:0};
  constructor(items:readonly FortuneItem[]){
    for(const item of items){this.byNumber.set(item.number,item);const key=item.collection+':'+item.theme;this.groups.set(key,[...(this.groups.get(key)||[]),item]);}
    this.groups.set('chu_de:*',items.filter(i=>i.collection==='chu_de'));
  }
  get available(){return this.byNumber.size===576;}
  reset(session:string){this.session=session;this.seen.clear();this.daily.clear();this.last.clear();this.day='';this.serial=0;this.lastReveal=-Infinity;this.clearDisplay();this.counts={revealed:0,cooldown:0,alreadyToday:0,duplicate:0,busy:0,disabled:0};}
  clearDisplay(){this.pending=[];this.active=undefined;}
  disabled(){this.counts.disabled++;}
  remainingCooldown(userKey:string,now:number){return Math.max(0,Math.ceil(((this.last.get(userKey)??-Infinity)+interactionCooldownMs-now)/1000));}
  onIntent(r:Request){
    if(r.sessionId!==this.session)this.reset(r.sessionId);
    if(!this.available)return 'unavailable';
    const transaction=r.eventId?hash(JSON.stringify([r.sessionId,r.eventId])):undefined;
    if(transaction&&this.seen.has(transaction)){this.counts.duplicate++;return 'duplicate';}
    // Never evict transaction keys and accidentally replay old requests in the same session.
    if(this.seen.size>=200000){this.counts.busy++;return 'busy';}
    if(transaction)this.seen.add(transaction);
    const day=localDate.format(new Date(r.now));if(day!==this.day){this.day=day;this.daily.clear();}
    if((this.last.get(r.userKey)??-Infinity)+interactionCooldownMs>r.now){this.counts.cooldown++;return 'cooldown';}
    const intent=r.intent,topic=intent.scope==='by_number'?`number:${intent.number}`:`${intent.scope}:${intent.theme||'*'}`;
    const key=hash(JSON.stringify([r.sessionId,day,r.userKey,topic]));
    const previous=this.daily.get(key);
    if(this.pending.length>=32||this.daily.size>=200000||(!this.last.has(r.userKey)&&this.last.size>=10000)){this.counts.busy++;return 'busy';}
    const group=this.groups.get(topic),seed=previous?hash(key+':'+previous.draws):key;
    let index=group?.length?parseInt(seed.slice(0,8),16)%group.length:0;
    if(group&&group.length>1&&previous&&group[index].number===previous.number)index=(index+1)%group.length;
    const item=intent.scope==='by_number'?this.byNumber.get(intent.number):group?.[index];
    if(!item)return 'ignored';
    this.last.set(r.userKey,r.now);this.daily.set(key,{draws:(previous?.draws||0)+1,number:item.number});this.pending.push({displayName:cleanText(r.displayName)||'Khách an lành',item});return 'queued';
  }
  ready(now:number,intervalMs=7000){return !this.snapshot(now)&&this.pending.length>0&&now-this.lastReveal>=Math.max(7000,intervalMs);}
  next(now:number,intervalMs=7000,voiceEnabled=false){
    if(this.active&&now>=this.active.expiresAt)this.active=undefined;
    if(this.active)return null;
    if(!this.pending.length||now-this.lastReveal<Math.max(7000,intervalMs))return null;
    const entry=this.pending.shift()!,f=entry.item;this.lastReveal=now;
    this.active=fortuneRevealSchema.parse({version:1,revealId:`${this.session}:${++this.serial}`,sessionId:this.session,fortuneId:f.id,number:f.number,
      displayName:entry.displayName,theme:f.theme,themeLabel:f.theme_label,title:f.title,short:f.short_text,action:f.action,blessing:f.blessing,
      startedAt:now,expiresAt:now+(voiceEnabled?15000:Math.min(9000,Math.max(7000,intervalMs)))});
    this.counts.revealed++;return this.active;
  }
  snapshot(now:number){return this.active&&now<this.active.expiresAt?{...this.active}:undefined;}
  status():FortuneStatus{return {available:this.available,queued:this.pending.length,...this.counts};}
}
