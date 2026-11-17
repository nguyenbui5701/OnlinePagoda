import {beforeEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const load=vi.hoisted(()=>vi.fn());
vi.mock('pixi.js',()=>({Assets:{load}}));
import {loadCameraArt} from '../apps/overlay/src/golden/camera-art';
import type {Texture} from 'pixi.js';
const front={hall:{label:'front-hall'} as Texture,statue:{label:'front-statue'} as Texture,urn:{label:'front-urn'} as Texture};
beforeEach(()=>{load.mockReset();load.mockImplementation(async (url:string)=>({label:url,width:941,height:1672}));});
it('selects independently drawn rooms matching the reference, retaining statue direction without mirroring',async()=>{
 const r=await loadCameraArt(front);
 expect(r.cleanErrors).toEqual({});expect(r.errors).toEqual({});expect(r.cleanArt.get('front')).toBe(front);
 for(const v of ['left','right','wide'] as const){
  expect(r.cleanArt.get(v)?.hall.label).toBe(v==='wide'?'/overlay/art/temple-v2/hall-wide.png':`/overlay/art/temple-v2/reference/hall-${v}.png`);
  expect(r.cleanArt.get(v)?.statue).toBe(r.art.get(v)?.statue);expect(r.cleanArt.get(v)?.urn).toBe(r.art.get(v)?.urn);
  expect(r.art.get(v)?.hall.label).toBe(`/overlay/art/multicamera/hall-${v}.png`);
 }
});
it('missing clean art does not damage legacy scenes or fall back to the mismatched legacy floor',async()=>{
 load.mockImplementation(async (url:string)=>{if(url.includes('temple-v2/reference/hall-right'))throw Error('fixture missing');return {label:url};});
 const r=await loadCameraArt(front);
 expect(r.cleanArt.has('right')).toBe(false);expect(r.cleanErrors.right).toContain('right');
 expect(r.art.has('right')).toBe(true);expect(r.errors).toEqual({});expect(r.cleanArt.has('left')).toBe(true);expect(r.cleanArt.get('front')).toBe(front);
});
it('packaged originals retain their exact bytes; quality metadata does not claim 1080p',()=>{
 const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
 for(const v of ['left','right','wide']){
  const input=readFileSync(v==='wide'?`stage4_assets/incoming/hall-${v}-clean.png`:`stage4_assets/incoming/hall-${v}.png`);
  const asset=readFileSync(v==='wide'?`apps/overlay/public/art/temple-v2/hall-${v}.png`:`apps/overlay/public/art/temple-v2/reference/hall-${v}.png`);
  expect(hash(asset)).toBe(hash(input));expect(asset.subarray(1,4).toString()).toBe('PNG');
  const width=asset.readUInt32BE(16),height=asset.readUInt32BE(20);
  expect(width).toBeGreaterThanOrEqual(720);expect(height).toBeGreaterThanOrEqual(1280);expect(Math.abs(width/height-9/16)).toBeLessThan(.005);
 }
});
