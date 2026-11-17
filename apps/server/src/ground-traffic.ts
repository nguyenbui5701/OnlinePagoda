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
   return a.resource===b.resource||overlapX>=-10&&overlapY>=-10;
  };
  if(segments.some(a=>others.some(b=>intersects(a,b)&&a.startedAt<b.endsAt+180&&b.startedAt<a.endsAt+180)))return false;
  // Count moving actors (not segments at joins); resting/praying does not consume a mover slot.
  const groups=[...this.reservations.filter(r=>r.actorId!==actorId).map(r=>r.segments),segments];
  const times=[...new Set(groups.flatMap(g=>g.map(s=>s.startedAt)))];
  if(times.some(t=>groups.filter(g=>g.some(s=>s.startedAt<=t&&t<s.endsAt)).length>(prayer?18:8)))return false;
  this.release(actorId);this.reservations.push({actorId,segments,prayer});return true;
 }
 moving(now:number){return this.reservations.filter(r=>r.segments.some(s=>s.startedAt<=now&&now<s.endsAt)).length;}
}
