import type {Command,SceneState,Settings} from '@vuonsen/shared';
export function ScenePanel({state,connected,update,send}:{state?:SceneState;connected:boolean;update:(p:Partial<Settings>)=>void;send:(c:Command)=>void}){
  const s=state?.settings,outside=s?.sceneSpace==='courtyard'&&s.theme==='golden',weather=state?.environment?.weather;
  return <section className="card" id="courtyard-settings"><span className="eyebrow">KHÔNG GIAN & ÁNH SÁNG</span><h2>Sân Quan Âm</h2>
    <label>Không gian<select aria-label="Không gian" disabled={!connected} value={s?.theme==='classic'?'classic':s?.sceneSpace??'hall'} onChange={e=>update(e.target.value==='classic'?{theme:'classic'}:{sceneSpace:e.target.value as Settings['sceneSpace'],theme:'golden'})}>
      <option value="hall">Chánh điện Phật vàng</option><option value="courtyard">Sân Quan Âm ngoài trời</option><option value="classic">Vườn Sen xanh · classic</option>
    </select></label>
    <p>Đổi không gian giữ nguyên phiên LIVE, người xem, ghế, quà, quẻ và hoa đăng. Sân Quan Âm dùng tượng đá trắng, sân đá và hồ sen hai mép.</p>
    <label>Ánh sáng sân<select aria-label="Ánh sáng sân" disabled={!connected||!outside} value={s?.sceneLight??'day'} onChange={e=>update({sceneLight:e.target.value as Settings['sceneLight']})}>
      <option value="auto">Theo giờ Việt Nam</option><option value="day">Ban ngày</option><option value="sunset">Chiều ấm</option><option value="night">Ban đêm · lên đèn</option>
    </select></label>
    <small>Ngày 06–16h · chiều 16–18h · đêm 18–06h. Ánh sáng chuyển dần trong 20 giây; giảm hiệu ứng dùng ánh sáng tĩnh.</small>
    <label>Độ sáng đèn phụ · {Math.round((s?.sceneLightIntensity??1)*100)}%<input aria-label="Độ sáng đèn phụ" type="range" min=".3" max="1" step=".05" disabled={!connected||!outside} value={s?.sceneLightIntensity??1} onChange={e=>update({sceneLightIntensity:Number(e.target.value)})}/></label>
    <label>Thời tiết tự động<select aria-label="Kiểu thời tiết" disabled={!connected||!outside} value={s?.weatherPreset??'leaves'} onChange={e=>update({weatherPreset:e.target.value as Settings['weatherPreset']})}>
      <option value="leaves">Gió lá</option><option value="petals">Mưa cánh sen nhẹ</option>
    </select></label>
    <label className="toggle"><span>Tự chạy thời tiết, cách nhau ít nhất 3 phút</span><input type="checkbox" disabled={!connected||!outside} checked={s?.weatherAuto??false} onChange={e=>update({weatherAuto:e.target.checked})}/></label>
    <div className="button-row"><button disabled={!connected||!outside} onClick={()=>send({type:'weather',preset:'leaves'})}>Gió lá 12 giây</button><button disabled={!connected||!outside} onClick={()=>send({type:'weather',preset:'petals'})}>Mưa sen 12 giây</button><button disabled={!connected} onClick={()=>send({type:'weather',preset:'stop'})}>Dừng thời tiết</button></div>
    <p data-testid="weather-status">{weather?`Đang chạy: ${weather.kind==='leaves'?'Gió lá':'Mưa cánh sen'}${weather.stoppingAt!==undefined?' · đang dừng':''}`:'Thời tiết đang nghỉ'}</p>
    <small>Thời tiết trang trí, không lấy dự báo thật, không thêm âm thanh. Nhường nghi thức quà và cây nở. Giảm hiệu ứng hoặc FPS thấp sẽ ẩn hạt thời tiết. Mưa hoa theo mốc tim của cây vẫn là tính năng riêng.</small>
  </section>;
}
