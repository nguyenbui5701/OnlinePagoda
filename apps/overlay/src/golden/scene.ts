import {avatarCircle} from './avatar-cache';
import {createFloorPreview} from './floor-v2';
import {loadCameraArt} from './camera-art';
import {cameraPoint,cameraProfile,floorPoint,floorHome,activeCamera,type CameraView} from '@vuonsen/shared';
import { compactPanels } from './compact-panels';
import { Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { cleanText, seats, giftDefinitions, effectInstructions, type SceneAction, type SceneState } from '@vuonsen/shared';
import { GiftEffectManager } from './gift-effects';
import { goldenSeat } from './layout';
import { createCourtyard } from './courtyard';
import {loadShowcaseArt} from './showcase-art';

const gold = 0xeabf63, cream = 0xffefd2;
function text(value: string, size = 25, color = cream, family = 'Segoe UI') {
  return new Text({ text: value, style: { fontFamily: family, fontSize: size, fill: color, align: 'center', lineHeight: size * 1.35 } });
}
function centered(parent: Container, value: string, x: number, y: number, size = 25, color = cream, family = 'Segoe UI') {
  const t = text(value, size, color, family); t.anchor.set(.5); t.position.set(x, y); parent.addChild(t); return t;
}
function panel(x: number, y: number, width: number, height: number) {
  const p = new Container(); p.position.set(x, y);
  p.addChild(new Graphics().roundRect(0, 5, width, height, 20).fill({ color: 0x080302, alpha: .55 })
    .roundRect(0, 0, width, height, 20).fill({ color: 0x25110b, alpha: .95 }).stroke({ color: gold, width: 2 })
    .roundRect(6, 6, width - 12, height - 12, 16).stroke({ color: 0x91622c, alpha: .65, width: 1 }));
  for (const cx of [20, width - 20]) for (const cy of [20, height - 20]) p.addChild(new Graphics().poly([cx, cy - 5, cx + 5, cy, cx, cy + 5, cx - 5, cy]).fill(gold));
  return p;
}
function softTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, '#fff5da'); g.addColorStop(.25, '#f0e2c2a0'); g.addColorStop(1, '#e8c98a00');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); return Texture.from(c);
}
function lotus() {
  const c = new Container();
  c.addChild(new Graphics().ellipse(0, 18, 52, 12).fill({ color: 0xffce91, alpha: .35 }));
  for (let i = -3; i <= 3; i++) {
    const petal = new Graphics().moveTo(0, 9).bezierCurveTo(-26, -10, -23, -40, 0, -61).bezierCurveTo(23, -40, 26, -10, 0, 9)
      .fill(i % 2 ? 0xd86a91 : 0xf5a1b7).stroke({ color: 0xffedc6, width: 1.5 });
    petal.rotation = i * .29; petal.x = i * 7; c.addChild(petal);
  }
  c.addChild(new Graphics().ellipse(0, 2, 16, 7).fill(0xffd684)); return c;
}

