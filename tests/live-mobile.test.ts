import {describe,it,expect} from 'vitest';
import {SceneEngine} from '../apps/server/src/engine';
import {defaultSettings,settingsPatchSchema,settingsSchema} from '@vuonsen/shared';
import {compactCardBounds,compactFortuneText} from '../apps/overlay/src/live-layout';
describe('LIVE mobile usability',()=>{
  it('member does not create a waiting outsider; one comment enters and automatically sits',()=>{
    let now=100000;const e=new SceneEngine(defaultSettings,()=>now);
    e.receive({type:'member',source:'tiktok',scope:'room',userId:'one',eventId:'member'});e.tick();expect(e.actors.size).toBe(0);
    e.receive({type:'chat',source:'tiktok',scope:'room',userId:'one',eventId:'chat',text:'vào chùa'});e.tick();expect([...e.actors.values()][0].status).toBe('enter');
    for(const ms of [300,2800,550,1800]){now+=ms;e.tick();}
    now+=600;e.tick();expect([...e.actors.values()][0].welcome).toBeUndefined();
    expect([...e.actors.values()][0]).toMatchObject({status:'idle',seatId:'seat-0'});expect(e.waiting.size).toBe(0);
  });
  it('compact mode is optional, does not rescale scene settings, and ends above sampled chat band',()=>{
    expect(settingsSchema.parse({safeRight:0,safeBottom:0})).toMatchObject({liveSafeLayout:true,safeRight:0,safeBottom:0});
    expect(settingsPatchSchema.parse({liveSafeLayout:false})).toEqual({liveSafeLayout:false});
    expect(compactCardBounds.y+compactCardBounds.height).toBeLessThanOrEqual(1240);expect(compactCardBounds.height).toBeLessThan(200);
  });
  it('removes duplicate title from the compact sentence without changing other words',()=>{
    expect(compactFortuneText('Bậc thềm chữ','Bậc thềm chữ — Hiểu chậm vẫn tiến bộ.')).toBe('Hiểu chậm vẫn tiến bộ.');
    expect(compactFortuneText('Bậc thềm chữ','Một lời khác.')).toBe('Một lời khác.');
  });
});
