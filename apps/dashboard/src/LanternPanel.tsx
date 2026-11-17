import { useState, useEffect } from 'react';
import { lanternThemes,type LanternTopic,type Command,type SceneState,type Settings } from '@vuonsen/shared';
export function LanternPanel({state,connected,send,update}:{state?:SceneState;connected:boolean;send:(c:Command)=>void;update:(s:Partial<Settings>)=>void}){
  const [topic,setTopic]=useState<LanternTopic>('binh_an');const enabled=state?.settings.lanternEnabled??false,s=state?.lanternStatus;
  const theme=lanternThemes.find(t=>t.id===topic)!;
  const [voice,setVoice]=useState({status:'off',detail:''});
  useEffect(()=>{const t=setInterval(()=>{const v=(document.querySelector('iframe')?.contentWindow as any)?.__lanternVoice;setVoice({status:v?.status||'off',detail:v?.detail||''});},500);return()=>clearInterval(t);},[]);
  return <section className="card" id="lantern-settings"><span className="eyebrow">MỘT ÁNH ĐÈN · MỘT LỜI NGUYỆN LÀNH</span><h2>Hoa đăng cầu an</h2>
    <p>Gửi lời cầu an miễn phí bằng bình luận <code>hoa đăng</code> hoặc <code>hoa đăng gia đình</code>. Không cần tặng quà.</p>
    <label className="toggle"><span>Bật hoa đăng cầu an</span><input aria-label="Bật hoa đăng cầu an" type="checkbox" disabled={!connected} checked={enabled} onChange={e=>update({lanternEnabled:e.target.checked})}/></label>
    <p>Lượt hoa đăng kéo dài 8 giây, bảng hiện 4 giây, luân phiên với quẻ. Cùng người gửi chờ 5 giây trước khi gửi yêu cầu tiếp; tối đa 16 lượt chờ. Chỉ dùng lời chúc đã biên soạn.</p>
    <label className="toggle"><span>Đọc tên và lời chúc hoa đăng</span><input aria-label="Đọc hoa đăng" type="checkbox" disabled={!connected} checked={state?.settings.lanternVoiceEnabled??true} onChange={e=>update({lanternVoiceEnabled:e.target.checked})}/></label>
    <label>Âm lượng hoa đăng · {Math.round((state?.settings.lanternVolume??.8)*100)}%<input aria-label="Âm lượng hoa đăng" type="range" min="0" max="1" step="0.05" disabled={!connected} value={state?.settings.lanternVolume??.8} onChange={e=>update({lanternVolume:Number(e.target.value)})}/></label>
    <small>Giọng cùng lời cảm ơn, cần server bật TTS động. Nhường quà, không đọc lại khi tải lại; hết 8 giây sẽ dừng. Khuếch đại chung ở mục Giọng cảm ơn & âm hiệu.</small>
    <p>Giọng hoa đăng tại preview: {voice.status}. {voice.detail}</p>
    <p role="status">Đã thả {s?.revealed||0} · Đang chờ {s?.queued||0}/16 · Chưa đủ 5 giây {s?.cooldown||0} · Hàng đầy {s?.busy||0} · Hết hạn {s?.expired||0}</p>
    <small>Lượt chờ quá 120 giây được bỏ. Tắt tính năng sẽ xóa đèn và hàng chờ. Nhân vật, điểm quà và cài đặt quẻ được giữ nguyên.</small>
    <label>Chủ đề thử<select aria-label="Chủ đề hoa đăng" value={topic} onChange={e=>setTopic(e.target.value as LanternTopic)}>{lanternThemes.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
    <p>{theme.wish}</p><small>Lệnh: <code>hoa đăng {theme.command}</code> · Hỗ trợ chữ không dấu.</small>
    <button className="wide" disabled={!connected||state?.mode!=='demo'||!enabled} onClick={()=>send({type:'event',event:{type:'chat',source:'demo',userId:'lantern-demo',nickname:'Khách An Lành',eventId:crypto.randomUUID(),text:`hoa đăng ${theme.command}`}})}>Thả hoa đăng thử · DEMO</button>
    <small>Nút thử dùng cùng ID để kiểm tra thời gian chờ. Dùng Bình luận giả lập với ID khác để thử nhiều người.</small>
  </section>;
}
