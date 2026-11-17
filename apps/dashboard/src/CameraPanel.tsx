import {activeCamera,cameraLabels,cameraViews,type Command,type SceneState,type Settings} from '@vuonsen/shared';
export function CameraPanel({state,connected,send,update}:{state?:SceneState;connected:boolean;send:(c:Command)=>void;update:(p:Partial<Settings>)=>void}){
 const available=state?.settings.theme==='golden'&&state?.settings.sceneSpace==='hall';
 return <section className="card" id="camera-settings"><span className="eyebrow">CAMERA CHÁNH ĐIỆN</span><h2>Bốn góc tự động</h2>
 <p>Lia nhẹ trong mỗi góc và ưu tiên người đang dâng hương. Chọn góc bằng tay chỉ tắt lịch tự đổi góc.</p>
 <label className="toggle"><span>Sàn phối cảnh V2 · bản dựng chờ duyệt</span><input aria-label="Sàn phối cảnh V2" type="checkbox" disabled={!connected||!available} checked={state?.settings.templeFloorPreview??false} onChange={e=>update({templeFloorPreview:e.target.checked})}/></label>
 {state?.settings.templeFloorPreview&&<><p>Sàn V2: ghế giãn rộng, tên trên đầu; đi theo thảm giữa và thảm từng hàng. Gõ “thắp nhang” để lên lư hương miễn phí. Duyệt trên bản thử riêng trước khi dùng LIVE.</p><p data-testid="movement-status">Đang đi {state.movement?.moving??0}/18 · Chờ đường {state.movement?.waiting??0} · Chờ thắp nhang {state.movement?.incenseQueued??0}/32</p><small>Thắp nhang: hoàn tất {state.movement?.incenseCompleted??0} · cooldown {state.movement?.incenseCooldown??0} · đang bận/hàng đầy {state.movement?.incenseBusy??0} · hết hạn {state.movement?.incenseExpired??0}. Mỗi người tối thiểu 5 giây; chờ tối đa 60 giây. Quà được ưu tiên ở lượt kế tiếp.</small></>}
 <label className="toggle"><span>Chuyển động nhẹ trong góc</span><input aria-label="Chuyển động nhẹ trong góc" type="checkbox" disabled={!connected||!available} checked={Boolean(state?.settings.cameraDriftEnabled&&!state.camera?.paused)} onChange={e=>update({cameraDriftEnabled:e.target.checked})}/></label>
 <label>Nhịp lia<select aria-label="Nhịp lia" disabled={!connected||!available} value={state?.settings.cameraDriftSpeed??'fast'} onChange={e=>update({cameraDriftSpeed:e.target.value as Settings['cameraDriftSpeed']})}><option value="slow">Chậm · 12–18 giây</option><option value="medium">Vừa · 8–12 giây</option><option value="fast">Nhanh · 6–9 giây</option></select></label>
 <label className="toggle"><span>Tập trung người tặng tại lư hương</span><input aria-label="Tập trung người tặng tại lư hương" type="checkbox" disabled={!connected||!available} checked={Boolean(state?.settings.cameraGiftFocusEnabled&&!state.camera?.paused)} onChange={e=>update({cameraGiftFocusEnabled:e.target.checked})}/></label>
 <button disabled={!connected} onClick={()=>send({type:'camera-stop'})}>Dừng camera</button>
 <small>Nhịp lia độc lập với thời gian đổi góc. Khi không đủ chỗ cho cận cảnh (ba sen hoặc bảng đầy đủ), chỉ làm nổi người hành lễ. Giảm hiệu ứng tắt lia/zoom.</small>
 <p data-testid="camera-motion-status">{state?.camera?.paused?'Đã dừng do hiệu năng':state?.camera?.from?'Đang hòa cảnh':state?.camera?.motion?({drift:'Đang lia nhẹ',focus:'Đang tập trung người dâng hương',recover:'Đang phục hồi',settle:'Đang về khung nghỉ'}[state.camera.motion.kind]):'Khung nghỉ'}{state?.settings.reducedEffects?' · Giảm hiệu ứng: không lia/zoom':''}</p>
 <label className="toggle"><span>Tự đổi góc</span><input aria-label="Tự đổi góc" type="checkbox" disabled={!connected||!available} checked={Boolean(state?.settings.cameraAuto&&!state.camera?.paused)} onChange={e=>update({cameraAuto:e.target.checked})}/></label>
 <label>Giữ mỗi góc<select aria-label="Giữ mỗi góc" disabled={!connected} value={state?.settings.cameraHoldSeconds??60} onChange={e=>update({cameraHoldSeconds:Number(e.target.value)})}>{[15,20,30,45,60,90,120,180].map(n=><option key={n} value={n}>{n} giây</option>)}</select></label>
 <small>Dao động ±25%; khi đặt 60 giây, góc giữ 45–75 giây. Chờ hoạt động chính kết thúc và cảnh yên 2 giây.</small>
 <label className="toggle"><span>Hòa cảnh 1 giây</span><input type="checkbox" disabled={!connected} checked={state?.settings.cameraFade??true} onChange={e=>update({cameraFade:e.target.checked})}/></label>
 <div className="button-row">{cameraViews.map(view=><button key={view} disabled={!connected||!available} aria-pressed={state?activeCamera(state)===view:false} onClick={()=>send({type:'camera-view',view})}>{cameraLabels[view]}</button>)}</div>
 <p data-testid="camera-status">Góc được chọn: {state?cameraLabels[activeCamera(state)]:'A · Chính diện'}{!available?' · Đa góc chỉ áp dụng chánh điện':''}</p>
 {state?.camera?.waiting&&<p>Đang hoãn: {state.camera.waiting}</p>}
 {state?.camera?.paused&&<p role="alert">{state.camera.paused}</p>}
 {state?.camera?.nextAt&&<p>Lần đổi dự kiến: {new Date(state.camera.nextAt).toLocaleTimeString('vi-VN')}</p>}
 {(state?.metrics.cameraDisplays??[]).map((display,i)=><div key={i}><p>{display.capture?'Cửa sổ capture':'Overlay / preview'}: <b>{cameraLabels[display.view]}</b></p>{Object.entries(display.errors).map(([view,error])=><p role="alert" key={view}>{error}</p>)}</div>)}
 <label className="toggle"><span>Ghi nhớ góc khi khởi động lại</span><input type="checkbox" checked={state?.settings.cameraRemember??true} disabled={!connected} onChange={e=>update({cameraRemember:e.target.checked})}/></label>
 <p>Đổi phòng hoặc reset trở về chính diện. Sân Quan Âm và classic vẫn dùng góc chính diện.</p>
 <small>Giảm hiệu ứng dùng chuyển trực tiếp. Capture dưới 24 FPS qua 3 lần đo sẽ dừng tự động; hãy bật lại sau khi giảm tải. Góc lỗi tài nguyên bị loại khỏi lịch.</small>
 </section>;
}
