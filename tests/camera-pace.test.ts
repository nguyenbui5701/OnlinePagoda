import {it,expect} from 'vitest';
import {defaultSettings,cameraViews,driftTarget,pickDriftTarget,motionAt} from '@vuonsen/shared';
import {CameraDirector} from '../apps/server/src/camera-director';
it.each([['slow',15000],['medium',10000],['fast',7500]] as const)('%s pace changes pan duration, not saved angle dwell', (pace,duration)=>{
 const d=new CameraDirector(()=>.5);d.configure({...defaultSettings,cameraDriftEnabled:true,cameraDriftSpeed:pace,cameraAuto:true,cameraHoldSeconds:15},0);d.tick(0,undefined,true);
 expect(d.state.motion?.endsAt).toBe(duration);expect(d.state.nextAt).toBe(15000);
});
it.each(cameraViews)('%s avoids a stationary next leg even with a repeated random sample',view=>{
 const from=driftTarget(view,.5,.5,.5),to=pickDriftTarget(view,from,()=>.5);expect(Math.hypot(to.x-from.x,to.y-from.y)+Math.abs(to.scale-from.scale)*600).toBeGreaterThan(24);
});
it('changing speed starts from current pose without a jump',()=>{
 const d=new CameraDirector(()=>.5),s={...defaultSettings,cameraDriftEnabled:true,cameraDriftSpeed:'slow' as const};d.configure(s,0);d.tick(0,undefined,true);
 const before=motionAt(d.state.motion,5000);d.configure({...s,cameraDriftSpeed:'fast'},5000);expect(d.state.motion?.from).toEqual(before);expect(d.state.motion?.endsAt).toBe(12500);
});
