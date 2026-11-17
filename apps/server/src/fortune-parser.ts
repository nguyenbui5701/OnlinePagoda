import { commandText } from './interaction-text';
import { fortuneIntentSchema, type FortuneIntent } from '@vuonsen/shared';
// Adapted from the supplied fortune-core.mjs; strict whole commands, no raw text retained.
const aliases:Record<string,string>={
  'binh an':'binh_an','cau an':'binh_an','gia dao':'gia_dao','gia dinh':'gia_dao',
  'suc khoe':'suc_khoe','cong viec':'cong_viec','viec lam':'cong_viec','tai loc':'tai_loc','tien bac':'tai_loc',
  'hoc tap':'hoc_tap','hoc hanh':'hoc_tap','thi cu':'hoc_tap','tinh duyen':'tinh_duyen','tinh yeu':'tinh_duyen',
  'ban be':'ban_be','xuat hanh':'xuat_hanh','di xa':'xuat_hanh','khai xuan':'khai_xuan','tam an':'tam_an',
  'du dinh':'du_dinh','muc tieu':'du_dinh','hieu thuan':'hieu_thuan','cha me':'hieu_thuan','ba me':'hieu_thuan','bo me':'hieu_thuan',
  'hoa giai':'hoa_giai','quy nhan':'quy_nhan','phuc lanh':'phuc_lanh','phuc duc':'phuc_lanh'
};
const zodiac:Record<string,string>={ty:'ty',chuot:'ty',suu:'suu',trau:'suu',dan:'dan',ho:'dan',mao:'mao',meo:'mao',thin:'thin',rong:'thin',ti:'ti',ran:'ti',ngo:'ngo',ngua:'ngo',mui:'mui',de:'mui',than:'than',khi:'than',dau:'dau',ga:'dau',tuat:'tuat',cho:'tuat',hoi:'hoi',heo:'hoi',lon:'hoi'};
export function parseFortuneCommand(input:unknown):FortuneIntent|null {
  const command=commandText(input);if(!command)return null;
  const {original,plain}=command;
  const match=/^(?:xin que|xin xam|boi que|boi xam|rut que|rut xam|xem que|que)(?: (.*))?$/.exec(plain);
  if(!match)return null;
  const body=match[1]||'';let candidate:unknown;
  if(!body)candidate={scope:'chu_de',theme:null};
  else if(/^(?:1991|tan mui|tan mui 1991|tuoi tan mui|tuoi tan mui 1991)$/.test(body))candidate={scope:'tan_mui_1991',theme:'tan_mui_1991'};
  else if(/^(?:so )?\d{1,3}$/.test(body))candidate={scope:'by_number',number:Number(body.replace(/^so /,''))};
  else {
    // Vietnamese Tý (rat) and Tỵ (snake) collapse to the same accentless spelling.
    const sign=/(?:^|\s)tỵ(?=[\s.!?,]|$)/iu.test(original)?'ti':zodiac[body.replace(/^tuoi /,'')];
    if(sign)candidate={scope:'con_giap',theme:'tuoi_'+sign};
    else if(aliases[body])candidate={scope:'chu_de',theme:aliases[body]};
    else return null;
  }
  const result=fortuneIntentSchema.safeParse(candidate);return result.success?result.data:null;
}
