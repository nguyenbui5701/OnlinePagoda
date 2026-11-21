import {useState} from 'react';
import type { Command, SceneState, Settings } from '@vuonsen/shared';
import {commentEffectLabels} from '@vuonsen/shared';
export function CommunityPanel({state,connected,update,send}:{state?:SceneState;connected:boolean;update:(s:Partial<Settings>)=>void;send:(c:Command)=>void}){
  const s=state?.settings,p=state?.prayerStatus;
  const [coins,setCoins]=useState(1),[units,setUnits]=useState(1);
  return <section className="card" id="community-settings"><span className="eyebrow">CHÁNH ĐIỆN & CỘNG ĐỒNG</span><h2>Chỗ ngồi và hành lễ</h2>
    <p>{state?.room?.atSeat??state?.room?.seated??0} tại ghế · {state?.room?.away??0} đang đi/hành lễ · {state?.room?.available??Math.max(0,(s?.maxActors??100)-(state?.room?.seated??0))} ghế chưa cấp · {state?.room?.visibleStanding??0} hiện ở khu đứng</p>
    <small>Ghế đã cấp gồm cả người đang đi hoặc hành lễ; người chờ lượt lễ ngồi tại ghế của mình. Ghế chưa cấp được nhường cho người chờ sẵn sàng, không bị chặn bởi một người đang bận.</small>
    <button disabled={!connected} onClick={()=>update({maxActors:100})}>Dùng 100 ghế</button>
    <label>Ẩn người đứng sau {s?.standingMinutes??5} phút không tương tác<input aria-label="Thời gian khu đứng" type="range" min="1" max="30" step="1" disabled={!connected} value={s?.standingMinutes??5} onChange={e=>update({standingMinutes:Number(e.target.value)})}/></label>
    <p>Hết giờ ngồi sẽ trả ghế và đứng ngoài. Gõ “vào chùa”, “ngồi”, “xin chỗ” để xin lại ghế. Chat và hiệu ứng vẫn dùng được ở khu đứng.</p>
    <p>Lạy: {p?.active??0}/18 đang lễ · {p?.queued??0}/100 chờ · {p?.completed??0} hoàn tất · {p?.cooldown??0} giới hạn · {p?.expired??0} hết hạn · {p?.busy??0} hàng đầy</p>
    <small>“Lạy”, “lạy Phật”, “lễ Phật”, “bái Phật”, “đảnh lễ” · hồi 5 giây/người; phải hoàn tất lượt đang thực hiện trước khi nhận lượt mới. Khu đứng không phải danh sách xác nhận ai còn xem LIVE.</small>
    <h3>Hiệu ứng quà theo xu</h3>
    <label className="toggle"><span>Trình diễn theo tổng xu combo</span><input aria-label="Hiệu ứng theo xu" type="checkbox" disabled={!connected} checked={s?.giftTierEffects??true} onChange={e=>update({giftTierEffects:e.target.checked})}/></label>
    <p>1–4 xu: sen avatar · 5–9 xu: sen phối cảnh · 10–29 xu: rồng/phượng · từ 30 xu: long phụng. Combo đang gửi chỉ cập nhật hình, chốt điểm và cảm ơn khi kết thúc. Quà chưa có ID trong danh mục đã xác nhận dùng tối thiểu cấp 3.</p>
    <p>Đã nhận {state?.giftShow?.received??0} · đang phát {state?.giftShow?.active.length??0} · chờ {state?.giftShow?.queued??0}/20 · đã phát hình quà chốt {state?.giftShow?.shown??0} · xem trước combo {state?.giftShow?.previews??0} · hết hạn {state?.giftShow?.expired??0} · hàng đầy {state?.giftShow?.overflow??0} · chưa rõ giá trị {state?.giftShow?.unknownValue??0}</p>
    <small>Số lượt phát do server ghi nhận, chưa xác nhận hình trên điện thoại. Lượt hình bị bỏ vẫn giữ điểm, lời cảm ơn và thông báo nhận quà. Combo thiếu định danh chỉ hiện sau khi chốt.</small>
    {state?.mode==='demo'&&<div><label>Xu mỗi món DEMO<input aria-label="Xu DEMO" type="number" min="1" max="10000000" value={coins} onChange={e=>setCoins(Number(e.target.value))}/></label><label>Số món combo<input aria-label="Số món DEMO" type="number" min="1" max="9999" value={units} onChange={e=>setUnits(Number(e.target.value))}/></label>
    <button disabled={!connected} onClick={()=>send({type:'event',event:{type:'gift',userId:'tier-demo',nickname:'Sen DEMO',eventId:crypto.randomUUID(),gift:{id:'tier-demo',demoGroup:'rose',name:'Quà DEMO',unitCoins:coins,count:units,finished:true}}})}>Thử combo DEMO</button>
    <small>Thử 5 xu ba lần để xem tim/cá/nến; 10 xu hai lần để xem rồng/phượng; 30 xu để xem long phụng. Có thể nhập 1 xu × 10 món để thử combo.</small></div>}
    <h3>Hiệu ứng bình luận</h3>
    <label className="toggle"><span>Bật hiệu ứng miễn phí qua chat</span><input type="checkbox" disabled={!connected} checked={s?.commentEffectsEnabled??true} onChange={e=>update({commentEffectsEnabled:e.target.checked})}/></label>
    <p>Thắp nến · trái tim · hoa sen · thỉnh chuông · ngũ quả · cá chép · rồng vàng · phượng hoàng · long phụng · sen yêu thương · sen cá chép · sen ánh nến. Một hiệu ứng lớn mỗi lượt, 3 giây. Mỗi người chờ 5 giây chung cho mọi loại. Hoa đăng có hàng đợi riêng, cũng hồi 5 giây.</p>
    <p>Chỉ cần gõ “hoa sen”, “ngũ quả” hoặc “rồng vàng”; không cần tặng quà. Cũng nhận “cho mình một đóa sen nhé”, “mâm trái cây”, “kim long”. Cụm lệnh được nhận cả trong câu; nếu có nhiều hiệu ứng thì dùng cụm đầu tiên. Bỏ câu phủ định, giữ lệnh quẻ/hoa đăng ưu tiên riêng.</p>
    <small>Sen bình luận chỉ có hoa, không avatar. Quà có sen avatar và trình diễn theo mốc xu khi bật chế độ mới; thiếu ảnh dùng chữ cái tên. Không cần tặng quà để dùng các lệnh miễn phí.</small>
    <p data-testid="comment-effect-current">{state?.commentEffects?.[0]?`Đang phát: ${state.commentEffects[0].displayName} · ${commentEffectLabels[state.commentEffects[0].effect]}`:'Chưa có hiệu ứng bình luận đang phát'}</p>
    <p>Server đã phát {state?.commentEffectStatus?.shown??0} · chờ {state?.commentEffectStatus?.queued??0}/16 · cooldown {state?.commentEffectStatus?.cooldown??0} · hết hạn {state?.commentEffectStatus?.expired??0} · bị quà thay thế {state?.commentEffectStatus?.preempted??0} · hàng đầy {state?.commentEffectStatus?.busy??0}</p>
    <small>Số lượt server phát không xác nhận người xem đã nhìn thấy trên TikTok. Kiểm tra cửa sổ capture và màn hình điện thoại.</small>
    <small>“Nam mô”, “A Di Đà Phật”, “Nam mô A Di Đà Phật”: chắp tay và vòng sen 4 giây, hồi 5 giây tính từ lần nhận lệnh trước; không thêm giọng đọc.</small>
    <h3>Cây phúc lành · cùng góp tim</h3>
    <label className="toggle"><span>Bật cây từ tim mới nhận</span><input type="checkbox" disabled={!connected} checked={s?.treeEnabled??false} onChange={e=>update({treeEnabled:e.target.checked})}/></label>
    <label className="toggle"><span>Hiện hình cây và bảng tim trên overlay</span><input aria-label="Hiện cây phúc lành" type="checkbox" disabled={!connected} checked={s?.showBlessingTree??false} onChange={e=>update({showBlessingTree:e.target.checked})}/></label>
    <p>Ẩn cây vẫn tích tim và phát mưa hoa khi đủ mốc; không làm mất tiến độ.</p>
    <label>Hoa phúc lành<select aria-label="Kiểu hoa rơi" disabled={!connected} value={s?.flowerStyle??'auto'} onChange={e=>update({flowerStyle:e.target.value as Settings['flowerStyle']})}><option value="auto">Tự đổi mỗi đợt</option><option value="pink">Sen hồng</option><option value="ivory">Sen trắng ánh vàng</option><option value="gold">Hoa vàng năm cánh</option><option value="peach">Hoa đào hồng</option></select></label>
    <label>Mật độ hoa/lá<select aria-label="Mật độ hoa lá" disabled={!connected} value={s?.petalDensity??'medium'} onChange={e=>update({petalDensity:e.target.value as Settings['petalDensity']})}><option value="low">Thấp</option><option value="medium">Vừa</option><option value="high">Cao</option></select></label>
    <label>Mục tiêu vòng tiếp theo<input aria-label="Mục tiêu cây" type="number" min="100" max="1000000" step="100" disabled={!connected} value={s?.treeTarget??1000} onChange={e=>{const n=Number(e.target.value);if(n>=100&&n<=1000000)update({treeTarget:n});}}/></label>
    <p>{state?.tree?.phase==='bloom'?'Cây đang nở · gom các mốc đến dồn':'Đang tích tim'} · {state?.tree?.progress??0}/{state?.tree?.target??1000} tim · {state?.tree?.completed??0} mốc đã hoàn tất · tổng {state?.tree?.total??0} tim mới</p>
    <small>Tim dư giữ cho vòng sau. Đổi mục tiêu có hiệu lực sau vòng hiện tại. Tắt/bật cây bắt đầu lại; đổi phòng hoặc reset cũng xóa tiến độ. Không suy ra thời gian xem từ tim.</small>
    {state?.mode==='demo'&&<div><p>Tim DEMO · dữ liệu giả lập</p>{[100,1000,3500].map(n=><button key={n} disabled={!connected||!s?.treeEnabled} onClick={()=>send({type:'event',event:{type:'like',userId:'tree-demo',nickname:'Tim DEMO',likeCount:n,eventId:crypto.randomUUID()}})}>+{n} tim DEMO</button>)}</div>}
  </section>;
}
