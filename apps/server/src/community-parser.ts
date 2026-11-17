import type {CommentEffectKind} from '@vuonsen/shared';
import { commandText, fold } from './interaction-text';
export type CommunityIntent = { kind:'seat'|'bow'|'chant'|'incense' } | {kind:'effect';effect:CommentEffectKind};
export function parseCommunityCommand(input:string):CommunityIntent|null {
  // "chùa" is not the negative "chưa"; accept this exact seating phrase before folding negatives.
  if(/^vao chua$/.test(fold(input).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()))return {kind:'seat'};
  const c=commandText(input);if(!c)return parseEffectPhrase(input);
  if(/^(ngoi|xin cho)$/.test(c.plain.replace(/^(?:con|em|minh|toi) /,'')))return {kind:'seat'};
  let s=c.plain.replace(/^(?:con|em|minh|toi) (?:xin )?/, '').replace(/^xin /,'');
  if(/^(?:len )?(?:thap (?:nhan|nhang|huong)|dang huong)$/.test(s))return {kind:'incense'};
  if (!/(?<!\p{L})(lấy|lây|lầy)(?!\p{L})/iu.test(input.normalize('NFC')) && /^(lay|lay phat|le phat|bai phat|danh le|danh le phat)$/.test(s))return {kind:'bow'};
  if (/^(nam mo a di da phat|a di da phat|nam mo)$/.test(s))return {kind:'chant'};
  return parseEffectPhrase(input);
}

/** Effect phrases may occur inside prose. Other ritual grammars remain bounded. */
export function parseEffectPhrase(input:string):CommunityIntent|null {
  if(input.length>1000)return null;
  const clean=input.normalize('NFC').toLowerCase();
  const plain=fold(clean.replace(/\bchùa\b/gu,'temple').replace(/đúng|dùng/gu,'use')).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  if(/\b(khong|dung|chua|chang|khoi)\b/.test(plain)||/https?:|www\.|[<>]/.test(clean))return null;
  // Do not turn an unsupported/mixed fortune or lantern sentence into another effect.
  if(/\b(que|xam|hoa dang|tha den|lay phat|le phat|nam mo|thap nhan|thap nhang|thap huong|dang huong)\b/.test(plain))return null;
  const groups=[
    ['long-phung',['long phung','rong phuong']],
    ['phoenix',['phuong hoang','chim phuong']],
    ['sen-heart',['sen yeu thuong']],
    ['sen-fish',['sen ca chep']],
    ['sen-candle',['sen anh nen']],
    ['candle',['thap nen','dot nen','ngon nen','nen','thap den','anh nen','nen binh an']],
    ['heart',['trai tim','yeu thuong','tha tim','tim vang']],
    ['lotus',['hoa sen','dang sen','doa sen','bong sen','sen no']],
    ['bell',['thinh chuong','danh chuong','tieng chuong','chuong','go chuong','ngan chuong','chuong binh an']],
    ['offering',['ngu qua','dang qua','mam qua','mam trai cay']],
    ['fish',['ca chep','tha ca','chep vang','ca koi','koi vang','ca vang']],
    ['dragon',['rong vang','kim long','than long']]
  ] as const;
  let first:{index:number;effect:typeof groups[number][0]}|undefined;
  for(const [effect,aliases] of groups)for(const alias of aliases){
    // Accent folding must not turn ordinary “nên/nền” or “chuồng” into commands.
    if(alias==='nen'&&/(?<!\p{L})(?:nên|nền)(?!\p{L})/u.test(clean)&&!/(?<!\p{L})nến(?!\p{L})/u.test(clean))continue;
    if(alias==='chuong'&&/chuồng|chương|chướng/u.test(clean)&&!clean.includes('chuông'))continue;
    const match=new RegExp(`\\b${alias}\\b`).exec(plain);
    if(match&&(!first||match.index<first.index))first={index:match.index,effect};
  }
  return first?{kind:'effect',effect:first.effect}:null;
}
