import {expect,it} from 'vitest';
import {carpetSourceRow,floorCushionPoint} from '@vuonsen/shared';
it('repeats a limited-depth original carpet band with projective sampling and removes old prayer rugs',()=>{
 expect(carpetSourceRow(0).y).toBe(1260);
 expect(carpetSourceRow(1).y).toBe(1540);
 expect(carpetSourceRow(.125)).toEqual(carpetSourceRow(.375));
 for(let i=0;i<=100;i++){const r=carpetSourceRow(i/100);expect(r.y).toBeGreaterThanOrEqual(1260);expect(r.y).toBeLessThanOrEqual(1540);
  expect((r.left-420)/-190).toBeCloseTo((r.y-870)/801,8);
  expect((r.right-525)/185).toBeCloseTo((r.y-870)/801,8);
 }
 expect(carpetPatches().filter(p=>p.kind==='prayer')).toHaveLength(0);
});
it('wide chair banks have evenly spaced columns rather than the frontal carpet clearance taper',()=>{
 for(let row=0;row<10;row++){
  const y=floorHome(seats[row*10]).y,d=1-.00008*(y-1050);
  for(let col=0;col<10;col++){
   const home=floorHome(seats[row*10+col]),p=floorPoint('wide',home.x,home.y);
   const logicalX=col<5?55+col*305/4:720+(col-5)*305/4;
   expect(p.x).toBeCloseTo(540+.82*(logicalX-540)/d,6);
   expect(home.id).toBe(seats[row*10+col].id);
  }
 }
});
it.each(['left','right','wide'] as const)('%s projects both chair banks on the same regular grid as the runner',view=>{
 const side=view==='left'?1:view==='right'?-1:0;
 for(let col=0;col<10;col++){
  const column=Array.from({length:10},(_,row)=>floorHome(seats[row*10+col]));
  const points=column.map(s=>floorPoint(view,s.x,s.y));
  const first=points[0],last=points[9];
  for(let row=0;row<10;row++){
   const h=column[row],p=points[row],X=(col<5?55+col*305/4:720+(col-5)*305/4)-540,Z=h.y-1050;
   const d=1+side*.00025*X-(view==='wide'?.00008:.00010)*Z;
   expect(p.x).toBeCloseTo(floorCameraProfiles[view].urn.x+((side?.74:.82)*X+side*.80*Z)/d,6);
   expect(p.y).toBeCloseTo(floorCameraProfiles[view].urn.y+(-side*.09*X+(view==='wide'?.71:.66)*Z)/d,6);
   expect(Math.abs((last.x-first.x)*(p.y-first.y)-(last.y-first.y)*(p.x-first.x))).toBeLessThan(1e-6);
   expect(floorCushionPoint(view,h.x,h.y,0,0)).toEqual(p);
  }
 }
});
import {floorCameraProfiles,cameraViews,floorPoint,floorHome,seats,defaultSettings,settingsPatchSchema,actorHome,carpetV2,carpetPatches,cameraFaceBounds,cameraRect,cameraFrame,driftTarget,offeringCamera,type Actor} from '@vuonsen/shared';
it.each(cameraViews)('%s ground preserves straight rows and carpet edges',view=>{
 for(const [a,b] of [[{x:462,y:1050},{x:462,y:1950}],[{x:618,y:1050},{x:618,y:1950}],[{x:25,y:1400},{x:1055,y:1400}]] as const){
  const p=floorPoint(view,a.x,a.y),q=floorPoint(view,b.x,b.y);
  for(let i=0;i<=20;i++){const t=i/20,r=floorPoint(view,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);expect(Math.abs((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x))).toBeLessThan(1e-6);}
 }
});
it.each(cameraViews)('%s keeps 100 unique seat identities, anchors urn, leaves standing room',view=>{
 const before=JSON.stringify(seats),points=seats.map(s=>floorPoint(view,floorHome(s).x,floorHome(s).y));
 expect(new Set(points.map(p=>`${p.x}:${p.y}`)).size).toBe(100);expect(JSON.stringify(seats)).toBe(before);
 for(const p of points){
  // Reference obliques intentionally crop the near bank; identities/ownership persist.
  expect(p.x).toBeGreaterThan(view==='left'||view==='right'?-250:30);
  expect(p.x).toBeLessThan(view==='left'||view==='right'?1330:1050);
  expect(p.y).toBeGreaterThan(1120);expect(p.y).toBeLessThan(1850);expect(p.scale).toBeGreaterThanOrEqual(.9);
 }
 const anchor=floorPoint(view,540,1050);expect(anchor.x).toBe(floorCameraProfiles[view].urn.x);expect(anchor.y).toBe(floorCameraProfiles[view].urn.y);
});
it('preview opt-in does not overwrite settings or activate in saved installations',()=>{
 expect(defaultSettings.templeFloorPreview).toBe(false);expect(settingsPatchSchema.parse({templeFloorPreview:true})).toEqual({templeFloorPreview:true});
});
it('one continuous central runner; branch/prayer rugs join its edges without cutting through it',()=>{
 const patches=carpetPatches(),aisles=patches.filter(p=>p.kind==='aisle');expect(aisles).toHaveLength(1);
 expect(patches.at(-1)).toBe(aisles[0]);expect(aisles[0].y).toBe(1050);expect(aisles[0].height).toBe(1000);
 expect(patches.filter(p=>p.kind==='branch')).toHaveLength(20);
 for(const p of patches.filter(p=>p.kind!=='aisle')){
  expect(p.x+p.width<=carpetV2.left||p.x>=carpetV2.right).toBe(true);
  expect(p.x+p.width===carpetV2.left||p.x===carpetV2.right).toBe(true);
 }
});
it.each(['left','right'] as const)('%s follows the reference altar-to-opposite-foreground diagonal without a bent runner',view=>{
 const start=floorPoint(view,540,1050),end=floorPoint(view,540,1950);
 if(view==='left'){expect(start.x).toBeLessThan(540);expect(end.x).toBeGreaterThan(1080);}
 else {expect(start.x).toBeGreaterThan(540);expect(end.x).toBeLessThan(0);}
 expect(Math.abs((end.x-start.x)/(end.y-start.y))).toBeGreaterThan(1);
 expect(Math.abs((end.x-start.x)/(end.y-start.y))).toBeLessThan(1.3);
});
it.each(cameraViews)('%s standing slots, aisle and row branches use the same ground',view=>{
 for(let i=0;i<20;i++){
  const home=floorHome(actorHome({seatId:`standing-${i}`,standingSlot:i} as Actor)),p=floorPoint(view,home.x,home.y);
  const oblique=view==='left'||view==='right';
  expect(p.x).toBeGreaterThan(oblique?-370:0);expect(p.x).toBeLessThan(oblique?1450:1080);expect(p.y).toBeLessThan(oblique?1980:1920);
 }
 for(const seat of seats){const home=floorHome(seat),row=Number(seat.id.slice(5))/10|0;
  expect(carpetV2.branches[row]-home.y).toBe(31);
  expect(home.x<carpetV2.left||home.x>carpetV2.right).toBe(true);
 }
});
it.each(cameraViews)('%s clean architecture keeps transformed face exclusions and focus anchor',view=>{
 const settings={...defaultSettings,templeFloorPreview:true};
 const state={settings,camera:{view,revision:1,stage:'automatic' as const}};
 expect(cameraFaceBounds(state,500)).toEqual(cameraRect(floorCameraProfiles[view].face,cameraFrame(state,500)));
 for(let i=0;i<=10;i++){
  const pose=driftTarget(view,i/10,1-i/10,.5,true),face=cameraRect(floorCameraProfiles[view].face,pose);
  expect(face.y).toBeGreaterThanOrEqual(218);expect(face.x).toBeGreaterThanOrEqual(24);
  expect(pose.x+1080*pose.scale).toBeGreaterThanOrEqual(1080-1e-7);
 }
 const p=floorPoint(view,540,1182),focus=offeringCamera(view,true);
 expect(p.x*focus.scale+focus.x).toBeCloseTo(540,5);
 // A lower physical altar may reach the background coverage limit before 1018.
 const target=Math.max(1018,p.y*focus.scale+1920*(1-focus.scale));
 expect(p.y*focus.scale+focus.y).toBeCloseTo(target,5);
 expect(target).toBeLessThan(1100);expect(focus.y+1920*focus.scale).toBeGreaterThanOrEqual(1920-1e-7);
});
