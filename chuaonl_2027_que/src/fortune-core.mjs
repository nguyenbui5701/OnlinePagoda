/** Chùa Online — original 2027 fortune interaction module, server-side only.
 * No TikTok dependencies, no purchases, no raw chat logging or personal birthdate storage.
 * The calling app must invoke `onChat` AFTER trusted event validation and BEFORE raw text is discarded.
 */
import { createHash } from 'node:crypto';
const VALID_TOPICS = new Set(['binh_an','gia_dao','suc_khoe','cong_viec','tai_loc','hoc_tap','tinh_duyen','ban_be',
  'xuat_hanh','khai_xuan','tam_an','du_dinh','hieu_thuan','hoa_giai','quy_nhan','phuc_lanh']);
const ALIASES = new Map([
  ['binh an','binh_an'],['cau an','binh_an'],['gia dao','gia_dao'],['gia dinh','gia_dao'],
  ['suc khoe','suc_khoe'],['cong viec','cong_viec'],['viec lam','cong_viec'],['tai loc','tai_loc'],
  ['tien bac','tai_loc'],['hoc tap','hoc_tap'],['hoc hanh','hoc_tap'],['thi cu','hoc_tap'],
  ['tinh duyen','tinh_duyen'],['tinh yeu','tinh_duyen'],['ban be','ban_be'],
  ['xuat hanh','xuat_hanh'],['di xa','xuat_hanh'],['khai xuan','khai_xuan'],
  ['tam an','tam_an'],['du dinh','du_dinh'],['muc tieu','du_dinh'],
  ['hieu thuan','hieu_thuan'],['cha me','hieu_thuan'],['hoa giai','hoa_giai'],
  ['quy nhan','quy_nhan'],['phuc lanh','phuc_lanh'],['phuc duc','phuc_lanh'],
]);
const ZODIAC = new Map([
 ['ty','ty'],['chuot','ty'],['suu','suu'],['trau','suu'],['dan','dan'],['ho','dan'],
 ['mao','mao'],['meo','mao'],['thin','thin'],['rong','thin'],['ti','ti'],['ran','ti'],
 ['ngo','ngo'],['ngua','ngo'],['mui','mui'],['de','mui'],['than','than'],['khi','than'],
 ['dau','dau'],['ga','dau'],['tuat','tuat'],['cho','tuat'],['hoi','hoi'],['heo','hoi'],['lon','hoi'],
]);
export function plain(text){
 return String(text||'').normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/gi,'d')
   .toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
}
export function cleanName(text){
 return Array.from(String(text||'Khách an lành').normalize('NFC').replace(/<[^>]*>/g,'')
  .replace(/(?:https?:\/\/|www\.)\S+/gi,'').replace(/[\p{Cc}\p{Cf}]/gu,'')
  .replace(/\s+/g,' ').trim()).slice(0,18).join('') || 'Khách an lành';
}
/** Strict keywords prevent ordinary chat, gift, and blessing messages from triggering fortune draws. */
export function parseFortuneCommand(input){
 if(typeof input!=='string' || input.length>140) return null;
 const raw=plain(input);
 if(!raw) return null;
 let body='';
 for(const prefix of ['xin que','xin xam','boi que','boi xam','rut que','rut xam','xem que','que']){
   if(raw===prefix){body='';break;}
   if(raw.startsWith(prefix+' ')){body=raw.slice(prefix.length).trim();break;}
 }
 if(raw && body==='' && !['xin que','xin xam','boi que','boi xam','rut que','rut xam','xem que','que'].includes(raw)){
   // A prefix must actually have been recognized; avoid matching ordinary chat.
   if(!['xin que','xin xam','boi que','boi xam','rut que','rut xam','xem que','que'].some(k=>raw.startsWith(k+' '))) return null;
 }
 if(!body) return {scope:'chu_de',theme:null};
 if(/^(?:1991|tan mui|tan mui 1991|tuoi tan mui|tuoi tan mui 1991)$/.test(body))
   return {scope:'tan_mui_1991',theme:'tan_mui_1991'};
 if(/^so \d{1,3}$/.test(body)){
   const number=Number(body.slice(3)); return number>=1&&number<=576 ? {scope:'by_number',number}:null;
 }
 if(/^\d{1,3}$/.test(body)){
   const number=Number(body);return number>=1&&number<=576 ? {scope:'by_number',number}:null;
 }
 const maybeZodiac=body.replace(/^tuoi /,'');
 if(ZODIAC.has(maybeZodiac))return {scope:'con_giap',theme:'tuoi_'+ZODIAC.get(maybeZodiac)};
 const theme=ALIASES.get(body) || (VALID_TOPICS.has(body)?body:null);
 return theme ? {scope:'chu_de',theme}:null;
}

