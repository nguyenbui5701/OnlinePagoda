import {expect,it} from 'vitest';
import {CameraDirector,chooseCamera} from '../apps/server/src/camera-director';
import {altarFacing,cameraViews,cameraEffectView,defaultSettings} from '@vuonsen/shared';
const settings={...defaultSettings,cameraAuto:true,cameraHoldSeconds:60};
it('weighted picks never repeat or select failed assets',()=>{for(const view of cameraViews)for(let n=0;n<100;n++){const selected=chooseCamera(view,['wide'],n/100);expect(selected).not.toBe(view);expect(selected).not.toBe('wide');}});
it('holds 60 seconds at midpoint, waits busy + 2s, and never restarts a fade for new interactions',()=>{
 const d=new CameraDirector(()=>.5);d.configure(settings,0);expect(d.state.nextAt).toBe(60000);
 d.tick(60000,'Quẻ',true);expect(d.state.waiting).toBe('Quẻ');
 d.tick(65000,undefined,true);d.tick(66999,undefined,true);expect(d.state.view).toBe('front');
 d.tick(67000,undefined,true);const view=d.state.view,ends=d.state.endsAt;expect(ends).toBe(68000);
 d.tick(67500,'Quà mới',true);expect(d.state.endsAt).toBe(ends);expect(d.state.view).toBe(view);
 d.tick(68000,'Quà mới',true);expect(d.state.from).toBeUndefined();expect(d.state.view).toBe(view);
});
it('reduced cuts, reset, pause latch and explicit resume',()=>{
 const d=new CameraDirector(()=>0);d.configure(settings,100);expect(d.state.nextAt).toBe(45100);
 d.tick(1000,undefined,false);d.tick(45100,undefined,false);expect(d.state.view).not.toBe('front');expect(d.state.endsAt).toBeUndefined();
 d.pause('slow');d.tick(100000,undefined,true);expect(d.state.paused).toBe('slow');d.resume(100000);expect(d.state.paused).toBeUndefined();
 d.reset(100000);expect(d.state.view).toBe('front');expect(d.state.nextAt).toBe(145000);
});
it('both sides of the altar select different rear oblique poses in either oblique camera',()=>{
 for(const view of ['left','right'] as const){expect(altarFacing(view,120,1400)).toBe('left');expect(altarFacing(view,960,1400)).toBe('right');}
});
it('effects arriving during wide-to-front dissolve clear the lower old face',()=>{
 const state={settings:defaultSettings,camera:{view:'front' as const,from:'wide' as const,revision:1,stage:'automatic' as const,endsAt:1000}};
 expect(cameraEffectView(state,500)).toBe('wide');expect(cameraEffectView(state,1001)).toBe('front');
});
