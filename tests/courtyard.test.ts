import {expect,it} from 'vitest';
import {defaultSettings,settingsSchema,settingsPatchSchema,daylightAt,environmentLight} from '@vuonsen/shared';
import {SceneEnvironment} from '../apps/server/src/environment';
import {SceneEngine} from '../apps/server/src/engine';
import {courtyardParticle} from '../apps/overlay/src/courtyard-weather';
const settings={...defaultSettings,sceneSpace:'courtyard' as const};
it.each([['2026-11-04T22:59:00Z','night'],['2026-11-04T23:00:00Z','day'],['2026-11-05T08:59:00Z','day'],['2026-11-05T09:00:00Z','sunset'],['2026-11-05T11:00:00Z','night']])('resolves Vietnam time at %s',(at,want)=>expect(daylightAt(Date.parse(at))).toBe(want));
it('adds opt-in space defaults without overwriting unrelated saved settings',()=>{
  expect(settingsSchema.parse({masterMute:true,fortuneVolume:.2})).toMatchObject({sceneSpace:'hall',weatherAuto:false,masterMute:true,fortuneVolume:.2});
  expect(settingsPatchSchema.parse({sceneSpace:'courtyard'})).toEqual({sceneSpace:'courtyard'});
});
it('interpolates light over 20 seconds and preserves continuity when changed mid-fade',()=>{
  const e=new SceneEnvironment();e.configure(settings,1000);e.configure({...settings,sceneLight:'night'},2000);
  expect(environmentLight(e.snapshot(),2000)).toEqual({day:1,sunset:0,night:0});
  const mid=environmentLight(e.snapshot(),12000);expect(mid.night).toBeCloseTo(.5);
  e.configure({...settings,sceneLight:'sunset'},12000);expect(environmentLight(e.snapshot(),12000)).toEqual(mid);
  expect(environmentLight(e.snapshot(),32000)).toEqual({day:0,sunset:1,night:0});
  expect(environmentLight(e.snapshot(),13000,true)).toEqual({day:0,sunset:1,night:0});
});
it('synchronizes bounded weather, preempts softly for ceremonies, never queues missed auto bursts',()=>{
  const e=new SceneEnvironment();e.configure({...settings,weatherAuto:true},1000);
  e.request('leaves',2000,false);const w=e.snapshot().weather!;expect(w.endsAt).toBe(14000);
  expect(()=>e.request('petals',3000,false)).toThrow();
  expect(courtyardParticle(w,3,5000)).toEqual(courtyardParticle(structuredClone(w),3,5000));
  e.tick(6000,true);expect(e.snapshot().weather?.endsAt).toBe(6400);e.tick(6400,true);expect(e.snapshot().weather).toBeUndefined();
  expect(()=>e.request('leaves',7000,true)).toThrow();
  e.tick(9999999,true);e.tick(10000000,false);expect(e.snapshot().weather).toBeUndefined();
  e.tick(10180000,false);expect(e.snapshot().weather).toBeDefined();
  e.configure({...settings,reducedEffects:true},10180001);expect(e.snapshot().weather).toBeUndefined();
});
it('switches space and light without changing identities, seats, gift points or voice settings',()=>{
  let now=100000;const e=new SceneEngine({...settings,fortuneVolume:.23},()=>now);
  e.receive({type:'chat',userId:'one',text:'vào chùa'});e.tick();now+=6100;e.tick();
  const before=e.snapshot();e.updateSettings({sceneSpace:'hall',sceneLight:'night'});
  expect(e.snapshot().sessionId).toBe(before.sessionId);expect(e.snapshot().actors).toEqual(before.actors);
  expect(e.metrics.giftUnits).toBe(0);expect(e.settings.fortuneVolume).toBe(.23);
  e.updateSettings({sceneSpace:'courtyard'});e.weather('petals');expect(e.snapshot().environment?.weather).toBeDefined();
  e.clearCommunityDisplay();expect(e.snapshot().environment?.weather).toBeUndefined();
  e.weather('leaves');e.reset();expect(e.snapshot().environment?.weather).toBeUndefined();expect(e.settings.sceneLight).toBe('night');
});
it('suppresses weather for confirmed gifts even without a character ritual',()=>{
  const e=new SceneEnvironment();e.configure(settings,0);e.request('petals',0,false);e.gift(0);
  e.tick(100,false);expect(e.snapshot().weather?.endsAt).toBe(400);e.tick(400,false);expect(e.snapshot().weather).toBeUndefined();
  expect(()=>e.request('leaves',1000,false)).toThrow();e.request('leaves',7200,false);expect(e.snapshot().weather?.kind).toBe('leaves');
  e.reset(7300);e.request('petals',7300,false);expect(e.snapshot().weather?.kind).toBe('petals');
});
