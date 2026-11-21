import { interactionCooldownMs, cleanText, safeAvatarUrl, type CommentEffect, type CommentEffectKind } from '@vuonsen/shared';
export class CommentEffects {
  private pending:{actorId:string;displayName:string;avatarUrl?:string;effect:CommentEffectKind;at:number}[]=[];
  private active:CommentEffect[]=[];private serial=0;private cooldown=new Map<string,number>();private blockedUntil=0;
  private counts={shown:0,cooldown:0,busy:0,expired:0,preempted:0};
  request(actorId:string,effect:CommentEffectKind,now:number,displayName='Khách an lành',avatarUrl?:string){
    if((this.cooldown.get(actorId)??0)>now){this.counts.cooldown++;return;}
    if(this.pending.length>=16){this.counts.busy++;return;}
    this.cooldown.set(actorId,now+interactionCooldownMs);this.pending.push({actorId,displayName:cleanText(displayName)||'Khách an lành',avatarUrl:safeAvatarUrl(avatarUrl),effect,at:now});
  }
  preempt(now:number){this.counts.preempted+=this.active.length;this.active=[];this.blockedUntil=Math.max(this.blockedUntil,now);}
  tick(now:number,session:string,giftBusy:boolean,enabled:boolean){
    for(const [key,end] of this.cooldown)if(end<=now)this.cooldown.delete(key);
    this.active=this.active.filter(a=>a.expiresAt>now);
    // A queued gift may begin later than its receipt (for example after a card).
    // Yield at actual presentation time as well as at receipt time.
    if(giftBusy&&this.active.length)this.preempt(now);
    const fresh=this.pending.filter(p=>now-p.at<10000);this.counts.expired+=this.pending.length-fresh.length;this.pending=fresh;
    if(!enabled){this.active=[];this.pending=[];return [];}
    const emitted:CommentEffect[]=[];
    while(!giftBusy&&now>=this.blockedUntil&&this.active.length<1&&this.pending.length){
      const p=this.pending.shift()!,effect={id:`${session}:comment:${++this.serial}`,actorId:p.actorId,displayName:p.displayName,avatarUrl:p.avatarUrl,effect:p.effect,startedAt:now,expiresAt:now+3000};
      this.active.push(effect);emitted.push(effect);this.counts.shown++;
    }
    return emitted;
  }
  snapshot(){return this.active.map(a=>({...a}));}
  status(){return {...this.counts,queued:this.pending.length,active:this.active.length};}
  reset(){this.active=[];this.pending=[];this.cooldown.clear();this.blockedUntil=0;this.counts={shown:0,cooldown:0,busy:0,expired:0,preempted:0};}
}
