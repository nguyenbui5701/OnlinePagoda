from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent.parent
items=json.loads((ROOT/'data/que_dinh_mui_2027_576.json').read_text('utf8'))['items']
raw=json.dumps(items,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
page=r'''<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Chùa Online · Xem thử quẻ Đinh Mùi 2027</title>
<style>
:root{color-scheme:dark;font-family:Segoe UI,Arial,sans-serif;background:#151a1c;color:#fff0cf}
*{box-sizing:border-box}body{margin:0;padding:22px;display:grid;place-items:center;min-height:100vh;background:radial-gradient(circle at 50% 10%,#4b3627,#121b1c 66%)}
.shell{width:min(100%,960px);display:grid;grid-template-columns:minmax(320px,430px) 1fr;gap:24px;align-items:start}
.frame{border:7px solid #b98b42;border-radius:18px;aspect-ratio:9/16;min-height:540px;position:relative;overflow:hidden;background:radial-gradient(circle at 50% 30%,#695034 0%,#402e27 32%,#1a2226 90%);box-shadow:0 10px 50px #0009}
.frame:before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.3;background:repeating-linear-gradient(90deg,transparent 0px,transparent 34px,#b58d5333 36px,#b58d5333 38px)}
.sun{position:absolute;left:50%;top:21%;transform:translate(-50%,-50%);width:62%;aspect-ratio:1;border:2px solid #e4bc6899;border-radius:50%;box-shadow:0 0 55px 32px #efb54a22,0 0 180px 80px #bc88281c}
.lotus{position:absolute;top:35%;width:100%;text-align:center;font-size:75px;opacity:.62;filter:drop-shadow(0 0 22px #ffd680)}
.head{position:relative;text-align:center;margin-top:23px;color:#ffe29a;font-size:21px;letter-spacing:2px;font-weight:800;text-shadow:0 2px 7px #000}
.sub{position:relative;text-align:center;margin-top:6px;font-size:12px;letter-spacing:1px;color:#f2d6a0}
.card{position:absolute;top:41%;left:7%;width:86%;border:2px solid #d5aa62;border-radius:17px;padding:20px 19px 16px;background:linear-gradient(155deg,#663c27f2,#342a27f7);box-shadow:0 10px 35px #000a;animation:show .45s ease-out}
@keyframes show{from{opacity:0;transform:translateY(15px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.pill{font-size:12px;text-transform:uppercase;letter-spacing:1.4px;color:#ffd49c}.name{font-size:23px;font-weight:800;margin:12px 0;color:#fff0ca;line-height:1.2}
.meaning{font-size:14px;line-height:1.55;color:#f6e5d1}.action{font-size:13px;background:#926b392b;border-left:3px solid #e5ba67;margin-top:13px;padding:9px 10px;line-height:1.55}.disclaimer{position:absolute;bottom:12px;text-align:center;left:3%;width:94%;font-size:10px;color:#d9c4a7}
.controls{border:1px solid #9c875465;border-radius:15px;background:#21282bc7;padding:22px}.controls h1{font-size:24px;margin:0 0 10px}.controls p{color:#e5dac4;line-height:1.55;margin:10px 0 16px}
label{display:block;color:#e9c889;font-size:13px;margin:18px 0 7px;font-weight:bold}select,input,button{width:100%;border-radius:9px;padding:12px;background:#30383c;color:#fff3d7;border:1px solid #9a8153;font:inherit}
button{cursor:pointer;background:#b08a44;color:#22170e;font-weight:800;margin-top:15px}button:hover{background:#e4b96a}.examples{font-size:13px;line-height:1.7;color:#e0d0aa}
code{background:#4a4132;padding:2px 6px;border-radius:5px;color:#ffe4a4}.meta{font-size:12px;color:#babbac;margin:16px 0 0}
@media(max-width:780px){.shell{display:flex;flex-direction:column;align-items:center}.frame{width:min(100%,410px);min-height:0}.controls{width:min(100%,550px)}}
</style></head><body><main class="shell">
<section class="frame" aria-label="Cảnh xem thử quẻ 9:16">
<div class="sun"></div><div class="head">CHÙA ONLINE</div><div class="sub">XIN QUẺ AN LÀNH · ĐINH MÙI 2027</div><div class="lotus">🪷</div>
<div class="card" id="card"><div class="pill" id="n">QUẺ 001 · BÌNH AN</div><div class="name" id="title">Ngọn đèn hiền</div><div class="meaning" id="meaning">Giữ được bình tĩnh trong một chuyện nhỏ cũng là giữ sáng cả ngày.</div><div class="action" id="action">Gợi ý: Chọn một việc có thể làm ngay.</div></div>
<div class="disclaimer">Quẻ chiêm nghiệm văn hóa · Không dự đoán chắc chắn · Xin quẻ miễn phí</div></section>
<section class="controls"><h1>🎴 Xem thử 576 quẻ</h1>
<p>Trang mẫu hoạt động ngoại tuyến, không cần đăng nhập hay mua quà. Đây chỉ là công cụ duyệt nội dung; chưa nối trực tiếp vào ứng dụng LIVE.</p>
<label for="group">Bộ quẻ / Chủ đề</label><select id="group"></select>
<label for="number">Hoặc nhập số quẻ 001–576 (không bắt buộc)</label><input id="number" inputmode="numeric" type="number" min="1" max="576" placeholder="Ví dụ: 128">
<button id="draw">🎋 RÚT QUẺ XEM THỬ</button>
<button id="copy" style="background:#52604b;color:#fff8e7">Sao chép lời quẻ</button>
<p class="examples"><b>Bình luận mẫu khi LIVE:</b><br><code>xin quẻ</code> · <code>xin xăm</code> · <code>xin quẻ công việc</code> · <code>xin quẻ gia đạo</code> · <code>xin quẻ tuổi Mùi</code> · <code>xin quẻ 1991</code> · <code>xem quẻ 123</code></p>
<p class="meta">Năm 2027 là Đinh Mùi, Tết bắt đầu 06/02/2027. Tân Mùi là năm sinh 1991. Các quẻ được biên soạn mới, không phải Kinh Dịch hoặc xăm chùa truyền thống.</p>
</section></main>
<script>const ITEMS = __FORTUNE_DATA__;
const group=document.querySelector('#group');let chosen=ITEMS[0];
const categories=[['all','Tất cả — 576 quẻ'],...Array.from(new Map(ITEMS.map(f=>[f.collection+':'+f.theme,f.theme_label])).entries()).map(([key,name])=>[key,name])];
for(const [key,label] of categories){const o=document.createElement('option');o.value=key;o.textContent=label;group.append(o)}
function render(f){chosen=f;const targets={n:`QUẺ ${String(f.number).padStart(3,'0')} · ${f.theme_label.toUpperCase()}`,title:f.title,meaning:f.meaning,action:'GỢI Ý: '+f.action};
  for(const [key,value] of Object.entries(targets)) document.querySelector('#'+key).textContent=value;
  const card=document.querySelector('#card');card.style.animation='none';void card.offsetWidth;card.style.animation='show .45s ease-out';}
render(chosen);
document.querySelector('#draw').addEventListener('click',()=>{
 const n=Number(document.querySelector('#number').value);
 const selected=n>=1 && n<=576 ? ITEMS.find(f=>f.number===n) : null;
 const filtered=group.value==='all'?ITEMS:ITEMS.filter(f=>f.collection+':'+f.theme===group.value);
 const list=filtered.length?filtered:ITEMS;render(selected||list[Math.floor(Math.random()*list.length)]);
});
document.querySelector('#copy').addEventListener('click',async()=>{
 const text=`${chosen.id} · ${chosen.title}\n${chosen.meaning}\nGợi ý: ${chosen.action}\n${chosen.blessing}`;
 try{await navigator.clipboard.writeText(text);document.querySelector('#copy').textContent='Đã sao chép!';}
 catch{window.prompt('Sao chép quẻ:',text);}
});
</script></body></html>'''
(ROOT/'XEM_THU_QUE_2027.html').write_text(page.replace('__FORTUNE_DATA__',raw),encoding='utf-8')
print('DEMO HTML', (ROOT/'XEM_THU_QUE_2027.html').stat().st_size)
