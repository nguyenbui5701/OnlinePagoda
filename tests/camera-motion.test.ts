import {expect,it,vi} from 'vitest';
import {cameraRest,cameraViews,cameraProfiles,cameraRect,cameraFrame,cameraFaceBounds,driftTarget,offeringCamera,motionAt,focusSpaceAt,defaultSettings,type OfferingRitual} from '@vuonsen/shared';
import {CameraDirector} from '../apps/server/src/camera-director';
import {SceneEngine} from '../apps/server/src/engine';
import {RitualVoiceSync} from '../apps/overlay/src/ritual-voice-sync';
const settings={...defaultSettings,cameraDriftSpeed:'slow' as const,cameraAuto:true,cameraDriftEnabled:true,cameraGiftFocusEnabled:true};
const ritual:OfferingRitual={actorId:'real-donor',seatId:'seat-1',startedAt:1000,durationMs:9800};
it.each(cameraViews)('%s: all sampled drift/focus frames cover the background; ambient keeps face visible',view=>{
 for(let n=0;n<=100;n++){
  const t=driftTarget(view,n/100,(n*37%101)/100,(n*61%101)/100),face=cameraRect(cameraProfiles[view].face,t);
  expect(t.scale).toBeGreaterThanOrEqual(1.03);expect(t.scale).toBeLessThanOrEqual(1.10);
  expect(Math.abs(t.x+540*(t.scale-1))).toBeLessThanOrEqual(32+1e-8);expect(Math.abs(t.y+(view==='front'?540:960)*(t.scale-1))).toBeLessThanOrEqual(24+1e-8);
  expect(face.x).toBeGreaterThanOrEqual(24);expect(face.x+face.width).toBeLessThanOrEqual(1056);expect(face.y).toBeGreaterThanOrEqual(218);
  const end=offeringCamera(view);
  const p=motionAt({kind:'focus',from:t,to:end,startedAt:0,endsAt:100},n);
  expect(p.scale).toBeLessThanOrEqual(1.3);expect(p.x).toBeLessThanOrEqual(0);expect(p.y).toBeLessThanOrEqual(0);
  expect(p.x+1080*p.scale).toBeGreaterThanOrEqual(1080-1e-8);expect(p.y+1920*p.scale).toBeGreaterThanOrEqual(1920-1e-8);
 }
});
it('segments have zero-speed endpoints, deterministic reload sampling, and 12–18 second random legs',()=>{
 for(const rng of [0,.5,1]){const d=new CameraDirector(()=>rng);d.configure(settings,0);d.tick(0,undefined,true);
  const m=d.state.motion!;expect(m.endsAt).toBe(12000+6000*rng);expect(motionAt(m,0)).toEqual(cameraRest);
  expect(motionAt(m,1).scale-1).toBeLessThan(1e-8);
  const state={settings,camera:d.state};expect(cameraFrame(JSON.parse(JSON.stringify(state)),6000)).toEqual(cameraFrame(state,6000));
  const end=motionAt(m,m.endsAt);d.tick(m.endsAt,undefined,true);expect(d.state.motion!.from).toEqual(end);
 }
});
it('only focuses the actual offering phase, freezes dwell, recovers in 900ms and continues without snapping',()=>{
 const d=new CameraDirector(()=>.5);d.configure(settings,0);d.tick(0,undefined,true);
 d.tick(4599,'ritual',true,ritual);expect(d.state.motion?.kind).toBe('drift');
 const before=motionAt(d.state.motion,4600);d.tick(4600,'ritual',true,ritual);
 expect(d.state.motion?.kind).toBe('focus');expect(d.state.motion?.actorId).toBe('real-donor');expect(d.state.motion?.from).toEqual(before);expect(d.state.motion?.endsAt).toBe(5200);
 d.tick(5200,'ritual',true,ritual);expect(d.state.nextAt).toBe(60600);expect(motionAt(d.state.motion,5200).scale).toBe(1.3);expect(focusSpaceAt(d.state.motion,5200)).toBe(1);
 d.tick(7350,'ritual',true,ritual);expect(d.state.motion?.kind).toBe('recover');expect(d.state.motion?.endsAt).toBe(8250);
 const resume=motionAt(d.state.motion,8250);d.tick(8250,'ritual',true,ritual);expect(d.state.motion?.kind).toBe('drift');expect(d.state.motion?.from).toEqual(resume);expect(d.state.nextAt).toBe(63650);
 d.tick(8300,'ritual',true,ritual);expect(d.state.motion?.kind).toBe('drift');
});
it('unknown donor / occupied portrait corridor do not start focus; no retarget during another ritual',()=>{
 const d=new CameraDirector(()=>.5);d.configure(settings,0);d.tick(4600,'gift without actor',true);expect(d.state.motion?.kind).toBe('drift');
 d.tick(4700,'gift',true,ritual,false);expect(d.state.motion?.kind).toBe('drift');
 d.tick(4800,'gift',true,ritual,true);expect(d.state.motion?.actorId).toBe(ritual.actorId);
 d.tick(4900,'next gift',true,{...ritual,actorId:'next'});expect(d.state.motion?.kind).toBe('recover');expect(d.state.motion?.actorId).toBe(ritual.actorId);
});
it('gift during dissolve waits for completion and does not restart it',()=>{
 const d=new CameraDirector(()=>.5);d.configure({...settings,cameraHoldSeconds:15},0);d.tick(0,undefined,true);d.tick(15000,undefined,true);
 const end=d.state.endsAt;expect(end).toBe(16000);const r={...ritual,startedAt:12000};
 d.tick(15800,'gift',true,r);expect(d.state.endsAt).toBe(end);expect(d.state.motion).toBeUndefined();
 d.tick(16000,'gift',true,r);expect(d.state.motion?.kind).toBe('focus');expect(d.state.motion?.ritualKey).toBe('real-donor:12000');
});
it('stop and low FPS settle smoothly; reduced effects/unsupported scenes cannot drift or focus',()=>{
 const d=new CameraDirector(()=>.5);d.configure(settings,0);d.tick(0,undefined,true);const before=motionAt(d.state.motion,7000);
 d.pause('slow',7000);expect(d.state.motion?.from).toEqual(before);d.tick(7900,undefined,true);expect(d.state.paused).toBe('slow');expect(cameraFrame({settings,camera:d.state},7900)).toEqual(cameraRest);
 d.configure({...settings,showGuide:false},8000);d.tick(8000,undefined,true);expect(d.state.motion).toBeUndefined();d.resume(8000);d.tick(8000,undefined,true);expect(d.state.motion?.kind).toBe('drift');
 d.configure({...settings,cameraAuto:false,cameraDriftEnabled:false,cameraGiftFocusEnabled:false},9000);d.tick(9900,undefined,true);expect(d.state.motion).toBeUndefined();
 for(const patch of [{reducedEffects:true},{sceneSpace:'courtyard' as const},{theme:'classic' as const}]){d.configure({...settings,...patch},10000);d.reset(10000);d.tick(10000,'gift',true,{...ritual,startedAt:6000});expect(d.state.motion).toBeUndefined();}
 expect(defaultSettings.cameraDriftEnabled).toBe(false);expect(defaultSettings.cameraGiftFocusEnabled).toBe(false);
});
it('face exclusions contain both transformed frames during a dissolve; reset discards timelines',()=>{
 const d=new CameraDirector(()=>.5);d.configure(settings,0);d.manual('wide',0);d.tick(0,undefined,true);d.tick(60000,undefined,true);
 const state={settings,camera:d.state},bounds=cameraFaceBounds(state,60500);
 for(const view of [d.state.view,d.state.from!]){const r=cameraRect(cameraProfiles[view].face,cameraFrame(state,60500,view));expect(bounds.y).toBeLessThanOrEqual(r.y);expect(bounds.y+bounds.height).toBeGreaterThanOrEqual(r.y+r.height);}
 d.reset(61000);expect(d.state.view).toBe('front');expect(d.state.motion).toBeUndefined();expect(d.state.from).toBeUndefined();
});
it('standing and seated donors keep ritual FIFO, points and exactly one speech cue despite motion snapshots',()=>{
 let now=100000;const e=new SceneEngine({...settings,masterMute:false,idleActivities:false,idleMinutes:30},()=>now);
 for(const userId of ['a','b'])e.receive({type:'chat',userId,nickname:userId,text:'vào chùa'});
 for(let i=0;i<200;i++){now+=100;e.tick();}
 const actors=e.snapshot().actors;expect(actors).toHaveLength(2);
 e.updateSettings({idleMinutes:.1});for(let i=0;i<30;i++){now+=100;e.tick();}expect(e.snapshot().actors.every(a=>a.status==='standing')).toBe(true);
 e.updateSettings({idleMinutes:30});
 for(const userId of ['a','b']){const event={type:'gift',userId,nickname:userId,eventId:`gift-${userId}`,gift:{id:'rose',count:1,finished:true,unitCoins:1}};e.receive(event);e.receive(event);}
 e.tick();const voices=new RitualVoiceSync(),gifts=e.snapshot().recentGifts!;expect(gifts).toHaveLength(2);for(const g of gifts)expect(voices.hold(g,e.snapshot(),true)).toBe(true);
 const cues:string[]=[],focused=new Set<string>();
 for(let i=0;i<180;i++){now+=100;e.tick();const s=e.snapshot();cues.push(...voices.due(s,now).map(g=>g.eventKey));if(s.camera?.motion?.kind==='focus'){expect(s.camera.motion.actorId).toBe(s.ritual?.actorId);focused.add(s.camera.motion.actorId!);}}
 expect(focused.size).toBe(2);expect(cues).toHaveLength(2);expect(new Set(cues).size).toBe(2);expect(e.metrics.giftUnits).toBe(2);expect(e.metrics.giftTransactions).toBe(2);
 expect(e.snapshot().actors.every(a=>a.status==='standing')).toBe(true);
});
it('missing target asset discards its motion and retains a valid view',()=>{
 const d=new CameraDirector(()=>.5);d.configure(settings,0);d.manual('left',0);d.tick(0,undefined,true);d.resourceFailure('left');
 expect(d.state.view).toBe('front');expect(d.state.motion).toBeUndefined();expect(d.state.disabled).toContain('left');
});
it.each(['fortune','lantern'] as const)('new oblique altar yields to visible %s card, not its longer speech deadline',kind=>{
 let now=1000;
 const e=new SceneEngine({...defaultSettings,templeFloorPreview:true,cameraView:'left',cameraGiftFocusEnabled:true,liveSafeLayout:true,fortuneEnabled:true,lanternEnabled:true},()=>now);
 let card;
 if(kind==='fortune'){
  e.fortunes.onIntent({sessionId:e.sessionId,userKey:'reader',displayName:'An',eventId:'f',intent:{scope:'by_number',number:123},now});
  card=e.fortunes.next(now,7000,true)!;
 }else{
  e.lanterns.onIntent({sessionId:e.sessionId,userKey:'reader',displayName:'An',eventId:'l',topic:'binh_an',now});
  card=e.lanterns.next(now)!;
 }
 const originalEnd=card.expiresAt,spy=vi.spyOn(e.cameraDirector,'tick');
 try{
  e.tick();expect(spy.mock.calls.at(-1)?.[4]).toBe(false);
  now=5001;e.tick();expect(spy.mock.calls.at(-1)?.[4]).toBe(true);
  expect((kind==='fortune'?e.fortunes.snapshot(now):e.lanterns.snapshot(now))?.expiresAt).toBe(originalEnd);
 }finally{spy.mockRestore();}
});
