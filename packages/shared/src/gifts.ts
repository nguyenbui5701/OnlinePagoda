import { z } from 'zod';
export const giftGroups = ['rose','heart','bouquet','donut','offering','corgi','lantern','lion'] as const;
export const giftGroupSchema = z.enum(giftGroups);
export type GiftGroup = typeof giftGroups[number];
export type ThanksKey = GiftGroup | 'generic';
export const giftEffectSchema = z.enum(['rose','heart','lotus','bell','offering','fish','lantern','dragon','candle']);
export type GiftEffect = z.infer<typeof giftEffectSchema>;
export const giftDefinitions: { group: GiftGroup; label: string; action: string; effect: GiftEffect; icon: string; voice: string }[] = [
  { group:'rose',label:'Hoa hồng',action:'Thắp nến hương',effect:'rose',icon:'❀',voice:'Cảm ơn {name} đã gửi hoa hồng. Xin chúc bạn bình an.' },
  { group:'heart',label:'Tim ngón tay',action:'Thắp đèn yêu thương',effect:'heart',icon:'♡',voice:'Cảm ơn {name} đã thắp ánh đèn yêu thương.' },
  { group:'bouquet',label:'Bó hoa',action:'Dâng hoa sen',effect:'lotus',icon:'❃',voice:'Xin cảm ơn {name} đã dâng hoa sen. Chúc gia đình an lành.' },
  { group:'donut',label:'Bánh donut',action:'Thỉnh chuông',effect:'bell',icon:'◉',voice:'Cảm ơn {name}. Một tiếng chuông bình an xin được ngân lên.' },
  { group:'offering',label:'Tay bắn tim',action:'Dâng mâm ngũ quả',effect:'offering',icon:'♧',voice:'Cảm ơn {name} đã gửi tấm lòng thành. Chúc mọi điều tốt đẹp.' },
  { group:'corgi',label:'Chó Corgi',action:'Cá chép biểu tượng',effect:'fish',icon:'≈',voice:'Xin cảm ơn {name}. Chúc bạn luôn bình an và nhiều niềm vui.' },
  { group:'lantern',label:'Súng tiền',action:'Thả hoa đăng',effect:'lantern',icon:'◇',voice:'Cảm ơn {name} đã thả hoa đăng. Mong lời chúc tốt lành lan tỏa.' },
  { group:'lion',label:'Sư tử',action:'Rồng vàng hộ pháp',effect:'dragon',icon:'☼',voice:'Xin cảm ơn {name} với món quà đặc biệt. Chúc bạn và gia đình an lành.' }
];
export const giftCatalogEntrySchema = z.object({
  unitCoins:z.number().int().min(1).max(10000000).optional(),
  group: giftGroupSchema, giftId: z.string().regex(/^\d{1,30}$/).or(z.literal('')).default(''),
  label: z.string().trim().min(1).max(28).regex(/^[\p{L}\p{N}\s-]+$/u),
  effect: giftEffectSchema, thanksTemplateKey: giftGroupSchema, verified: z.boolean().default(false)
}).refine(row => !row.verified || Boolean(row.giftId), 'Cần gift ID thực để xác nhận');
export const giftCatalogSchema = z.array(giftCatalogEntrySchema).max(64).refine(rows => {
  const ids = rows.filter(r => r.giftId).map(r => r.giftId); return new Set(ids).size === ids.length;
}, 'Gift ID không được trùng');
export type GiftCatalogEntry = z.infer<typeof giftCatalogEntrySchema>;
export const defaultGiftCatalog: GiftCatalogEntry[] = giftDefinitions.map(d => ({group:d.group,giftId:'',label:d.label,effect:d.effect,thanksTemplateKey:d.group,verified:false}));
export interface GiftConfirmed {
  unitCoins?:number; totalCoins?:number; valueSource?:'payload'|'catalog'|'unknown'; tier?:1|2|3|4; comboKey?:string;
  avatarUrl?: string;
  version: 1; eventKey: string; source: 'demo'|'tiktok'; roomId: string; userId: string; userKey: string;
  displayName: string; giftId: string; giftName: string; units: number; receivedAt: number;
  mappedEffect: GiftEffect; thanksTemplateKey: ThanksKey; scoreDelta: number; mapped: boolean; actionLabel: string;
}
export interface LeaderboardEntry { key: string; displayName: string; score: number; units: number; firstAt: number; firstOrder: number }
export interface ObservedGift { giftId: string; giftName: string; source: 'demo'|'tiktok'; observedAt: number }
export function thanksText(gift: Pick<GiftConfirmed,'thanksTemplateKey'|'displayName'|'giftName'>) {
  const template = giftDefinitions.find(d => d.group === gift.thanksTemplateKey)?.voice || 'Xin cảm ơn {name} đã gửi {giftName}. Chúc bạn bình an.';
  return template.replace('{name}',gift.displayName).replace('{giftName}',gift.giftName);
}

