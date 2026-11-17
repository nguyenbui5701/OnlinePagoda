import {expect,it} from 'vitest';
import {defaultSettings,normalizeEvent,safeAvatarUrl,giftWishVariants,dynamicThanksText} from '@vuonsen/shared';
import {parseCommunityCommand} from '../apps/server/src/community-parser';
import {mapTikTokEvent,selectWireFields} from '../apps/server/src/tiktok/mapper';
import {SceneEngine} from '../apps/server/src/engine';

it.each([
  ['cho mình một đóa hoa sen nhé','lotus'],['Sen nở đẹp quá','lotus'],['xin gửi một mâm trái cây tới mọi người','offering'],
  ['Ở chùa mình muốn ngũ quả','offering'],['Hôm nay mình chọn KIM LONG!!!','dragon'],['Mình dùng rồng vàng','dragon'],
  ['gửi yêu thương cho cả nhà','heart'],['cho xin ngọn nến vàng','candle'],['nến!','candle'],['cho mình tiếng chuông ấm áp','bell'],
  ['Một đôi chép vàng lướt nhẹ','fish'],['hoa sen và rồng vàng','lotus'],['rồng vàng và hoa sen','dragon']
])('finds one bounded phrase in %s',(input,effect)=>expect(parseCommunityCommand(input)).toEqual({kind:'effect',effect}));
it.each(['không hoa sen','đừng gửi rồng vàng','chưa muốn ngũ quả','mình nên nghỉ nhé','nền!','chuồng','chương trình','hoasen',
  'xin quẻ và hoa sen','hoa đăng cùng rồng vàng','<b>hoa sen</b>','https://example.com/hoa sen','lấy','mình kể chuyện lạy Phật'])('does not activate %s',s=>expect(parseCommunityCommand(s)).toBeNull());

const photo='https://p16-sign.tiktokcdn.com/avatar/sample.webp?token=public';
it('passes only the selected CDN avatar through IPC, normalization, comments and confirmed gifts',()=>{
  const raw={user:{id:'1',nickname:'<b>An</b>',avatarThumb:{urlList:['http://localhost/private',photo]},token:'SECRET'},common:{roomId:'r',msgId:'c'},content:'cho mình hoa sen'};
  const wire=selectWireFields('chat',raw);expect(JSON.stringify(wire)).not.toContain('SECRET');expect(JSON.stringify(wire)).not.toContain('localhost');
  const mapped=mapTikTokEvent('chat',wire,'r',0);if(mapped.kind!=='event')throw Error('mapper failed');
  expect(normalizeEvent(mapped.event,'s',100)?.avatarUrl).toBe(photo);
  let now=100000;const engine=new SceneEngine({...defaultSettings,autoJoinChat:false},()=>now);engine.mode='tiktok';
  engine.receive(mapped.event);engine.receive(mapped.event);engine.tick();
  expect(engine.snapshot().commentEffects).toHaveLength(1);expect(engine.snapshot().commentEffects?.[0]).toMatchObject({avatarUrl:photo,displayName:'An',effect:'lotus'});
  expect(engine.metrics.giftUnits).toBe(0);expect(engine.actors.size).toBe(0);
  now+=100;engine.receive({...mapped.event,type:'gift',eventId:'gift',gift:{id:'123',finished:true,count:2}});engine.tick();
  expect(engine.snapshot().recentGifts?.[0]).toMatchObject({avatarUrl:photo,displayName:'An',units:2});
  expect(engine.snapshot().commentEffects).toHaveLength(0);expect(engine.metrics.giftUnits).toBe(2);
});
it.each(['http://p16.tiktokcdn.com/a','https://p16.tiktokcdn.com.evil.org/a','https://evil.org/a','https://127.0.0.1/a',
  'file:///x','data:image/png;base64,a','https://secret@p16.tiktokcdn.com/a','https://p16.tiktokcdn.com:8443/a'])('rejects untrusted avatar %s',value=>expect(safeAvatarUrl(value)).toBeUndefined());
it('missing/malformed optional avatar never drops the chat or gift',()=>{
  const mapped=mapTikTokEvent('chat',{user:{id:'1',avatarThumb:{urlList:42}},content:'hoa sen'},'r',0);
  expect(mapped.kind).toBe('event');if(mapped.kind==='event')expect(mapped.event.avatarUrl).toBeUndefined();
});
it('offers forty distinct wishes with stable, safe named speech',()=>{
  expect(new Set(giftWishVariants).size).toBe(40);
  const gift={eventKey:'demo',thanksTemplateKey:'bouquet' as const,displayName:'An Nhiên'};
  expect(dynamicThanksText(gift)).toBe(dynamicThanksText(gift));expect(dynamicThanksText(gift)).toContain('An Nhiên');
  expect(new Set(Array.from({length:500},(_,i)=>dynamicThanksText({...gift,eventKey:`evt${i}`}))).size).toBeGreaterThan(80);
});
