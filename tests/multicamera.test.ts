import {describe,it,expect} from 'vitest';
import {cameraViews,cameraPoint,cameraProfiles,activeCamera,commandSchema,defaultSettings,seats} from '@vuonsen/shared';
import {SceneEngine} from '../apps/server/src/engine';
import {goldenSeat} from '../apps/overlay/src/golden/layout';
import {actorFacing} from '../apps/overlay/src/actor-facing';
import {commentEffectRegion} from '../apps/overlay/src/comment-effect-layout';

describe('Manual multicamera presentation',()=>{
 it.each(cameraViews)('%s keeps all 100 unique seats inside the frame, and does not enlarge bodies',view=>{
  const points=seats.map(s=>{const p=goldenSeat(s);return cameraPoint(view,p.x,p.y);});
  expect(new Set(points.map(p=>`${p.x}:${p.y}`)).size).toBe(100);
  for(const p of points){expect(p.x).toBeGreaterThan(25);expect(p.x).toBeLessThan(1055);expect(p.y).toBeGreaterThan(960);expect(p.y).toBeLessThan(1900);expect(p.scale).toBeGreaterThanOrEqual(.90);expect(p.scale).toBeLessThanOrEqual(1);}
 });
 it.each(cameraViews)('%s projects the offering anchor to the urn foot',view=>{
  const p=cameraPoint(view,540,1050),urn=cameraProfiles[view].urn;
  expect(Math.abs(p.x-urn.x)).toBeLessThan(1);expect(p.y).toBe(urn.y);
 });
 it('does not change logical actors, gift accounting, ritual or voices on view selection',()=>{
  const engine=new SceneEngine({...defaultSettings,idleActivities:false},()=>100000);
  engine.receive({type:'chat',userId:'one',text:'vào chùa',nickname:'An'});engine.tick();
  const actors=JSON.stringify([...engine.actors.values()]),before=engine.snapshot();
  for(const view of cameraViews)engine.selectCamera(view);
  const after=engine.snapshot();expect(JSON.stringify([...engine.actors.values()])).toBe(actors);
  expect(after.ritual).toEqual(before.ritual);expect(after.metrics.giftUnits).toBe(before.metrics.giftUnits);expect(after.giftShow).toEqual(before.giftShow);
  expect(after.camera?.view).toBe('wide');expect(after.camera?.stage).toBe('automatic');
 });
 it('remembered view initializes without a deadline; reset/room clear return front',()=>{
  const e=new SceneEngine({...defaultSettings,cameraView:'left'});expect(e.snapshot().camera?.view).toBe('left');
  e.reset();expect(e.snapshot().camera?.view).toBe('front');e.selectCamera('right');e.clearCommunityDisplay();expect(e.snapshot().camera?.view).toBe('front');
  expect(new SceneEngine({...defaultSettings,cameraView:'wide',cameraRemember:false}).snapshot().camera?.view).toBe('front');
 });
 it('unsupported scenes stay front and malformed view commands are rejected',()=>{
  const e=new SceneEngine({...defaultSettings,cameraView:'left',sceneSpace:'courtyard'});expect(activeCamera(e.snapshot())).toBe('front');
  e.updateSettings({sceneSpace:'hall',theme:'classic'});expect(activeCamera(e.snapshot())).toBe('front');
  expect(commandSchema.safeParse({type:'camera-view',view:'rear'}).success).toBe(false);
 });
 it.each(['left','right','wide'] as const)('%s directions and free effects use projected coordinates / face region',view=>{
  const p=cameraPoint(view,540,1400),left=cameraPoint(view,440,1400),right=cameraPoint(view,640,1400);
  expect(actorFacing({status:'walk',deltaX:left.x-p.x,deltaY:left.y-p.y})).toBe('left');
  expect(actorFacing({status:'walk',deltaX:right.x-p.x,deltaY:right.y-p.y})).toBe('right');
  const face=cameraProfiles[view].face;
  for(const kind of ['dragon','phoenix','lotus','fish','candle'] as const)expect(commentEffectRegion(kind,view).y).toBeGreaterThan(face.y+face.height);
 });
});