/** Giai doan 3.2: bien tap loi doc co ten, dung cho TTS dong. Khong thay doi 9 clip thu san. */
export const giftWishVariants = [
  'Kính chúc bạn và gia đình luôn bình an, mạnh khỏe.',
  'Nguyện cầu gia đạo bình an, mọi việc được hanh thông.',
  'Chúc bạn mỗi ngày đều có nhiều niềm vui và sự an yên.',
  'Mong gia đình bạn luôn sum vầy, hòa thuận và hạnh phúc.',
  'Chúc bạn thật nhiều sức khỏe và vững lòng trước mọi thử thách.',
  'Nguyện mong người thân của bạn luôn mạnh khỏe, an lành.',
  'Chúc công việc thuận lợi và cuộc sống nhiều điều tốt đẹp.',
  'Mong những lo âu dần nhẹ đi, để lòng luôn thanh thản.',
  'Kính chúc bạn một ngày an vui và tràn đầy năng lượng tích cực.',
  'Chúc gia đình bạn luôn ấm êm, yêu thương và gắn bó.',
  'Mong những điều bình dị, tốt lành luôn đến với bạn.',
  'Nguyện cầu mọi người được khỏe mạnh và sống trong an yên.',
  'Chúc bạn giữ được sự bình tĩnh, niềm vui và lòng biết ơn.',
  'Mong những dự định của bạn được thuận lợi và suôn sẻ.',
  'Kính chúc bạn và người thân một cuộc sống an lành, hạnh phúc.',
  'Nguyện cầu bình an đến với bạn trong từng ngày sắp tới.',
  'Chúc bạn có một buổi tối nhẹ lòng và giấc ngủ thật yên.',
  'Mong mỗi sớm mai đều mang đến cho bạn một niềm vui nhỏ.',
  'Chúc bạn luôn tìm thấy sự ấm áp bên những người thân yêu.',
  'Mong những bước chân hôm nay đưa bạn đến điều tốt lành.',
  'Chúc bạn đủ kiên nhẫn với mình và dịu dàng với mọi người.',
  'Mong một chút bình yên ở đây theo bạn suốt cả ngày.',
  'Chúc mái nhà của bạn luôn đầy tiếng cười và sự sẻ chia.',
  'Mong bạn có thêm niềm tin để chăm sóc những ước mơ.',
  'Chúc bạn giữ được nụ cười giữa những ngày nhiều bận rộn.',
  'Mong tình thân luôn là nơi bạn có thể trở về nghỉ ngơi.',
  'Chúc bạn học được điều mới và tiến bộ từng chút mỗi ngày.',
  'Mong những việc nhỏ tử tế mang đến cho bạn niềm vui.',
  'Chúc bạn và cha mẹ luôn có nhiều ngày khỏe mạnh bên nhau.',
  'Mong lòng bạn nhẹ như một đóa sen đang nở.',
  'Chúc bạn có thời gian nghỉ ngơi và chăm sóc bản thân.',
  'Mong mỗi cuộc gặp gỡ đều để lại trong bạn chút ấm lòng.',
  'Chúc bạn có những người bạn biết lắng nghe và thấu hiểu.',
  'Mong bạn luôn trân trọng những điều đẹp đẽ đang có.',
  'Chúc bạn vững bước, không quên dành sự dịu dàng cho mình.',
  'Mong ngày mai của bạn có thêm một lý do để mỉm cười.',
  'Chúc bữa cơm gia đình luôn ấm áp và đủ đầy yêu thương.',
  'Mong những nhọc nhằn lắng xuống, nhường chỗ cho bình yên.',
  'Chúc bạn biết nghỉ khi mệt và luôn có người để sẻ chia.',
  'Mong ánh sáng nhỏ này gửi đến bạn một lời chào an lành.'
] as const;

