import type { Settings } from '@vuonsen/shared';
export function AppearancePanel({ settings, update, connected }: { settings?: Settings; update: (patch: Partial<Settings>) => void; connected: boolean }) {
  return <section className="card appearance-card"><span className="eyebrow">GIAO DIỆN / GIAI ĐOẠN 3</span><h2>Ánh vàng chánh điện</h2>
    <label className="toggle"><span>Quẻ và hoa đăng gọn · phía trên vùng chat</span><input aria-label="Thẻ quẻ gọn" type="checkbox" disabled={!connected} checked={settings?.liveSafeLayout??true} onChange={e=>update({liveSafeLayout:e.target.checked})}/></label>
    <p>Hai thẻ dùng chung vị trí gọn phía trên chat. Hoa đăng giữ tên, lời chúc và đèn trôi; nội dung quẻ đầy đủ xem ở mục Xin quẻ. Khung cảnh và tỉ lệ capture giữ nguyên.</p>
    <label className="toggle"><span>Bảng quà gọn · luân phiên 6 giây</span><input type="checkbox" disabled={!connected} checked={settings?.compactGiftPanels??true} onChange={e=>update({compactGiftPanels:e.target.checked})}/></label>
    <label>Kích thước nhân vật · {settings?.actorSize??1.45}×<input aria-label="Kích thước nhân vật" type="range" min="1" max="1.8" step="0.05" disabled={!connected} value={settings?.actorSize??1.45} onChange={e=>update({actorSize:Number(e.target.value)})}/></label>
    <label className="toggle"><span>Hoạt động tại chỗ · V2 chỉ đổi tư thế</span><input type="checkbox" disabled={!connected} checked={settings?.idleActivities??true} onChange={e=>update({idleActivities:e.target.checked})}/></label>
    <label>Tốc độ đi trên thảm V2 · {settings?.walkSpeed??160}<input aria-label="Tốc độ đi trên thảm" type="range" min="100" max="240" step="10" value={settings?.walkSpeed??160} disabled={!connected} onChange={e=>update({walkSpeed:Number(e.target.value)})}/></label>
    <small>100–240 đơn vị sàn/giây cho đi đổi chỗ và dâng hương. Lượt vào chùa/lạy dùng nhịp nhanh riêng, tối đa 18 người cùng đi/lạy ở các chỗ trống ngẫu nhiên. Gõ “thắp nhang” để lên dâng hương miễn phí.</small>
    <label>Từ chặn bong bóng · cách nhau bằng dấu phẩy<input aria-label="Từ chặn bong bóng" key={(settings?.chatBlockedWords||[]).join(',')} disabled={!connected} defaultValue={(settings?.chatBlockedWords||[]).join(', ')} onBlur={e=>update({chatBlockedWords:e.target.value.split(',').map(w=>w.trim()).filter(Boolean).slice(0,100).map(w=>w.slice(0,40))})}/></label>
    <small>Bong bóng hiện cả chat và lệnh, tối đa 80 ký tự / 4 giây. Link và từ chặn không lên hình. Giảm hiệu ứng tắt đi lại tự động.</small>
    <label>Phong cách cảnh<select aria-label="Phong cách cảnh" disabled={!connected} value={settings?.theme || 'classic'} onChange={e => update({ theme: e.target.value as Settings['theme'] })}>
      <option value="golden">Cảnh chi tiết · chánh điện / sân Quan Âm</option><option value="classic">Vườn Sen xanh · classic</option>
    </select></label><p className="muted">Đổi hình ảnh giữ nguyên người, ghế và phiên kết nối. Preview bên cạnh là Overlay đang chạy.</p>
    <div className="toggles">{([['showGiftPanel','Bảng nghi thức & quà'],['showThanksPanel','Bảng lời cảm ơn'],['showTicker','Thông báo cuối sân'],['showBubbles','Bong bóng chat & câu lệnh'],['glow','Hào quang'],['smoke','Khói hương'],['candles','Ánh nến'],['flowers','Hoa sen tương tác'],['reducedEffects','Giảm hiệu ứng']] as const).map(([key,label]) =>
      <label className="toggle" key={key}><span>{label}</span><input type="checkbox" disabled={!connected} checked={settings?.[key] ?? key !== 'reducedEffects'} onChange={e => update({ [key]: e.target.checked })}/></label>)}</div>
    <small className="muted">Bảng cảm ơn dùng số quà đã hoàn tất; không quy đổi thành tiền hay điểm tâm linh. Quà chưa cấu hình dùng lời cảm ơn chung. Giảm hiệu ứng giảm khói và hạt, vẫn giữ đủ nhân vật.</small>
  </section>;
}
