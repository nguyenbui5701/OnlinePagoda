import { useEffect, useState } from 'react';
import type { Command, SceneState, Settings } from '@vuonsen/shared';
export function FortunePanel({state,connected,send,update}:{state?:SceneState;connected:boolean;send:(c:Command)=>void;update:(s:Partial<Settings>)=>void}){
  const [command,setCommand]=useState('xin quẻ'),[voice,setVoice]=useState({status:'off',detail:''});
  useEffect(()=>{const t=setInterval(()=>{const v=(document.querySelector('iframe')?.contentWindow as any)?.__fortuneVoice;setVoice({status:v?.status||'off',detail:v?.detail||''});},500);return()=>clearInterval(t);},[]);
  const s=state?.settings,f=state?.fortuneStatus;
  const statuses:Record<string,string>={off:'Đang tắt',blocked:'Bật âm thanh ở đầu phát trước',unavailable:'Chưa tạo được giọng; quẻ vẫn hiện chữ',ready:'Sẵn sàng nhận lượt mới',loading:'Đang tạo giọng cảm ơn cho tên và lời quẻ',speaking:'Đang đọc',played:'Đã phát xong',expired:'Lượt đọc đã hết hạn','gift-priority':'Nhường lời cảm ơn quà / nghi thức'};
  return <section className="card" id="fortune-settings"><span className="eyebrow">XIN QUẺ ĐINH MÙI 2027</span><h2>576 lời chiêm nghiệm</h2>
    <p>Miễn phí, không cần tặng quà. Quẻ tự biên soạn để tham khảo, không phải lời tiên đoán.</p>
    <p><code>xin quẻ</code> · <code>xin quẻ gia đạo</code> · <code>xem quẻ 123</code></p>
    <small>Thêm lựa chọn: xin quẻ tuổi Mùi, xin quẻ 1991. Tân Mùi là nhóm năm sinh 1991.</small>
    <fieldset disabled={!connected}>
      <label className="toggle"><span>Bật xin quẻ</span><input aria-label="Bật xin quẻ" type="checkbox" checked={s?.fortuneEnabled??true} onChange={e=>update({fortuneEnabled:e.target.checked})}/></label>
      <label className="toggle"><span>Đọc tên và quẻ bằng giọng cảm ơn</span><input aria-label="Đọc quẻ" type="checkbox" checked={s?.fortuneVoiceEnabled??false} onChange={e=>update({fortuneVoiceEnabled:e.target.checked})}/></label>
      <label>Âm lượng quẻ · {Math.round((s?.fortuneVolume??.5)*100)}%<input aria-label="Âm lượng quẻ" type="range" min="0" max="1" step="0.05" value={s?.fortuneVolume??.5} onChange={e=>update({fortuneVolume:Number(e.target.value)})}/></label>
      <label>Khoảng cách giữa hai quẻ<select aria-label="Tần suất quẻ" value={s?.fortuneIntervalSeconds??7} onChange={e=>update({fortuneIntervalSeconds:Number(e.target.value)})}>{[7,10,15,20,30].map(n=><option key={n} value={n}>{n} giây</option>)}</select></label>
    </fieldset>
    <p role="status">Kho quẻ: {f?.available?'576 quẻ sẵn sàng':'Chưa tải được'} · Đã hiện {f?.revealed||0} · Chờ {f?.queued||0}/32</p>
    <small>Chưa đủ 5 giây: {f?.cooldown||0} · Hàng đầy: {f?.busy||0}. Mỗi người được gửi yêu cầu quẻ mới sau 5 giây, kể cả cùng chủ đề; quẻ được phát theo hàng đợi. Lệnh xem số cụ thể luôn trả đúng số đó.</small>
    <p>Giọng quẻ tại preview: {statuses[voice.status]||voice.status}. {voice.status==='unavailable'?voice.detail:''}</p>
    <small>Giọng cảm ơn tiếng Việt, tốc độ 1,5×, đọc tên, số và lời quẻ ngắn. Thẻ hiện 4 giây; lượt có giọng giữ tối đa 15 giây để đọc tiếp. Quà được ưu tiên; lượt bị ngắt không đọc lại. Khởi động bằng start-que-co-giong.bat để bật dịch vụ giọng. Tên đã lọc và lời quẻ được gửi tới Google gTTS khi tạo tiếng.</small>
    {state?.fortune&&<details><summary>Nội dung đầy đủ của quẻ đang hiện · {state.fortune.number}</summary><p>{state.fortune.displayName} · {state.fortune.title}</p><p>{state.fortune.short}</p><p>Việc nhỏ: {state.fortune.action}</p><p>{state.fortune.blessing}</p></details>}
    <label>Lệnh thử quẻ<input aria-label="Lệnh thử quẻ" maxLength={140} value={command} onChange={e=>setCommand(e.target.value)}/></label>
    <button disabled={!connected||state?.mode!=='demo'||!s?.fortuneEnabled||!f?.available} onClick={()=>send({type:'event',event:{type:'chat',source:'demo',userId:'fortune-demo',nickname:'Khách thử quẻ',eventId:crypto.randomUUID(),text:command}})}>Rút quẻ thử · DEMO</button>
    <small>Thử cùng ID để giữ đúng cooldown. Có thể dùng mục bình luận giả lập với ID khác để thử hàng chờ.</small>
  </section>;
}