export async function createGoldenScene() {
  await loadShowcaseArt();
  const [hall, statue, incenseTexture] = await Promise.all([Assets.load<Texture>('/overlay/art/golden/temple-hall.png'), Assets.load<Texture>('/overlay/art/golden/buddha-lotus.png'), Assets.load<Texture>('/overlay/art/golden/incense-burner.png')]);
  const cameraArt=await loadCameraArt({hall,statue,urn:incenseTexture});
  let renderedView:CameraView='front';
  let preview=false;
  const profileFor=(view:CameraView)=>cameraProfile(view,preview);
  const project=(view:CameraView,x:number,y:number)=>preview?floorPoint(view,x,y):cameraPoint(view,x,y);
  const world = new Container(), ui = new Container(), fx = new Container();
  const backdrop = new Sprite(hall); backdrop.width = 1080; backdrop.height = 1920; world.addChild(backdrop);
  let floorPreview:ReturnType<typeof createFloorPreview>|undefined;
  let courtyard:Awaited<ReturnType<typeof createCourtyard>>|undefined;
  try{courtyard=await createCourtyard();courtyard.root.visible=false;world.addChild(courtyard.root);}catch(error){console.warn('Không tải được sân Quan Âm; giữ chánh điện.',error);}
  const soft = softTexture();
  const aura = new Sprite(soft); aura.anchor.set(.5); aura.position.set(540, 390); aura.width = aura.height = 640; aura.tint = 0xffbd47; aura.alpha = .33; world.addChild(aura);
  const halo = new Graphics(); halo.position.set(540, 352);
  for (const radius of [120, 129, 151, 155, 177]) halo.circle(0, 0, radius).stroke({ color: gold, width: radius === 155 ? 3 : 1, alpha: .8 });
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; halo.moveTo(Math.cos(a) * 155, Math.sin(a) * 155).lineTo(Math.cos(a) * 174, Math.sin(a) * 174).stroke({ color: gold, width: 1.5 }); }
  world.addChild(halo);
  const buddha = new Sprite(statue); buddha.anchor.set(.5, 1); buddha.position.set(540, 893); buddha.height = 690; buddha.scale.x = buddha.scale.y; world.addChild(buddha);
  const urn = new Sprite(incenseTexture); urn.anchor.set(.5, 1); urn.position.set(540, 1050); urn.width = 295; urn.scale.y = urn.scale.x; world.addChild(urn);
  const mats = new Container(); world.addChild(mats);
  for (const rawSeat of seats) {
    const seat = goldenSeat(rawSeat);
    const mat = new Graphics().ellipse(0, 4, 48, 15).fill({ color: 0x130805, alpha: .38 }).ellipse(0, 0, 43, 13).fill(0x7c261d).stroke({ color: 0xb88643, width: 2 }).ellipse(0, -2, 36, 8).fill(0x983a2c);
    mat.position.set(seat.x, seat.y); mat.scale.set(seat.scale); mats.addChild(mat);
  }
  const smokeLayer = new Container(); world.addChild(smokeLayer);
  const smoke = Array.from({ length: 24 }, () => { const p = new Sprite(soft); p.anchor.set(.5); smokeLayer.addChild(p); return p; });
  const candleLayer = new Container(); world.addChild(candleLayer);
  const candles = [[166, 826], [911, 826], [347, 815], [737, 815]].map(([x, y]) => {
    const flame = new Container(); flame.position.set(x, y);
    const glow = new Sprite(soft); glow.anchor.set(.5); glow.width = glow.height = 110; glow.tint = 0xff9e36; glow.alpha = .4;
    flame.addChild(glow, new Graphics().ellipse(0, 0, 7, 18).fill(0xffb145).ellipse(0, 4, 3, 10).fill(0xfff3b3)); candleLayer.addChild(flame); return flame;
  });
  world.addChild(fx);
  const gifts = new GiftEffectManager(); world.addChild(gifts.layer);
  if(courtyard)world.addChild(courtyard.weather);
  const top = panel(28, 20, 1024, 149); ui.addChild(top);
  centered(top, 'VƯỜN SEN / CHÙA ONLINE', 512, 22, 17, gold);
  const heading = centered(top, '', 512, 67, 48, cream, 'Georgia');
  const counts = centered(top, '', 512, 116, 24);
  const mode = centered(ui, '', 540, 190, 16, 0xf8dc9c);
  const left = panel(24, 180, 258, 710); ui.addChild(left);
  centered(left, 'GÕ HIỆU ỨNG', 129, 34, 25, gold, 'Georgia');
  centered(left, 'Miễn phí · bình luận bên dưới',129,64,17,0xc6a87d);
  const fullGuideRows:{title:Text;action:Text}[]=[];
  effectInstructions.slice(0,8).forEach((g,i)=>{
    const y=104+i*66;
    centered(left,g.icon,30,y+6,27,gold);
    const title=centered(left,g.command,149,y,23);if(title.width>194)title.scale.x=194/title.width;
    const action=centered(left,g.description,149,y+27,18,0xd2b88e);if(action.width>194)action.scale.x=194/action.width;
    fullGuideRows.push({title,action});
    left.addChild(new Graphics().moveTo(22,y+46).lineTo(236,y+46).stroke({color:gold,alpha:.18,width:1}));
  });
  const commands = centered(left,'Bình luận để ghé chùa\nCầu an · Lễ Phật',129,664,20);
  const right = panel(798, 210, 258, 434); ui.addChild(right);
  centered(right, 'BẢNG CÔNG ĐỨC', 129, 35, 23, gold, 'Georgia');
  centered(right,'Điểm tương tác từ quà',129,69,18,0xd6ba91);
  const emptyBoard=centered(right,'Chưa có lượt tặng\nquà trong phiên',129,211,22);
  const rankRows=Array.from({length:5},(_,i)=>{
    const c=new Container();c.y=112+i*49;right.addChild(c);
    c.addChild(new Graphics().circle(27,0,13).fill([0xd9ac4f,0xa9b3bc,0xae7755,0x614431,0x614431][i]));centered(c,String(i+1),27,0,17,0x20100b);
    const name=centered(c,'',125,-7,21),score=centered(c,'',125,15,17,gold);return {c,name,score};
  });
  const giftCount=centered(right,'',129,370,18,0xd6ba91);
  centered(right,'1 quà = 1 điểm tương tác',129,397,17,0xc6a87d);
  const recentPanel = panel(798, 668, 258, 215); ui.addChild(recentPanel);
  centered(recentPanel, 'QUÀ VỪA NHẬN', 129, 29, 22, gold);
  const recentRows=Array.from({length:3},(_,i)=>({name:centered(recentPanel,'',129,66+i*50,21),gift:centered(recentPanel,'',129,87+i*50,16,0xc6a87d)}));
  let recentAvatar:Container|undefined,recentAvatarKey='';
  const compact = compactPanels(); ui.addChild(compact.root);
  const ticker = new Container(), bubbles = new Container(); ui.addChild(bubbles, ticker);
  const badge = centered(ui, 'MỘT LỜI CHÀO · MỘT CHÚT BÌNH AN', 540, 1888, 18, 0xe8c994);
  let state: SceneState | undefined, elapsed = 0, lastSession = '', toastKey = '', giftNames: string[] = [], clockOffset = 0;
  const toastAnimations: { root: Container; born: number; expiresAt: number; y: number }[] = [];
  const blooms: { root: Container; x: number; y: number; born: number; kind: string }[] = [];
  const bubbleItems: { root: Container; born: number; y: number }[] = [];
  let lastTick=performance.now();
  let lastBubbleAt = -10000;
  function clearTransient() {
    gifts.clear();
    for (const list of [blooms, bubbleItems]) { for (const item of list) item.root.destroy({ children: true }); list.length = 0; }
    ticker.removeChildren().forEach(c => c.destroy({ children: true })); toastAnimations.length = 0; giftNames = []; toastKey = ''; lastBubbleAt = -10000;
  }
  function action(a: SceneAction) {
    if (!state) return;
    const actor = state.actors.find(actor => actor.key === a.actorId), rawSeat = seats.find(s => s.id === actor?.seatId), seat = rawSeat ? (preview?floorHome(rawSeat):goldenSeat(rawSeat)) : undefined;
    const x = seat?.x || 540, y = (seat?.y || 1040) - 32;
    if (!state.settings.giftTierEffects && a.type === 'GIFT_CONFIRMED' && a.confirmedGift) gifts.enqueue(a.confirmedGift,state.settings);
    if (!state.settings.effects || blooms.length >= (state.settings.reducedEffects ? 4 : 10)) return;
    if (!['LOTUS_BLOOM', 'LIKE_PULSE'].includes(a.type)) return;
    const kind = a.type === 'LIKE_PULSE' ? 'candle' : 'lotus';
    if (kind === 'lotus' && !state.settings.flowers) return;
    if (kind === 'candle' && !state.settings.candles) return;
    const root = kind === 'lotus' ? lotus() : new Container();
    if (kind === 'candle') root.addChild(new Graphics().ellipse(0, -15, 12, 28).fill(0xffca66).ellipse(0, -10, 5, 15).fill(0xfff0bb));
    fx.addChild(root); blooms.push({ root, x, y, born: elapsed, kind });
  }
  function selectView(requested:CameraView){
    preview=Boolean(state?.settings.templeFloorPreview&&state.settings.sceneSpace==='hall');
    if(preview&&!floorPreview){floorPreview=createFloorPreview(hall);world.addChildAt(floorPreview.root,1);}
    if(floorPreview)floorPreview.root.visible=preview;
    const old=profileFor(renderedView).urn,available=preview?cameraArt.cleanArt:cameraArt.art;
    const next=available.has(requested)?requested:renderedView;
    renderedView=available.has(next)?next:'front';
    const textures=available.get(renderedView)!,profile=profileFor(renderedView);
    backdrop.texture=textures.hall;
    // Cover uniformly; supplied 941×1672 files are near 9:16. Never stretch pillars.
    const cover=Math.max(1080/textures.hall.width,1920/textures.hall.height);
    backdrop.scale.set(cover);backdrop.position.set((1080-backdrop.width)/2,(1920-backdrop.height)/2);
    buddha.texture=textures.statue;buddha.position.set(profile.statue.x,profile.statue.y);buddha.height=profile.statue.height;buddha.scale.x=buddha.scale.y;
    urn.texture=textures.urn;urn.position.set(profile.urn.x,profile.urn.y);urn.width=profile.urn.width;urn.scale.y=urn.scale.x;
    for(const p of smoke){p.x+=profile.urn.x-old.x;p.y+=profile.urn.y-old.y;}
    for(const b of blooms){const p=project(renderedView,b.x,b.y);b.root.position.set(p.x,p.y-Math.max(0,(elapsed-b.born)/3200)*48);}
    const haloScale=profile.statue.height/690;
    halo.position.set(profile.face.x+profile.face.width/2,profile.face.y+profile.face.height/2);halo.scale.set(haloScale);
    aura.position.copyFrom(halo.position);aura.width=aura.height=640*haloScale;
    if(preview)floorPreview?.update(renderedView,state?.settings.maxActors??100);mats.visible=!preview;
    mats.children.forEach((mat,i)=>{const seat=goldenSeat(seats[i]),p=cameraPoint(renderedView,seat.x,seat.y);mat.position.set(p.x,p.y);mat.scale.set(seat.scale*p.scale);mat.rotation=renderedView==='left'?-.14:renderedView==='right'?.14:0;});
    return renderedView;
  }
  return { world, ui, selectView, cameraView:()=>renderedView, cameraErrors:()=>preview?cameraArt.cleanErrors:cameraArt.errors,

    update(value: SceneState, actions: SceneAction[], active: boolean) {
      state = value;selectView(activeCamera(value));
      state = value; clockOffset = value.serverTime - Date.now(); world.visible = ui.visible = active;
      if (lastSession !== value.sessionId) { clearTransient(); lastSession = value.sessionId; }
      if (!active) { clearTransient(); return; }
      mats.children.forEach((c,i)=>c.visible=i<value.settings.maxActors);
      heading.text = value.settings.templeName; heading.scale.set(1); heading.scale.set(Math.min(1, 900 / heading.width));
      counts.text = value.room?`${value.room.seated} đang ngồi   ·   ${value.room.visibleStanding} đứng ngoài   ·   ${value.queue} chờ ghế`:`${value.actors.length} đang lễ   ·   ${value.total} lượt ghé   ·   ${value.queue} đang chờ`;
      mode.text = value.mode === 'demo' ? 'DEMO · DỮ LIỆU THỬ' : value.connection.fixture ? 'FIXTURE · KIỂM THỬ, KHÔNG PHẢI LIVE THẬT' : value.connection.status==='LIVE_CONNECTED' ? `LIVE · ${value.connection.viewers ?? '—'} khán giả (lần cập nhật cuối)` : `TIKTOK · ${value.connection.status}`;
      compact.update(value);
      left.visible = value.settings.showGiftPanel && !value.settings.compactGiftPanels; right.visible = value.settings.showThanksPanel && !value.settings.compactGiftPanels; commands.visible = value.settings.showGuide;
      commands.text=value.settings.autoJoinChat?'Gõ “vào chùa” để ngồi\nCầu an · Xin quẻ · Hoa đăng':'Tạm tắt vào chỗ\nCầu an · Xin quẻ';
      recentPanel.visible = value.settings.showRegister && !value.settings.compactGiftPanels;
      const ranking=value.leaderboard||[], recentGifts=value.recentGifts||[];
      const latest=recentGifts[0],latestKey=latest?value.sessionId+latest.eventKey:'';
      if(latestKey!==recentAvatarKey){recentAvatar?.destroy({children:true});recentAvatar=undefined;recentAvatarKey=latestKey;
        if(latest){recentAvatar=avatarCircle(latest.displayName,latest.avatarUrl,48);recentAvatar.position.set(34,76);recentPanel.addChild(recentAvatar);}}
      if(recentRows[0]){recentRows[0].name.x=158;recentRows[0].gift.x=158;recentRows[0].name.style.fontSize=18;}
      emptyBoard.visible=!ranking.length;
      rankRows.forEach((row,i)=>{const entry=ranking[i];row.c.visible=Boolean(entry);if(entry){row.name.text=cleanText(entry.displayName,14);row.name.scale.set(1);if(row.name.width>185)row.name.scale.x=185/row.name.width;row.score.text=new Intl.NumberFormat('vi-VN').format(entry.score)+' điểm';}});
      recentRows.forEach((row,i)=>{const g=recentGifts[i];row.name.text=g?cleanText(g.displayName,14):i===0?'Chưa có quà tặng':'';row.gift.text=g?`${cleanText(g.giftName,17)} ×${g.units}`:'';row.name.scale.set(1);if(row.name.width>220)row.name.scale.x=220/row.name.width;row.gift.scale.set(1);if(row.gift.width>220)row.gift.scale.x=220/row.gift.width;});
      giftNames=recentGifts.map(g=>g.displayName);giftCount.text=`${new Intl.NumberFormat('vi-VN').format(value.metrics.giftUnits)} quà đã hoàn tất`;
      const currentKey = value.settings.showTicker ? value.toasts.slice(-2).map(t => t.id).join(',') : '';
      if (currentKey !== toastKey) {
        ticker.removeChildren().forEach(c => c.destroy({ children: true })); toastAnimations.length = 0; toastKey = currentKey;
        if (value.settings.showTicker) for (const [i, toast] of value.toasts.slice(-2).entries()) {
          const p = panel(80, 1804 + i * 55, 920, 50), t = centered(p, toast.text, 460, 25, 25);
          if (t.width > 860) t.scale.x = 860 / t.width; ticker.addChild(p);
          toastAnimations.push({ root: p, born: elapsed, expiresAt: toast.expiresAt, y: p.y });
        }
      }
      ticker.visible = value.settings.showTicker; bubbles.visible = value.settings.showBubbles; badge.visible = !toastKey;
      actions.forEach(action);
    },
    tick(dt: number, lowFps: boolean) {
      const now=performance.now();dt=now-lastTick;lastTick=now;
      elapsed += dt; if (!state || !world.visible) return;
      const s = state.settings, reduced = s.reducedEffects || lowFps, enabled = s.effects && s.effectIntensity > 0;
      const outdoors=s.sceneSpace==='courtyard'&&Boolean(courtyard);
      courtyard?.tick(state,Date.now()+clockOffset,reduced);
      backdrop.visible=buddha.visible=!outdoors;
      const lightFloor=outdoors&&(courtyard?.debug().weights.night??0)<.5;
      const footerColor=lightFloor?0x493820:0xe8c994,modeColor=lightFloor?0x334c42:0xf8dc9c;
      if(badge.style.fill!==footerColor)badge.style.fill=footerColor;
      if(mode.style.fill!==modeColor)mode.style.fill=modeColor;
      compact.tick(Date.now()+clockOffset);
      const guidePage=Math.floor((Date.now()+clockOffset)/6000)%Math.ceil(effectInstructions.length/8);
      fullGuideRows.forEach((r,i)=>{const item=effectInstructions[guidePage*8+i];r.title.text=item?.command||'';r.action.text=item?.description||'';});
      if(s.giftTierEffects)gifts.clear();else gifts.tick(dt,s,reduced);
      aura.visible = halo.visible = !outdoors && enabled && s.glow; aura.alpha = (.25 + Math.sin(elapsed / 3200) * .045) * s.effectIntensity;
      halo.alpha = .65 + Math.sin(elapsed / 4000) * .1;
      smokeLayer.visible = enabled && s.smoke; candleLayer.visible = !outdoors && enabled && s.candles;
      smoke.forEach((p, i) => { const f = (elapsed / 5600 + i / 24) % 1; p.visible = i < (reduced ? 7 : 24); const base=profileFor(renderedView).urn;p.position.set(base.x + Math.sin(f * 8 + i * .8) * 23 * f, base.y-140 - f * 215); p.scale.set(.2 + f * .85, .3 + f * 1.4); p.alpha = Math.sin(f * Math.PI) * .13 * s.effectIntensity; });
      candleLayer.visible=candleLayer.visible&&renderedView==='front';
      candles.forEach((f, i) => f.scale.set(1 + Math.sin(elapsed / 190 + i) * .035, 1 + Math.sin(elapsed / 140 + i) * .09));
      for (let i = blooms.length - 1; i >= 0; i--) {
        const b = blooms[i], p = (elapsed - b.born) / 3200;
        if (p >= 1 || !enabled || (b.kind === 'lotus' && !s.flowers) || (b.kind === 'candle' && !s.candles)) { b.root.destroy({ children: true }); blooms.splice(i, 1); continue; }
        const projected=project(renderedView,b.x,b.y);b.root.position.set(projected.x, projected.y - p * 48); b.root.scale.set(Math.min(1, p * 5)); b.root.alpha = Math.min(1, (1 - p) * 3) * s.effectIntensity;
        if (b.kind === 'bell') b.root.rotation = Math.sin(p * 18) * .14;
      }
      for (let i = bubbleItems.length - 1; i >= 0; i--) {
        const b = bubbleItems[i], age = elapsed - b.born;
        if (age > 3200 || !s.showBubbles) { b.root.destroy({ children: true }); bubbleItems.splice(i, 1); }
        else { b.root.alpha = Math.min(1, age / 180, (3200 - age) / 350); b.root.y = b.y - Math.min(12, age / 120); }
      }
      // Server owns toast lifetime; client only animates its bounded visual strip.
      for (const item of toastAnimations) {
        const enter = Math.min(1, (elapsed - item.born) / 220);
        item.root.alpha = Math.max(0, Math.min(enter, (item.expiresAt - Date.now() - clockOffset) / 350));
        item.root.y = item.y + (1 - enter) * 18;
      }
    },
    debug() { return { camera:{view:renderedView,errors:preview?cameraArt.cleanErrors:cameraArt.errors,profile:profileFor(renderedView),cleanArchitecture:preview,asset:backdrop.texture.label,backdrop:{x:backdrop.x,y:backdrop.y,width:backdrop.width,height:backdrop.height},floor:preview?floorPreview?.debug():undefined},courtyard:courtyard?.debug(), compactPanels:compact.debug(), effects: blooms.length+gifts.debug().active.length, giftEffects:gifts.debug(), giftRows:giftDefinitions.length, leaderboard:state?.leaderboard||[], backFacing:true, bubbles: bubbleItems.length, ticker: ticker.children.length, giftUnits: state?.metrics.giftUnits || 0, giftNames: [...giftNames], smokeParticles: smokeLayer.visible ? smoke.filter(p => p.visible).length : 0,
      visible: { showGiftPanel: Boolean(state?.settings.showGiftPanel), showThanksPanel: Boolean(state?.settings.showThanksPanel), showTicker: ticker.visible, showBubbles: bubbles.visible, glow: aura.visible, smoke: smokeLayer.visible, candles: candleLayer.visible } }; }
  };
}
