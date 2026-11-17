import { useEffect, useState } from 'react';
import { defaultGiftCatalog, giftCatalogSchema, giftDefinitions, type Command, type GiftCatalogEntry, type SceneState, type Settings } from '@vuonsen/shared';
const controller=()=> (document.querySelector('iframe')?.contentWindow as any)?.__audioControl;
export function GiftAudioPanel({state,connected,update,send}:{state?:SceneState;connected:boolean;update:(s:Partial<Settings>)=>void;send:(c:Command)=>void}){
  const [draft,setDraft]=useState<GiftCatalogEntry[]>(defaultGiftCatalog),[error,setError]=useState(''),[audio,setAudio]=useState<any>(),[testGiftName,setTestGiftName]=useState('Hoàng Khang');
  const settings=state?.settings, demo=connected&&state?.mode==='demo';
  const [output,setOutput]=useState<{claimed:boolean;surface:string|null;masterMute:boolean;fortune?:{enabled:boolean;errors:number};lantern?:{enabled:boolean;errors:number};thanks?:{enabled:boolean;synthErrors:number}}>();
  useEffect(()=>{let live=true;const read=()=>{void fetch('/api/audio/status',{signal:AbortSignal.timeout(1500)}).then(r=>r.ok?r.json():undefined).then(v=>{if(live)setOutput(v);}).catch(()=>{});};read();const t=setInterval(read,2500);return()=>{live=false;clearInterval(t);};},[]);
  useEffect(()=>{if(settings?.giftCatalog){const rows=settings.giftCatalog;setDraft([...rows,...defaultGiftCatalog.filter(d=>!rows.some(r=>r.group===d.group))]);}},[JSON.stringify(settings?.giftCatalog)]);
  useEffect(()=>{const timer=setInterval(()=>setAudio(controller()?.debug()),400);return()=>clearInterval(timer);},[]);
  const edit=(i:number,patch:Partial<GiftCatalogEntry>)=>setDraft(rows=>rows.map((r,n)=>n===i?{...r,...patch}:r));
  const [demoActorTarget,setDemoActorTarget]=useState('auto');
  const test=(group:typeof giftDefinitions[number]['group'])=>{
    // Demo gifts must use the exact identity of a visitor to trigger incense offering.
    // A nickname is only display text; it is not a stable user ID.
    const actor = demoActorTarget === 'manual' ? undefined
      : demoActorTarget === 'auto' ? state?.actors[0]
      : state?.actors.find(a=>a.key===demoActorTarget);
    const match=actor?.key.match(/:(userId|uniqueId):([^:]+)$/);
    if (actor && match) {
      const id=decodeURIComponent(match[2]);
      const identity=match[1]==='userId' ? {userId:id} : {uniqueId:id};
      const definition=giftDefinitions.find(d=>d.group===group)!;
      send({type:'event',event:{type:'gift',source:'demo',...identity,nickname:actor.displayName,
        eventId:crypto.randomUUID(),gift:{id:`demo:${group}`,name:definition.label,demoGroup:group,count:1,finished:true}}});
      return;
    }
    // Preserve the previous behaviour for testing a gift from a non-visitor.
    send({type:'gift-demo',group,userId:'demo-gift-tester',nickname:testGiftName.trim().slice(0,32)||'Khách thử quà',units:1});
  };
  return <><section className="card gift-config"><span className="eyebrow">GIAI ĐOẠN 3.1 / QUÀ & ĐIỂM</span><h2>Danh mục quà TikTok</h2>
    <p>1 đơn vị quà hoàn tất = 1 điểm tương tác cho mọi loại quà. Không quy đổi tiền, không ưu tiên cầu an. Tên nhóm dưới đây là nhãn tham khảo; chỉ xác nhận gift ID sau khi quan sát sự kiện thật.</p>
    <label>Chọn nhân vật tặng quà DEMO
      <select aria-label="Chọn nhân vật tặng quà DEMO" value={demoActorTarget} disabled={!demo} onChange={e=>setDemoActorTarget(e.target.value)}>
        <option value="auto">Tự chọn nhân vật đầu tiên đang ở trong chùa</option>
        {state?.actors.map(a=><option key={a.key} value={a.key}>{a.displayName} (ID: {decodeURIComponent(a.key.split(':').at(-1) || '')})</option>)}
        <option value="manual">Khách thử quà chưa vào chùa (không đi thắp hương)</option>
      </select>
    </label>
    <label>Tên người tặng khi chọn khách chưa vào chùa <input aria-label="Tên người tặng DEMO" value={testGiftName} maxLength={32} disabled={!demo} onChange={e=>setTestGiftName(e.target.value)}/></label>
    <small>Để xem nhân vật đi thắp hương: gửi bình luận giả lập cho nguoi1/nguoi2, chờ nhân vật ngồi, chọn đúng người trong danh sách rồi bấm Thử quà.</small>
    <div className="gift-editor">{draft.map((row,i)=><fieldset key={i} disabled={!connected}><legend>{giftDefinitions.find(d=>d.group===row.group)?.icon} {giftDefinitions.find(d=>d.group===row.group)?.label}</legend>
      <label>Nhóm quà<select aria-label={`Nhóm quà ${i+1}`} value={row.group} onChange={e=>{const d=giftDefinitions.find(d=>d.group===e.target.value)!;edit(i,{group:d.group,effect:d.effect,thanksTemplateKey:d.group});}}>{giftDefinitions.map(d=><option key={d.group} value={d.group}>{d.label}</option>)}</select></label>
      <label>Tên hiển thị<input aria-label={`Tên quà ${i+1}`} value={row.label} maxLength={28} onChange={e=>edit(i,{label:e.target.value})}/></label>
      <label>Gift ID đã quan sát<input aria-label={`Gift ID ${i+1}`} inputMode="numeric" value={row.giftId} placeholder="Chưa xác minh quà LIVE" onChange={e=>edit(i,{giftId:e.target.value,verified:false})}/></label>
      <label className="toggle"><span>Đã xác minh ID này từ LIVE thật</span><input type="checkbox" aria-label={`Xác minh quà ${i+1}`} checked={row.verified} disabled={!row.giftId} onChange={e=>edit(i,{verified:e.target.checked})}/></label>
      <label>Xu mỗi món (dự phòng khi LIVE thiếu giá trị)<input aria-label={`Xu quà ${i+1}`} type="number" min="1" max="10000000" value={row.unitCoins??''} onChange={e=>edit(i,{unitCoins:e.target.value===''?undefined:Number(e.target.value)})}/></label>
      <label>Hiệu ứng<select aria-label={`Hiệu ứng quà ${i+1}`} value={row.effect} onChange={e=>edit(i,{effect:e.target.value as GiftCatalogEntry['effect']})}>{giftDefinitions.map(d=><option key={d.group} value={d.effect}>{d.action}</option>)}<option value="candle">Nến cơ bản (cũ)</option></select></label>
      <label>Lời đọc<select aria-label={`Lời đọc quà ${i+1}`} value={row.thanksTemplateKey} onChange={e=>edit(i,{thanksTemplateKey:e.target.value as GiftCatalogEntry['thanksTemplateKey']})}>{giftDefinitions.map(d=><option key={d.group} value={d.group}>{d.label}</option>)}</select></label>
      <small>{row.verified?'Đã cấu hình xác minh':'Chưa xác minh quà LIVE'} · 1 điểm/đơn vị</small>
      <button type="button" disabled={!demo} onClick={()=>test(row.group)}>Thử {giftDefinitions.find(d=>d.group===row.group)?.label} · DEMO</button>
      {draft.filter(r=>r.group===row.group).length>1&&<button type="button" onClick={()=>setDraft(rows=>rows.filter((_,n)=>n!==i))}>Bỏ mapping này</button>}
    </fieldset>)}</div>
    {error&&<p role="alert">{error}</p>}<button className="primary" disabled={!connected} onClick={()=>{const parsed=giftCatalogSchema.safeParse(draft);if(!parsed.success){setError('Kiểm tra ID dạng số, không trùng; tên thuần chữ/số và xác minh cần ID.');return;}setError('');update({giftCatalog:parsed.data});}}>Lưu danh mục quà</button>
    <button disabled={!connected||draft.length>=64} onClick={()=>setDraft([...draft,{...defaultGiftCatalog[0]}])}>Thêm mapping</button>
    <details><summary>Quà đã quan sát trong nguồn hiện tại</summary>{state?.observedGifts?.length?state.observedGifts.map(g=><p key={g.giftId}>{g.source==='demo'?'DEMO':'TikTok'} · {g.giftName} · ID {g.giftId}</p>):<p>Chưa có sự kiện quà. Không tự đoán gift ID.</p>}</details>
  </section><section className="card audio-card"><span className="eyebrow">ÂM THANH / MỘT ĐẦU PHÁT</span><h2>Giọng cảm ơn & âm hiệu</h2>
    <p role="status" data-testid="audio-status">{audio?.state||'unavailable'} · {audio?.detail||'Đang chờ Overlay'}</p>
    <p data-testid="audio-owner">Đầu phát toàn ứng dụng: {output?.claimed?output.surface==='capture'?'cửa sổ Capture dọc':output.surface==='preview'?'preview Dashboard':'cửa sổ trình duyệt':'chưa có cửa sổ bật tiếng'}. {output?.masterMute?'Đang bật Master mute.':''}</p>
    {Boolean(output?.fortune?.errors||output?.lantern?.errors||output?.thanks?.synthErrors)&&<p role="alert">Server đã có lỗi tạo giọng động. Chạy kiem-tra-giong-live.bat để kiểm tra Python/FFmpeg/gTTS; lỗi này không xác định được chỉ bằng thanh âm lượng.</p>}
    <p>Bấm nút dưới để phát tại preview Dashboard. Nếu phát bằng cửa sổ capture, tắt đầu phát này rồi nhấn <b>A</b> ở capture và bấm Bật âm thanh. Chỉ một Overlay được phát để tránh tiếng đôi.</p>
    <div className="two-fields"><button onClick={()=>void controller()?.enable()}>Bật âm thanh preview</button><button onClick={()=>controller()?.disable()}>Tắt âm thanh preview</button></div>
    <button onClick={()=>void controller()?.checkOutput()}>Nghe câu có sẵn tại preview · không tạo quà</button>
    <label className="toggle"><span>Master mute · tắt mọi tiếng</span><input type="checkbox" aria-label="Master mute" checked={settings?.masterMute??false} onChange={e=>update({masterMute:e.target.checked})}/></label>
    <div className="sliders">{([['voiceVolume','Voice'],['sfxVolume','SFX'],['ambienceVolume','Ambience']] as const).map(([key,label])=><label key={key}>{label} · {Math.round((settings?.[key]||0)*100)}%<input aria-label={`Âm lượng ${label}`} type="range" min="0" max="1" step="0.05" value={settings?.[key]||0} onChange={e=>update({[key]:Number(e.target.value)})}/></label>)}</div>
    <label className="toggle"><span>Âm nền nhẹ (mặc định tắt)</span><input type="checkbox" checked={settings?.ambienceEnabled??false} onChange={e=>update({ambienceEnabled:e.target.checked})}/></label>
    <label>Khuếch đại giọng đọc · {Math.round((settings?.speechBoost??1)*100)}%<input aria-label="Khuếch đại giọng đọc" type="range" min="1" max="3" step="0.1" disabled={!connected} value={settings?.speechBoost??1} onChange={e=>update({speechBoost:Number(e.target.value)})}/></label>
    <small>Áp dụng cho cảm ơn, quẻ, hoa đăng và nút nghe thử; không tăng SFX/nhạc nền. Bắt đầu 150–200%, nghe trên điện thoại rồi chỉnh tiếp. Bộ giới hạn đỉnh vẫn hoạt động nên 300% không đồng nghĩa tiếng nghe to gấp ba.</small>
    <label>Chế độ giọng<select value={settings?.voiceMode||'fallback'} onChange={e=>update({voiceMode:e.target.value as Settings['voiceMode']})}><option value="fallback">Giọng Việt đã duyệt · file theo quà, không đọc tên</option><option value="auto">Đọc tên bằng gTTS (cần bật TTS_DYNAMIC_ENABLED=1); không mạng thì dùng câu có sẵn</option></select></label>
    <small>Đang dùng: {audio?.voiceKind||'chưa phát'}. File fallback không đọc tên; tên vẫn hiện trên ticker/bảng quà. Khi chế độ đọc tên được bật và server cho phép, tên hiển thị cùng câu cảm ơn sẽ được gửi đến dịch vụ gTTS; câu đã tạo được lưu đệm cục bộ. Khi chưa bật, chỉ phát câu thu sẵn.</small>
    <div className="audio-tests"><button disabled={!demo} onClick={()=>void controller()?.test('voice','rose')}>Test Voice</button><button disabled={!demo} onClick={()=>void controller()?.test('sfx','donut')}>Test SFX</button><button disabled={!demo} onClick={async()=>{if(await controller()?.enable())test('rose');}}>Test Full Sequence</button></div>
    <p>Đã phát {audio?.played||0} · Chờ {audio?.queued||0}/20 · Bỏ/gộp {audio?.skipped||0}. Mute bỏ hàng chờ, bật lại không phát sự kiện cũ.</p>
    <details><summary>Log âm thanh cục bộ</summary>{audio?.logs?.slice(0,10).map((l:any,i:number)=><p key={i}>{new Date(l.at).toLocaleTimeString('vi-VN')} · {l.status}</p>)}</details>
    <p className="muted">Kiểm tra nguồn âm thanh của cửa sổ capture: LIVE Studio chọn System/Application Audio tương ứng; OBS chọn Capture Audio nếu có hoặc thêm Application Audio Capture. OBS Browser Source bật điều khiển âm thanh qua OBS. Hãy kiểm tra meter và thu/nghe thử trước khi phát.</p>
  </section></>;
}
