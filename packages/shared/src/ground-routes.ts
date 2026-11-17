import {carpetV2,floorHome} from './floor-v2';
import type {Seat} from './index';
export interface GroundPoint {x:number;y:number}
export interface RouteSegment {from:GroundPoint;to:GroundPoint;startedAt:number;endsAt:number;resource:string}
export interface GroundRoute {segments:RouteSegment[];startedAt:number;endsAt:number;from:GroundPoint;to:GroundPoint}
export interface CeremonyJourney {outbound:GroundRoute;inbound:GroundRoute;arrivedAt:number;departAt:number;endsAt:number;home:Seat;target:GroundPoint}
export interface ActorTravel {from:Seat;to:Seat;kind:'seat'|'standing';route?:GroundRoute}
export function sampleRoute(route:GroundRoute,now:number){
 const segment=route.segments.find(s=>now<s.endsAt);
 if(!segment)return {...route.to,moving:false};
 const t=Math.max(0,Math.min(1,(now-segment.startedAt)/(segment.endsAt-segment.startedAt)));
 // Short ease at corners; most of the segment uses constant speed.
 const e=.15,p=t<e?t*t/(2*e*(1-e)):t>1-e?1-(1-t)*(1-t)/(2*e*(1-e)):(t-e/2)/(1-e);
 return {x:segment.from.x+(segment.to.x-segment.from.x)*p,y:segment.from.y+(segment.to.y-segment.from.y)*p,moving:now>=route.startedAt};
}
type Hop=GroundPoint&{resource:string};
function route(from:GroundPoint,hops:Hop[],now:number,speed:number):GroundRoute{
 const segments:RouteSegment[]=[];let p=from,t=now;
 for(const hop of hops){const length=Math.hypot(hop.x-p.x,hop.y-p.y);if(length<.01)continue;
  const to={x:hop.x,y:hop.y},endsAt=t+Math.ceil(length/Math.max(100,Math.min(240,speed))*1000);
  segments.push({from:{...p},to,startedAt:t,endsAt,resource:hop.resource});p=to;t=endsAt;
 }
 return {segments,startedAt:now,endsAt:t,from:{...from},to:{...p}};
}
function rowFor(home:Seat){return /^seat-\d+$/.test(home.id)?Math.floor(Number(home.id.slice(5))/10):10;}
function branch(home:Seat){const row=rowFor(home);return {row,y:row<10?carpetV2.branches[row]:home.y+24};}
function aisle(x:number,fromY:number,toY:number,lane:'up'|'down'):Hop[]{
 const lines=[...carpetV2.branches,1860,1980,1080,1130,1180,1220].filter(y=>y>Math.min(fromY,toY)&&y<Math.max(fromY,toY)).sort((a,b)=>fromY<toY?a-b:b-a);
 return [...lines,toY].map((y,i,all)=>({x,y,resource:`${lane}:${Math.floor(Math.min(y,i?all[i-1]:fromY)/20)}`}));
}
function exitHome(home:Seat,lane:number):Hop[]{const b=branch(home);return [{x:home.x,y:b.y,resource:`chair:${home.id}`},{x:lane,y:b.y,resource:`row:${b.row}`}];}
function enterHome(home:Seat):Hop[]{const b=branch(home);return [{x:home.x,y:b.y,resource:`row:${b.row}`},{x:home.x,y:home.y,resource:`chair:${home.id}`}];}
export function prayerTarget(row:number,lane:number){return {x:[340,400,460,620,680,740][lane],y:1080+row*50};}
export function ceremonyJourney(origin:Seat,home:Seat,target:GroundPoint,now:number,speed:number,holdMs:number):CeremonyJourney{
 const access=target.y+22,b=branch(origin),end=branch(home),key=`altar:${Math.round(target.y)}`;
 const outbound=route(origin,[...exitHome(origin,carpetV2.up),...aisle(carpetV2.up,b.y,access,'up'),{x:target.x,y:access,resource:key},{...target,resource:key}],now,speed);
 const arrivedAt=outbound.endsAt,departAt=arrivedAt+holdMs;
 const inbound=route(target,[{x:target.x,y:access,resource:key},{x:carpetV2.down,y:access,resource:key},...aisle(carpetV2.down,access,end.y,'down'),...enterHome(home)],departAt,speed);
 return {outbound,inbound,arrivedAt,departAt,endsAt:inbound.endsAt,home:{...home},target};
}
export function homeRoute(from:Seat,to:Seat,now:number,speed:number){
 const a=branch(from),b=branch(to),lane=b.y<a.y?'up':'down',x=lane==='up'?carpetV2.up:carpetV2.down;
 return route(from,[...exitHome(from,x),...aisle(x,a.y,b.y,lane),...enterHome(to)],now,speed);
}
/** Short, parallel welcome/bow paths. The server stores the selected slot and
 * all timing; reconnect never rolls another destination. Gifts keep their pace. */
export function prayerJourney(origin:Seat,home:Seat,row:number,lane:number,now:number){
 const j=ceremonyJourney(origin,home,prayerTarget(row,lane),now,240,1800);
 const offset=(lane-2.5)*10;
 const remap=(p:GroundPoint)=>{if(p.x===carpetV2.up||p.x===carpetV2.down)p.x+=offset;};
 const retime=(r:GroundRoute,start:number)=>{
  const old=r.startedAt;
  for(const s of r.segments){s.startedAt=start+(s.startedAt-old)*1.1;s.endsAt=start+(s.endsAt-old)*1.1;remap(s.from);remap(s.to);}
  r.endsAt=start+(r.endsAt-old)*1.1;r.startedAt=start;remap(r.from);remap(r.to);
 };
 retime(j.outbound,now);j.arrivedAt=j.outbound.endsAt;j.departAt=j.arrivedAt+1800;
 retime(j.inbound,j.departAt);j.endsAt=j.inbound.endsAt;return j;
}
export function groundHome(raw:Seat){return floorHome(raw);}
export function ritualArrival(r:{startedAt:number;durationMs:number;journey?:CeremonyJourney}){return r.journey?.arrivedAt??r.startedAt+(r.durationMs||7200)*3600/9800;}
export function ritualDeparture(r:{startedAt:number;durationMs:number;journey?:CeremonyJourney}){return r.journey?.departAt??r.startedAt+(r.durationMs||7200)*6350/9800;}