function dayKey(when){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(when));}
function stableNumber(str){ const bytes=createHash('sha256').update(str).digest(); return bytes.readUInt32BE(0)>>>0; }
export class FortuneQueue {
 constructor(items,{cooldownMs=60000,globalGapMs=7000,maxQueue=32,maxTracked=6000}={}){
   if(!Array.isArray(items)||items.length<100)throw new Error('Missing or invalid fortune catalogue');
   this.items=items;this.cooldownMs=cooldownMs;this.globalGapMs=globalGapMs;
   this.maxQueue=maxQueue;this.maxTracked=maxTracked;
   this.session=null;this.pending=[];this.nextAt=0;
   this.seen=new Map();this.lastRequest=new Map();this.daily=new Map();
   this.byId=new Map(items.map(v=>[v.number,v]));
   this.groups=new Map();
   for(const item of items){
     const group=item.collection+':'+item.theme;
     if(!this.groups.has(group))this.groups.set(group,[]);
     this.groups.get(group).push(item);
   }
   this.general=items.filter(v=>v.collection==='chu_de');
 }
 reset(session){this.session=session;this.pending=[];this.nextAt=0;this.seen.clear();this.lastRequest.clear();this.daily.clear();}
 /** accepts trusted, already-validated chat ONLY. `userKey` is a server-computed stable scoped ID. */
 onChat({sessionId,userKey,displayName,eventId,text,now=Date.now()}){
   if(typeof sessionId!=='string'||!sessionId||typeof userKey!=='string'||!userKey)return {status:'ignored'};
   if(this.session!==sessionId)this.reset(sessionId);
   const command=parseFortuneCommand(text);
   if(!command)return {status:'ignored'};
   if(eventId && this.seen.has(eventId))return {status:'duplicate'};
   if(eventId){this.seen.set(eventId,now);if(this.seen.size>2048)this.seen.delete(this.seen.keys().next().value);}
   if((this.lastRequest.get(userKey)??-Infinity)+this.cooldownMs>now)return {status:'cooldown'};
   const today=dayKey(now),topic=command.scope==='by_number'?'number_'+command.number:(command.theme??'random');
   const dailyKey=`${sessionId}|${today}|${userKey}|${topic}`;
   if(this.daily.has(dailyKey))return {status:'already_today',fortune:this.daily.get(dailyKey)};
   if(this.pending.length>=this.maxQueue)return {status:'busy'};
   let item;
   if(command.scope==='by_number')item=this.byId.get(command.number);
   else{
     const group=command.theme ? this.groups.get(command.scope+':'+command.theme) : this.general;
     if(!group?.length)return {status:'ignored'};
     item=group[stableNumber(dailyKey)%group.length];
   }
   if(!item)return {status:'ignored'};
   this.lastRequest.set(userKey,now);
   this.daily.set(dailyKey,item);
   if(this.daily.size>this.maxTracked)this.daily.delete(this.daily.keys().next().value);
   if(this.lastRequest.size>this.maxTracked)this.lastRequest.delete(this.lastRequest.keys().next().value);
   this.pending.push({userKey,displayName:cleanName(displayName),fortune:item,queuedAt:now});
   return {status:'queued',fortune:item};
 }
 next(now=Date.now()){
   if(!this.pending.length || now<this.nextAt)return null;
   const entry=this.pending.shift();this.nextAt=now+this.globalGapMs;
   const f=entry.fortune;
   return {type:'FORTUNE_REVEAL',userKey:entry.userKey,displayName:entry.displayName,
    fortune:f,overlay:{title:`QUẺ ${String(f.number).padStart(3,'0')} · ${f.title}`,
    subtitle:entry.displayName+' · '+f.theme_label,short:f.short_text,action:f.action},
    voiceText:`Xin mời ${entry.displayName}. ${f.voice_text}`.slice(0,450)};
 }
 status(){return {queued:this.pending.length,session:this.session,tracked:this.daily.size};}
}
