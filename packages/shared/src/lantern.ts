import { z } from 'zod';
export const lanternTopicSchema=z.enum(['binh_an','gia_dinh','cha_me','suc_khoe','hoc_tap','cong_viec']);
export type LanternTopic=z.infer<typeof lanternTopicSchema>;
export const lanternThemes:ReadonlyArray<{id:LanternTopic;label:string;command:string;wish:string}>=[
  {id:'binh_an',label:'Bình an',command:'bình an',wish:'Nguyện mỗi ngày có một khoảng lặng, để lòng nhẹ hơn và biết trân quý điều đang có.'},
  {id:'gia_dinh',label:'Gia đình',command:'gia đình',wish:'Nguyện gia đình luôn biết lắng nghe, yêu thương và gìn giữ bình an.'},
  {id:'cha_me',label:'Cha mẹ',command:'cha mẹ',wish:'Nguyện cha mẹ được an vui, có người sẻ chia và nhận nhiều yêu thương mỗi ngày.'},
  {id:'suc_khoe',label:'Sức khỏe',command:'sức khỏe',wish:'Nguyện bạn có thêm sức mạnh, biết chăm sóc bản thân và đón nhận sự giúp đỡ khi cần.'},
  {id:'hoc_tap',label:'Học tập',command:'học tập',wish:'Nguyện việc học thêm kiên nhẫn, từng bước nhỏ mở ra những điều hiểu biết mới.'},
  {id:'cong_viec',label:'Công việc',command:'công việc',wish:'Nguyện bạn giữ lòng ngay thẳng, bền bỉ với việc làm và tìm được niềm vui trong mỗi bước tiến.'}
];
export const lanternRevealSchema=z.object({
  version:z.literal(1),revealId:z.string().min(1).max(100),sessionId:z.string().min(1).max(80),
  displayName:z.string().min(1).max(80),topic:lanternTopicSchema,
  startedAt:z.number().finite(),expiresAt:z.number().finite()
});
export type LanternReveal=z.infer<typeof lanternRevealSchema>;
export const lanternSpokenWishes:Record<LanternTopic,string>={
  binh_an:'Mong lòng bạn nhẹ nhàng, mỗi ngày thêm một chút bình an.',
  gia_dinh:'Chúc gia đình luôn lắng nghe, yêu thương và gìn giữ bình an.',
  cha_me:'Chúc cha mẹ an vui, mạnh khỏe và luôn có người sẻ chia.',
  suc_khoe:'Chúc bạn thêm sức mạnh, biết nghỉ ngơi và chăm sóc bản thân.',
  hoc_tap:'Chúc bạn học tập kiên nhẫn, mỗi ngày hiểu thêm một điều mới.',
  cong_viec:'Chúc bạn vững lòng trong công việc, tìm thấy niềm vui mỗi ngày.'
};
export interface LanternStatus {queued:number;revealed:number;cooldown:number;duplicate:number;busy:number;expired:number;disabled:number}
