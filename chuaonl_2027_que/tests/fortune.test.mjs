import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {FortuneQueue,parseFortuneCommand} from '../src/fortune-core.mjs';
const data=JSON.parse(readFileSync(new URL('../data/que_dinh_mui_2027_576.json',import.meta.url),'utf8'));
const pack=data.items;
test('576 original, sequential, non-duplicate fortune entries',()=>{
 assert.equal(pack.length,576);assert.equal(new Set(pack.map(x=>x.id)).size,576);
 assert.equal(new Set(pack.map(x=>x.voice_text)).size,576);
 assert.equal(pack.filter(x=>x.collection==='chu_de').length,384);
 assert.equal(pack.filter(x=>x.collection==='con_giap').length,144);
 assert.equal(pack.filter(x=>x.collection==='tan_mui_1991').length,48);
});
test('Vietnamese accented and accentless commands',()=>{
 for(const x of ['xin quẻ','xin que','xin xăm','xin xam','bói quẻ','rút quẻ'])assert.equal(parseFortuneCommand(x)?.scope,'chu_de',x);
 for(const x of ['xin quẻ gia đạo','xin que gia dao'])assert.equal(parseFortuneCommand(x)?.theme,'gia_dao');
 assert.equal(parseFortuneCommand('xin quẻ tuổi Mùi')?.theme,'tuoi_mui');
 assert.equal(parseFortuneCommand('xin quẻ 1991')?.scope,'tan_mui_1991');
 assert.equal(parseFortuneCommand('xin quẻ Tân Mùi')?.scope,'tan_mui_1991');
 assert.equal(parseFortuneCommand('xin quẻ số 576')?.number,576);
});
test('no accidental triggers from chat / normal prayer or gift',()=>{
 for(const x of ['cầu an','lễ phật','xin tiền','quẻo','xin quẻ 999','bình luận để vào chùa','chúc bình an']) assert.equal(parseFortuneCommand(x),null,x);
});
test('one draw per user per topic per local day, no paid gifts needed',()=>{
 const q=new FortuneQueue(pack,{cooldownMs:1000});const now=Date.parse('2027-02-06T12:00:00+07:00');
 const base={sessionId:'s1',userKey:'u1',displayName:'Lan',text:'xin quẻ bình an',now};
 const first=q.onChat({...base,eventId:'e1'});assert.equal(first.status,'queued');
 assert.equal(q.onChat({...base,now:now+1001,eventId:'e2'}).status,'already_today');
 const next=q.onChat({...base,now:now+2002,eventId:'e3',text:'xin quẻ công việc'});assert.equal(next.status,'queued');
 assert.notEqual(first.fortune.theme,next.fortune.theme);
});
test('dedupe event ids, cooldown, no cross-room state',()=>{
 const q=new FortuneQueue(pack);const t=Date.parse('2027-02-06T12:00:00+07:00');
 const base={sessionId:'s1',userKey:'tiktok:roomA:123',displayName:'A',eventId:'eid',text:'xin quẻ',now:t};
 assert.equal(q.onChat(base).status,'queued');
 assert.equal(q.onChat(base).status,'duplicate');
 assert.equal(q.onChat({...base,eventId:'eid2',now:t+20}).status,'cooldown');
 assert.equal(q.onChat({...base,sessionId:'roomB',eventId:'eid3'}).status,'queued');
 assert.equal(q.status().queued,1);
});
test('bounded bursts and global display throttling',()=>{
 const q=new FortuneQueue(pack,{maxQueue:4,globalGapMs:7000});let t=Date.parse('2027-02-06T12:00:00+07:00');
 for(let i=0;i<4;i++)assert.equal(q.onChat({sessionId:'s1',userKey:'u'+i,displayName:'Person '+i,text:'xin que',now:t+i}).status,'queued');
 assert.equal(q.onChat({sessionId:'s1',userKey:'u9',displayName:'X',text:'xin que',now:t+10}).status,'busy');
 assert.ok(q.next(t));assert.equal(q.next(t+3000),null);assert.ok(q.next(t+7000));
});
test('not storing raw chat; display name is sanitized',()=>{
 const q=new FortuneQueue(pack);const t=Date.parse('2027-02-06T12:00:00+07:00');
 q.onChat({sessionId:'s1',userKey:'u1',displayName:'<b>Nam</b> https://bad.tld',text:'xin que gia dao',now:t});
 const x=q.next(t);assert.equal(x.displayName,'Nam ' .trim());
 assert.ok(!JSON.stringify(q).includes('xin que gia dao'));
 assert.ok(!x.voiceText.includes('https:'));
});
test('numeric fortune direct lookup does not mutate any source data',()=>{
 const q=new FortuneQueue(pack);const t=Date.parse('2027-02-06T12:00:00+07:00');
 const f=q.onChat({sessionId:'s1',userKey:'u1',displayName:'A',text:'xem quẻ 576',now:t});
 assert.equal(f.fortune.number,576);
});
