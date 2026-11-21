import type {GroundRoute,RouteSegment} from '@vuonsen/shared';
/** Server reservations, never recomputed by a reconnecting overlay. */
export class GroundTraffic {
 private reservations:{actorId:string;segments:RouteSegment[];prayer?:boolean}[]=[];
 expire(now:number){this.reservations=this.reservations.filter(r=>r.segments.some(s=>s.endsAt+180>now));}
 clear(){this.reservations=[];}
 release(actorId:string){this.reservations=this.reservations.filter(r=>r.actorId!==actorId);}
 reserve(actorId:string,routes:GroundRoute[],now:number,prayer=false){
  this.expire(now);const segments=routes.flatMap(r=>r.segments),others=this.reservations.filter(r=>r.actorId!==actorId&&!(prayer&&r.prayer)).flatMap(r=>r.segments);
  const intersects=(a:RouteSegment,b:RouteSegment)=>{
   const overlapX=Math.min(Math.max(a.from.x,a.to.x),Math.max(b.from.x,b.to.x))-Math.max(Math.min(a.from.x,a.to.x),Math.min(b.from.x,b.to.x));
   const overlapY=Math.min(Math.max(a.from.y,a.to.y),Math.max(b.from.y,b.to.y))-Math.max(Math.min(a.from.y,a.to.y),Math.min(b.from.y,b.to.y));
   if(overlapX < -60 || overlapY < -60)return false;
   const start=Math.max(a.startedAt,b.startedAt)-180,end=Math.min(a.endsAt,b.endsAt)+180;
   if(end<start)return false;
   const position=(s:RouteSegment,t:number)=>{
    const u=Math.max(0,Math.min(1,(t-s.startedAt)/Math.max(1,s.endsAt-s.startedAt))),e=.15;
    const p=u<e?u*u/(2*e*(1-e)):u>1-e?1-(1-u)*(1-u)/(2*e*(1-e)):(u-e/2)/(1-e);
    return {x:s.from.x+(s.to.x-s.from.x)*p,y:s.from.y+(s.to.y-s.from.y)*p};
   };
   // Shared lane names are not exclusive locks. Following walkers may use
   // the same lane while separated in space; crossings still reserve clearance.
   const steps=Math.max(1,Math.ceil((end-start)/100));
   for(let i=0;i<=steps;i++){
    const t=start+(end-start)*i/steps,p=position(a,t),q=position(b,t);
    if(Math.hypot(p.x-q.x,p.y-q.y)<60)return true;
   }
   return false;
  };
  if(segments.some(a=>others.some(b=>a.startedAt<b.endsAt+180&&b.startedAt<a.endsAt+180&&intersects(a,b))))return false;
  // Count moving actors (not segments at joins); resting/praying does not consume a mover slot.
  const groups=[...this.reservations.filter(r=>r.actorId!==actorId),{actorId,segments,prayer}];
  const times=[...new Set(groups.flatMap(g=>g.segments.map(s=>s.startedAt)))];
  if(times.some(t=>{const moving=groups.filter(g=>g.segments.some(s=>s.startedAt<=t&&t<s.endsAt));return moving.length>18||moving.filter(g=>!g.prayer).length>8;}))return false;
  this.release(actorId);this.reservations.push({actorId,segments,prayer});return true;
 }
 moving(now:number){return this.reservations.filter(r=>r.segments.some(s=>s.startedAt<=now&&now<s.endsAt)).length;}
}