const giftSpokenActions: Record<ThanksKey, readonly string[]> = {
  rose: ['gửi hoa hồng', 'dâng một đóa hoa hồng', 'thắp nén hương lòng bằng hoa hồng'],
  heart: ['thắp ánh đèn yêu thương', 'thắp lên ngọn đèn bình an', 'gửi một ánh sáng ấm áp'],
  bouquet: ['dâng hoa sen', 'gửi một bó hoa tươi thắm', 'dâng những đóa hoa an lành', 'góp một đóa sen cho khu vườn', 'gửi sắc sen cùng lời chúc bình an', 'làm khu vườn thêm một mùa hoa'],
  donut: ['thỉnh tiếng chuông bình an', 'góp một tiếng chuông thanh tịnh', 'gửi lời chúc qua tiếng chuông'],
  offering: ['dâng mâm ngũ quả', 'gửi tấm lòng thành', 'dâng lễ vật với lòng thành kính', 'góp sắc màu cho mâm ngũ quả', 'gửi lời chúc sum vầy', 'gửi món quà đầy sự quan tâm'],
  corgi: ['gửi lời chúc cùng hình ảnh cá chép', 'gửi món quà mang niềm vui', 'góp thêm một lời nguyện tốt lành'],
  lantern: ['thả đèn hoa đăng', 'thắp một chiếc đèn hoa đăng', 'gửi ánh sáng qua hoa đăng'],
  lion: ['gửi món quà đặc biệt', 'gửi lời chúc đầy yêu thương', 'góp thêm ánh sáng rực rỡ cho khu vườn', 'gửi ánh vàng cùng lời chúc an vui', 'làm sáng lên khoảnh khắc sum vầy', 'gửi một món quà thật ấm lòng'],
  generic: ['gửi món quà', 'gửi tấm lòng quý mến', 'gửi lời chúc tốt lành']
};

function stableVoiceIndex(key: string, size: number) {
  let hash = 2166136261;
  for (const character of key) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return hash % size;
}

/**
 * Sinh cau noi tu GiftConfirmed da xac nhan (khong tao ra audio).
 * eventKey giup cung 1 su kien luon co 1 cau on dinh, su kien khac co the khac nhau.
 */
export function dynamicThanksText(gift: Pick<GiftConfirmed, 'eventKey' | 'thanksTemplateKey' | 'displayName'>): string {
  const rawName = (gift.displayName || '').normalize('NFC')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/(?:https?:\/\/|www\.)\S+/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ').trim();
  const safeName = Array.from(rawName).slice(0, 24).join('').trim();
  const addressee = /\p{L}/u.test(safeName) ? safeName : 'bạn';
  const actions = giftSpokenActions[gift.thanksTemplateKey] || giftSpokenActions.generic;
  const key = gift.eventKey || 'default';
  const action = actions[stableVoiceIndex(`${key}:action`, actions.length)];
  const wish = giftWishVariants[stableVoiceIndex(`${key}:wish`, giftWishVariants.length)];
  return `Cảm ơn ${addressee} đã ${action}. ${wish}`;
}
