import { createHash } from 'node:crypto';
import { interactionCooldownMs,cleanText,lanternThemes,lanternRevealSchema,type LanternTopic,type LanternReveal,type LanternStatus } from '@vuonsen/shared';
import { commandText, fold } from './interaction-text';
export function parseLanternCommand(text:string):LanternTopic|null{
  const command=commandText(text);if(!command)return null;
  const match=/^(?:tha den hoa dang|tha hoa dang|hoa dang|tha den)(?: (.*))?$/.exec(command.plain);
  if(!match)return null;
  const aliases:Record<string,string>={'gia dao':'gia dinh','ba me':'cha me','bo me':'cha me','hoc hanh':'hoc tap','thi cu':'hoc tap','viec lam':'cong viec'};
  const topic=aliases[match[1]]||match[1]||'binh an';
  return lanternThemes.find(t=>fold(t.command)===topic)?.id??null;
}
type Request={sessionId:string;userKey:string;displayName:string;eventId?:string;topic:LanternTopic;now:number};
export class LanternQueue {
  private session='';private seen=new Set<string>();private last=new Map<string,number>();
  private pending:{displayName:string;topic:LanternTopic;at:number}[]=[];private serial=0;
  private counts={revealed:0,cooldown:0,duplicate:0,busy:0,expired:0,disabled:0};
  private active?:LanternReveal;
  reset(session:string){this.session=session;this.seen.clear();this.last.clear();this.serial=0;this.clearDisplay();this.counts={revealed:0,cooldown:0,duplicate:0,busy:0,expired:0,disabled:0};}
  clearDisplay(){this.pending=[];this.active=undefined;}
  disabled(){this.counts.disabled++;}
  remainingCooldown(userKey:string,now:number){return Math.max(0,Math.ceil(((this.last.get(userKey)??-Infinity)+interactionCooldownMs-now)/1000));}
  expire(now:number){
    if(this.active&&now>=this.active.expiresAt)this.active=undefined;
    const remaining=this.pending.filter(p=>now-p.at<120000);this.counts.expired+=this.pending.length-remaining.length;this.pending=remaining;
  }
  onIntent(r:Request){
    if(r.sessionId!==this.session)this.reset(r.sessionId);this.expire(r.now);
    const key=r.eventId?createHash('sha256').update(JSON.stringify([r.sessionId,r.eventId])).digest('hex'):undefined;
    if(key&&this.seen.has(key)){this.counts.duplicate++;return 'duplicate';}
    if(this.seen.size>=200000){this.counts.busy++;return 'busy';}
    if(key)this.seen.add(key);
    if(this.remainingCooldown(r.userKey,r.now)>0){this.counts.cooldown++;return 'cooldown';}
    if(this.pending.length>=16||(!this.last.has(r.userKey)&&this.last.size>=10000)){this.counts.busy++;return 'busy';}
    this.last.set(r.userKey,r.now);this.pending.push({displayName:cleanText(r.displayName,80)||'Khách an lành',topic:r.topic,at:r.now});return 'queued';
  }
  ready(now:number){return !this.snapshot(now)&&this.pending.some(p=>now-p.at<120000);}
  next(now:number){
    this.expire(now);if(this.active||!this.pending.length)return null;
    const p=this.pending.shift()!;
    this.active=lanternRevealSchema.parse({version:1,revealId:`${this.session}:lantern:${++this.serial}`,sessionId:this.session,displayName:p.displayName,topic:p.topic,startedAt:now,expiresAt:now+8000});
    this.counts.revealed++;return this.active;
  }
  snapshot(now:number){return this.active&&now<this.active.expiresAt?{...this.active}:undefined;}
  status():LanternStatus{return {queued:this.pending.length,...this.counts};}
}
