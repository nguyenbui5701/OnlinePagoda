import {ritualArrival,ritualDeparture,cameraViews,cameraRest,motionAt,focusSpaceAt,driftTarget,pickDriftTarget,offeringCamera,type CameraMotion,type CameraState,type CameraView,type OfferingRitual,type Settings} from '@vuonsen/shared';
export function chooseCamera(current:CameraView,disabled:CameraView[],random:number){
 const weights={front:40,left:22,right:22,wide:16},choices=cameraViews.filter(v=>v!==current&&!disabled.includes(v));
 let pick=Math.max(0,Math.min(.999999,random))*choices.reduce((n,v)=>n+weights[v],0);
 for(const v of choices){pick-=weights[v];if(pick<0)return v;}return current;
}
export class CameraDirector {
 state:CameraState={view:'front',revision:0,stage:'automatic'};
 private clearAt?:number;private enabled=false;private hold=60;
 private drift=false;private focus=false;private lastTick?:number;private seenRitual?:string;
 private pace:Settings['cameraDriftSpeed']='fast';
 private floorV2=false;
 constructor(private random=()=>Math.random()){}
 private deadline(now:number){return now+this.hold*1000*(.75+.5*this.random());}
 configure(s:Settings,now:number){
  this.floorV2=s.templeFloorPreview&&s.theme==='golden'&&s.sceneSpace==='hall';
  const supported=s.theme==='golden'&&s.sceneSpace==='hall'&&!s.reducedEffects;
  const drift=supported&&s.cameraDriftEnabled,focus=supported&&s.cameraGiftFocusEnabled;
  if((this.drift&&!drift)||(this.focus&&!focus))this.settle(now);
  this.drift=drift;this.focus=focus;
  if(this.pace!==s.cameraDriftSpeed){this.pace=s.cameraDriftSpeed;if(this.drift&&this.state.motion?.kind==='drift')this.driftNext(now);}
  const enabled=s.cameraAuto&&s.theme==='golden'&&s.sceneSpace==='hall';
  if(this.enabled!==enabled||this.hold!==s.cameraHoldSeconds){
   this.clearAt=undefined;this.state.waiting=undefined;
   this.hold=s.cameraHoldSeconds;this.state.nextAt=enabled?this.deadline(now):undefined;
  }
  this.enabled=enabled;
 }
 manual(view:CameraView,now:number){
  if(this.state.disabled?.includes(view)){this.state.waiting='Góc này đang lỗi tài nguyên';return;}
  this.state={view,revision:this.state.revision+1,stage:'automatic',disabled:this.state.disabled};this.clearAt=undefined;this.lastTick=now;
  if(this.enabled)this.state.nextAt=this.deadline(now);
 }
 reset(now:number){this.state={view:'front',revision:this.state.revision+1,stage:'automatic',nextAt:this.enabled?this.deadline(now):undefined};this.clearAt=undefined;this.seenRitual=undefined;this.lastTick=now;}
 pause(reason:string,now=Date.now()){if(this.state.paused)return;this.settle(now);this.state.paused=reason;this.state.nextAt=undefined;this.state.waiting=undefined;}
 private segment(kind:CameraMotion['kind'],now:number,duration:number,to:CameraMotion['to'],extra:Partial<CameraMotion>={}){this.state.motion={kind,from:motionAt(this.state.motion,now),to,startedAt:now,endsAt:now+duration,spaceFrom:focusSpaceAt(this.state.motion,now),spaceTo:kind==='focus'?1:0,...extra};}
 settle(now:number){this.segment('settle',now,900,{...cameraRest},{actorId:this.state.motion?.actorId});}
 private driftNext(now:number){const [min,range]=this.pace==='fast'?[6000,3000]:this.pace==='medium'?[8000,4000]:[12000,6000];this.segment('drift',now,min+range*this.random(),pickDriftTarget(this.state.view,motionAt(this.state.motion,now),this.random,this.floorV2));}
 private motionTick(now:number,ritual?:OfferingRitual,allowed=true){
  const m=this.state.motion,last=this.lastTick??now;this.lastTick=now;
  if(m&&(m.kind==='focus'||m.kind==='recover')&&this.state.nextAt!==undefined){const until=m.kind==='focus'?m.releaseAt!:m.endsAt;this.state.nextAt+=Math.max(0,Math.min(now,until)-Math.max(last,m.startedAt));}
  if(m?.kind==='settle'&&now<m.endsAt)return;
  if(this.state.paused){if(m&&now>=m.endsAt)this.state.motion=undefined;return;}
  const key=ritual?`${ritual.actorId}:${ritual.startedAt}`:undefined;
  const arrive=ritual?ritualArrival(ritual):Infinity;
  const leave=ritual?ritualDeparture(ritual):0;
  if(m?.kind==='focus'){
   if(!this.focus||!allowed||key!==m.ritualKey||now>=m.releaseAt!){this.segment('recover',now,900,this.drift?driftTarget(this.state.view,this.random(),this.random(),this.random(),this.floorV2):{...cameraRest},{actorId:m.actorId,ritualKey:m.ritualKey});}
   return;
  }
  if(m?.kind==='recover'&&now<m.endsAt)return;
  if(this.focus&&allowed&&ritual?.source!=='comment'&&key&&key!==this.seenRitual&&now>=arrive&&now<leave){
   this.seenRitual=key;this.segment('focus',now,Math.min(600,leave-now),offeringCamera(this.state.view,this.floorV2,ritual?.journey?.target),{actorId:ritual!.actorId,ritualKey:key,releaseAt:leave});return;
  }
  if(this.drift){if(!m||now>=m.endsAt)this.driftNext(now);}
  else if(m&&now>=m.endsAt)this.state.motion=undefined;
 }
 resume(now:number){this.state.paused=undefined;this.state.waiting=undefined;this.clearAt=undefined;this.state.nextAt=this.enabled?this.deadline(now):undefined;}
 resourceFailure(view:CameraView){
  if(view==='front')return;
  this.state.disabled=[...new Set([...(this.state.disabled??[]),view])];
  if(this.state.view===view){const prior=this.state.from;this.manual(prior&&!this.state.disabled.includes(prior)?prior:'front',Date.now());}
 }
 tick(now:number,busy:string|undefined,fade:boolean,ritual?:OfferingRitual,focusAllowed=true){
  if(this.state.endsAt!==undefined){
   if(now<this.state.endsAt)return;
   this.state.from=undefined;this.state.startedAt=undefined;this.state.endsAt=undefined;this.state.frozenFrom=undefined;
  }
  this.motionTick(now,ritual,focusAllowed);
  if(this.state.motion?.kind==='focus'||this.state.motion?.kind==='recover'||this.state.motion?.kind==='settle'&&now<this.state.motion.endsAt)return;
  if(!this.enabled||this.state.paused||this.state.nextAt===undefined)return;
  if(busy){this.clearAt=undefined;if(now>=this.state.nextAt)this.state.waiting=busy;return;}
  this.clearAt??=now;if(now<this.state.nextAt)return;
  if(now-this.clearAt<2000){this.state.waiting='Chờ cảnh yên 2 giây';return;}
  const next=chooseCamera(this.state.view,this.state.disabled??[],this.random());
  if(next===this.state.view){this.pause('Không còn góc hợp lệ để đổi');return;}
  const from=this.state.view,frozenFrom=motionAt(this.state.motion,now);
  this.state={...this.state,view:next,motion:undefined,frozenFrom:fade?frozenFrom:undefined,from:fade?from:undefined,startedAt:fade?now:undefined,endsAt:fade?now+1000:undefined,nextAt:this.deadline(now+(fade?1000:0)),revision:this.state.revision+1,waiting:undefined};
 }
}
