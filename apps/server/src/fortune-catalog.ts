import { readFileSync } from 'node:fs';
import { z } from 'zod';
const itemSchema=z.object({
  id:z.string().regex(/^DM27-\d{3}$/),number:z.number().int().min(1).max(576),
  collection:z.enum(['chu_de','con_giap','tan_mui_1991']),theme:z.string().min(1).max(40),
  theme_label:z.string().min(1).max(60),title:z.string().min(1).max(100),
  short_text:z.string().min(1).max(300),action:z.string().min(1).max(180),blessing:z.string().min(1).max(200)
});
export type FortuneItem=z.infer<typeof itemSchema>;
let cached:readonly FortuneItem[]|undefined;
export function readFortuneCatalog(url:URL):readonly FortuneItem[]{
  try{
    const data=z.object({items:z.array(itemSchema).length(576)}).parse(JSON.parse(readFileSync(url,'utf8')));
    if(new Set(data.items.map(i=>i.number)).size!==576||data.items.some(i=>i.id!==`DM27-${String(i.number).padStart(3,'0')}`))return [];
    return Object.freeze(data.items.map(i=>Object.freeze(i)));
  }catch{return [];}
}
export function getFortuneCatalog(){
  if(!cached){cached=readFortuneCatalog(new URL('./data/que_dinh_mui_2027_576.json',import.meta.url));if(!cached.length)console.warn('Kho quẻ 2027 thiếu hoặc không hợp lệ; tạm tắt xin quẻ, các tính năng khác vẫn hoạt động.');}
  return cached;
}
