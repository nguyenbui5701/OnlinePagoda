import {informationObstacles} from './effect-space';
import {GiftShowVisual} from './gift-show';
import {layoutNames,type NamePlate} from './name-layout';
import { CommunityVisuals } from './community-effects';
import { BlessingTreeVisual } from './blessing-tree';
import { idleMotion, type Rect } from './live-motion';
import { ChatBubbles } from './chat-bubbles';
import { welcomePose } from './welcome-motion';
import { actorFacing } from './actor-facing';
import { Application, Container, Graphics, Sprite, Text, Texture,RenderTexture } from 'pixi.js';
import {sampleRoute,cameraFrame,altarFacing as legacyAltarFacing,cameraProfile,cameraPoint as legacyCameraPoint,floorPoint,floorHome, type CameraView} from '@vuonsen/shared';
import { actorHome, isStanding, seats, type Actor, type SceneAction, type SceneState } from '@vuonsen/shared';
import { connectScene } from '../../../packages/shared/src/client';
import { robeColors, templeCanvas } from './assets';
import { createGoldenScene } from './golden/scene';
import { loadDevotees, type ActorView } from './golden/actors';
import { goldenSeat } from './golden/layout';
import { giftOfferingPose as offeringPose, ritualKind } from './golden/gift-ritual-motion';
import { GiftRitualVisual } from './golden/gift-ritual-visual';
import { IncenseCeremonyVisual } from './golden/incense-ceremony';
import { offeringSpriteFrame } from './golden/ritual-frame';
import './style.css';
import { AudioManager, mountAudioControls } from './audio';
import { FortuneCard } from './fortune-card';
import { FortuneVoice } from './fortune-voice';
import { LanternCard } from './lantern-card';

async function start() {
  const app = new Application();
  await app.init({ width: 1080, height: 1920, background: '#193e33', antialias: true, resolution: 1, preference: 'webgl' });
  document.getElementById('scene')!.append(app.canvas); app.canvas.setAttribute('aria-label','Vườn Sen An Lành · khung cảnh demo');
  app.ticker.maxFPS = 30;
  const [sceneResult, actorsResult] = await Promise.allSettled([createGoldenScene(), loadDevotees()]);
  const golden = sceneResult.status === 'fulfilled' ? sceneResult.value : undefined;
  const makeGoldenActor = actorsResult.status === 'fulfilled' ? actorsResult.value : undefined;
  if (!golden || !makeGoldenActor) console.warn('Thiếu tài nguyên cảnh vàng; dùng giao diện classic. Kiểm tra thư mục overlay/art/golden.');
  let goldenActive = false;
  const world = new Container(); app.stage.addChild(world);
  // Two render targets share the SAME actor objects, textures and timeline.
  // Only the presentation is drawn twice during a dissolve; no event/audio replay.
  const cameraMix=new Container();app.stage.addChild(cameraMix);cameraMix.visible=false;
  const cameraFrames=[RenderTexture.create({width:1080,height:1920}),RenderTexture.create({width:1080,height:1920})];
  const cameraImages=cameraFrames.map(t=>{const image=new Sprite(t);cameraMix.addChild(image);return image;});
  const background = new Sprite(Texture.from(templeCanvas())); world.addChild(background);
  if (golden) world.addChildAt(golden.world, 0);
  const seatLayer = new Container(); world.addChild(seatLayer);
  for (const seat of seats) {
    const mat = new Graphics().ellipse(0, 4, 42, 13).fill({color:0x324f3c, alpha:.25}).ellipse(0, 0, 37, 11).fill(0x9d9368).ellipse(0, -1, 30, 8).stroke({color:0xc4b887,width:1});
    mat.position.set(seat.x,seat.y);mat.scale.set(seat.scale);seatLayer.addChild(mat);
  }
  const actorsLayer = new Container(); actorsLayer.sortableChildren = true; world.addChild(actorsLayer);
  const smokeLayer = new Container(); world.addChild(smokeLayer);
  const particles: Graphics[] = [];
  for(let i=0;i<24;i++){const p=new Graphics().ellipse(0,0,12+(i%5)*4,5+(i%4)*3).fill({color:0xf0e4c0,alpha:.1});smokeLayer.addChild(p);particles.push(p);}
  const effectsLayer = new Container(); world.addChild(effectsLayer);
  const ui = new Container(), classicUI = new Container(); app.stage.addChild(ui); ui.addChild(classicUI); if (golden) ui.addChild(golden.ui);
  const giftShowVisual=new GiftShowVisual();ui.addChild(giftShowVisual.root);
  const communityVisuals=new CommunityVisuals();ui.addChild(communityVisuals.root);
  const treeVisual=new BlessingTreeVisual();ui.addChildAt(treeVisual.rain,0);ui.addChild(treeVisual.root);
  const chatBubbles=new ChatBubbles();ui.addChild(chatBubbles.root);
  const motionOffsets=new Map<string,{x:number;y:number}>();
  const focusGlow=new Graphics().ellipse(0,0,65,20).stroke({color:0xfce1a3,width:3,alpha:.8});actorsLayer.addChild(focusGlow);
  const fortuneCard=new FortuneCard();ui.addChild(fortuneCard.root);
  const lanternCard=new LanternCard();ui.addChild(lanternCard.root);
  const focusName=new Text({text:'',style:{fontFamily:'Segoe UI',fontSize:25,fontWeight:'600',fill:0xffefd4,stroke:{color:0x160b08,width:6}}});focusName.anchor.set(.5);focusName.visible=false;ui.addChild(focusName);
  const txt = (value: string, size: number, color=0xf5e6bc, family='Georgia') => new Text({text:value,style:{fontFamily:family,fontSize:size,fill:color,align:'center'}});
  const header = txt('Vườn Sen An Lành',51);header.anchor.set(.5);header.position.set(540,83);classicUI.addChild(header);
  const overline = txt('MỘT LỜI CHÀO · MỘT CHÚT BÌNH AN',15,0xb8c7aa,'Segoe UI');overline.anchor.set(.5);overline.position.set(540,34);classicUI.addChild(overline);
  const count = txt('',21,0xd2d5b8,'Segoe UI');count.anchor.set(.5);count.position.set(540,137);classicUI.addChild(count);
  const decoration=new Graphics().moveTo(280,171).lineTo(480,171).moveTo(600,171).lineTo(800,171).stroke({color:0xc8b27a,width:1,alpha:.5}).poly([540,162,550,171,540,180,530,171]).fill(0xc8b27a);classicUI.addChild(decoration);
  function panel(x: number,y: number,w: number,h: number,title: string) {
    const container = new Container();container.position.set(x,y);
    container.addChild(new Graphics().roundRect(0,0,w,h,12).fill({color:0x203d32,alpha:.88}).roundRect(7,7,w-14,h-14,8).stroke({color:0xb49b62,alpha:.55,width:1}));
    const heading=txt(title,18,0xe3c992,'Segoe UI');heading.anchor.set(.5,0);heading.position.set(w/2,25);container.addChild(heading);classicUI.addChild(container);return container;
  }
  const guide=panel(42,475,245,231,'GHÉ VƯỜN SEN');
  const guideText=txt('Bình luận bất kỳ\nđể vào chùa\n\nCầu an → hoa sen\nLễ Phật → chắp tay',19,0xd8ddc5,'Segoe UI');guideText.style.lineHeight=29;guideText.position.set(22,64);guide.addChild(guideText);
  const register=panel(793,475,245,231,'SỔ LƯU DANH');const recent=txt('Chờ lời chào đầu tiên',18,0xd8ddc5,'Segoe UI');recent.style.lineHeight=28;recent.position.set(19,66);register.addChild(recent);
  const footer=txt('BÌNH LUẬN ĐỂ GHÉ VƯỜN SEN',19,0xeee0b4,'Segoe UI');footer.anchor.set(.5);footer.position.set(540,1863);classicUI.addChild(footer);
  const demo=txt('KHÔNG GIAN DEMO · DỮ LIỆU GIẢ LẬP',13,0xaebda0,'Segoe UI');demo.anchor.set(.5);demo.position.set(540,1894);classicUI.addChild(demo);
  const toastLayer=new Container();classicUI.addChild(toastLayer);
  const actorViews = new Map<string,ActorView>();
  let debugAt=0;let state: SceneState | undefined; let offset=0; let lastToast=''; let lastSession=''; let elapsed=0; let fps=30; let frames=0; let fpsStart=performance.now(); let quality='full';
  const effects: { root:Container; born:number; x:number;y:number }[]=[];
  // A clearly visible three-stick incense ritual; only overlay visuals are changed.
  const incenseCeremony = new IncenseCeremonyVisual();
  const giftRitualVisual = new GiftRitualVisual();
  world.addChild(incenseCeremony.layer);
  world.addChild(giftRitualVisual.layer);
  function bloom(action: SceneAction) {
      if ((state?.settings.giftTierEffects&&action.type==='GIFT_THANKS') || !state?.settings.effects || !['LOTUS_BLOOM','GIFT_THANKS','LIKE_PULSE'].includes(action.type) || effects.length>=12) return;
    const a=state.actors.find(a=>a.key===action.actorId);const seat=seats.find(s=>s.id===a?.seatId);const root=new Container();
    const x=seat?.x || 540,y=(seat?.y || 1030)-75;
    root.addChild(new Graphics().ellipse(0,18,49,14).fill({color:0xd4d8aa,alpha:.25}));
    if(action.type==='LIKE_PULSE') { root.addChild(new Graphics().ellipse(0,0,40,13).stroke({color:0xe1d4a0,width:2,alpha:.6})); }
    else for(let i=-3;i<=3;i++){const petal=new Graphics().ellipse(0,-18,13,31).fill(i%2?0xe4bdab:0xf0d7b5).stroke({color:0xffeccb,width:1});petal.rotation=i*.34;petal.x=i*5;root.addChild(petal);}
    root.addChild(new Graphics().ellipse(0,5,14,7).fill(0xecd58d));effectsLayer.addChild(root);effects.push({root,born:elapsed,x,y});
  }
  function makeActor(a:Actor) {
    if (goldenActive && makeGoldenActor) { const view = makeGoldenActor(a); actorsLayer.addChild(view.root); actorViews.set(a.key, view); return view; }
    const root=new Container(),body=new Container();root.addChild(body);
    root.addChildAt(new Graphics().ellipse(0,2,29,8).fill({color:0x19382c,alpha:.25}),0);
    const color=robeColors[a.variant%8];
    body.addChild(new Graphics().ellipse(0,-8,28,13).fill(color).roundRect(-22,-47,44,39,13).fill(color).moveTo(-15,-38).lineTo(-10,-13).moveTo(15,-38).lineTo(10,-13).stroke({color:0xe5d5aa,alpha:.35,width:2}));
    body.addChild(new Graphics().circle(0,-61,20).fill(0xd7ae85).ellipse(-20,-58,4,6).fill(0xc99c74).ellipse(20,-58,4,6).fill(0xc99c74));
    const hair=new Graphics();const style=Math.floor(a.variant/8);
    if(style===0) hair.ellipse(0,-66,20,16).fill(0x3d3830).circle(0,-83,8).fill(0x3d3830);
    else if(style===1) hair.ellipse(0,-67,21,16).fill(0x4c4337).roundRect(-18,-66,36,21,8).fill(0x4c4337);
    else if(style===2) hair.ellipse(0,-66,21,17).fill(0x64604e).roundRect(-22,-72,44,6,2).fill(0xc3b18a);
    else hair.ellipse(0,-67,21,15).fill(0x342f2d).ellipse(-14,-49,7,12).fill(0x342f2d);
    body.addChild(hair);
    const hands=new Graphics().ellipse(-22,-31,6,10).fill(0xd7ae85).ellipse(22,-31,6,10).fill(0xd7ae85);body.addChild(hands);
    const label=new Container();label.y=15;
    const text=txt(a.displayName,18,0xffefce,'Segoe UI');text.anchor.set(.5,.5);if(text.width>124)text.scale.x=124/text.width;
    label.addChild(new Graphics().roundRect(-Math.min(text.width+12,136)/2,-12,Math.min(text.width+12,136),24,6).fill({color:0x1b392f,alpha:.84}));label.addChild(text);root.addChild(label);
    actorsLayer.addChild(root);const view={root,body,label,hands,actor:a};actorViews.set(a.key,view);return view;
  }
  let audio:AudioManager;let fortuneVoice:FortuneVoice;let lanternVoice:FortuneVoice;
  const socket=connectScene('overlay',(value,actions)=>{
    state=value;offset=value.serverTime-Date.now();
    chatBubbles.update(value,actions);
    audio?.update(value,actions);
    fortuneCard.update(value);fortuneVoice?.update(value,actions);lanternVoice?.update(value,actions);
    audio?.communityBell(value,actions);
    lanternCard.update(value);
    const nextGolden = value.settings.theme === 'golden' && Boolean(golden && makeGoldenActor);
    if (goldenActive !== nextGolden) {
      actorViews.forEach(view => view.root.destroy({ children: true })); actorViews.clear();
      effects.splice(0).forEach(e => e.root.destroy({ children: true })); goldenActive = nextGolden;
    }
    seatLayer.children.forEach((c,i)=>c.visible=i<value.settings.maxActors);
    background.visible = seatLayer.visible = classicUI.visible = !goldenActive;
    if(value.settings.giftTierEffects)giftRitualVisual.reset();
    else giftRitualVisual.accept(value.sessionId, actions, value.serverTime);
    golden?.update(value, actions, goldenActive);
    if(lastSession!==value.sessionId){motionOffsets.clear();for(const e of effects)e.root.destroy({children:true});effects.length=0;lastSession=value.sessionId;lastToast=`session:${value.sessionId}`;}
    demo.text=value.mode==='tiktok'?(value.connection.fixture?'KIỂM THỬ CONNECTOR · DỮ LIỆU GIẢ LẬP':'TƯƠNG TÁC TIKTOK LIVE · KHÔNG CHÍNH THỨC'):'KHÔNG GIAN DEMO · DỮ LIỆU GIẢ LẬP';
    const active=new Set(value.actors.map(a=>a.key));
    for(const [key,view] of actorViews)if(!active.has(key)){view.root.destroy({children:true});actorViews.delete(key);motionOffsets.delete(key);}
    for(const a of value.actors){const view=actorViews.get(a.key)||makeActor(a);if(view.actor.displayName!==a.displayName){view.root.destroy({children:true});actorViews.delete(a.key);makeActor(a);}else view.actor=a;}
    header.text=value.settings.templeName;header.scale.set(1);header.scale.set(Math.min(1,940/header.width));count.text=`${value.actors.length} hiện diện   ·   ${value.total} lượt tham gia`;
    guide.visible=value.settings.showGuide;register.visible=value.settings.showRegister;recent.text=value.recent.join('\n')||'Chờ lời chào đầu tiên';
    guideText.text=value.settings.lanternEnabled?'Bình luận để vào chùa\nCầu an → hoa sen\nLễ Phật → chắp tay\nXin quẻ · Hoa đăng':'Bình luận bất kỳ\nđể vào chùa\n\nCầu an → hoa sen\nLễ Phật → chắp tay';
    const safeScale=Math.min((1080-value.settings.safeRight)/1080,(1920-value.settings.safeBottom)/1920);world.scale.set(safeScale);ui.scale.set(safeScale);
    const toastKey=value.toasts.map(t=>t.id).join(',');
    if(toastKey!==lastToast){toastLayer.removeChildren().forEach(c=>c.destroy({children:true}));lastToast=toastKey;value.toasts.forEach((toast,i)=>{const t=new Container();t.position.set(540,1435+i*68);const text=txt(toast.text,21,0xffedc3,'Segoe UI');text.anchor.set(.5);if(text.width>630)text.scale.x=630/text.width;t.addChild(new Graphics().roundRect(-340,-25,680,50,25).fill({color:0x17392e,alpha:.92}).roundRect(-340,-25,680,50,25).stroke({color:0xcab77c,width:1,alpha:.7}));t.addChild(text);toastLayer.addChild(t);});}
    if (!goldenActive) actions.forEach(bloom);
  });
  audio=new AudioManager(socket);mountAudioControls(audio);
  fortuneVoice=new FortuneVoice(audio);Object.assign(window,{__fortuneVoice:fortuneVoice});
  lanternVoice=new FortuneVoice(audio,'lantern');Object.assign(window,{__lanternVoice:lanternVoice});
  socket.on('disconnect',()=>lanternVoice.destroy());
  window.addEventListener('beforeunload',()=>lanternVoice.destroy(),{once:true});
  socket.on('disconnect',()=>fortuneVoice.destroy());
  window.addEventListener('beforeunload',()=>fortuneVoice.destroy(),{once:true});
  const telemetry=setInterval(()=>socket.emit('telemetry',{fps,quality,camera:{view:goldenActive?golden!.cameraView():'front',capture:new URLSearchParams(location.search).has('capture'),errors:golden?.cameraErrors()??{}}}),2000);
  window.addEventListener('beforeunload',()=>{clearInterval(telemetry);socket.disconnect();app.destroy(true,{children:true,texture:true});},{once:true});
  app.ticker.add(ticker=>{
    const dt=Math.min(ticker.deltaMS,100);elapsed+=dt;frames++;
    if(performance.now()-fpsStart>=2000){fps=frames*1000/(performance.now()-fpsStart);frames=0;fpsStart=performance.now();quality=fps<24||state?.settings.reducedEffects||(state?.actors.length??0)>80?'reduced':'full';}
    if(!state)return;
    const now=Date.now()+offset,s=state.settings;
    const floorPreview=goldenActive&&s.sceneSpace==='hall'&&s.templeFloorPreview;
    const actorSize=s.actorSize*(floorPreview?1.18:1);
    const cameraPoint=(v:CameraView,x:number,y:number)=>floorPreview?floorPoint(v,x,y):legacyCameraPoint(v,x,y);
    const altarFacing=(v:CameraView,x:number,y:number):CameraView=>{
      if(!floorPreview)return legacyAltarFacing(v,x,y);
      if(v==='front'||v==='wide')return 'front';
      const dx=cameraProfile(v,true).statue.x-floorPoint(v,x,y).x;
      return Math.abs(dx)<45?'front':dx>0?'left':'right';
    };
    const presentHome=(seat:ReturnType<typeof actorHome>)=>floorPreview?floorHome(seat):goldenSeat(seat);
    const ritual=goldenActive ? state.ritual : undefined;
    const cameraView:CameraView=goldenActive?golden!.cameraView():'front';
    const camera=goldenActive?cameraFrame(state,now,cameraView):{x:0,y:0,scale:1};
    const transition=goldenActive&&s.sceneSpace==='hall'&&s.cameraFade&&!s.reducedEffects&&fps>=24&&state.camera?.from&&state.camera.endsAt!==undefined&&now<state.camera.endsAt
      &&!golden!.cameraErrors()[state.camera.from]&&!golden!.cameraErrors()[cameraView]?state.camera:undefined;
    const fade=transition?Math.max(0,Math.min(1,(now-transition.startedAt!)/(transition.endsAt!-transition.startedAt!))):1;
    world.renderable=true;cameraMix.visible=false;
    const cameraActors:{apply:(v:CameraView)=>void}[]=[];
    const safeScale=Math.min((1080-s.safeRight)/1080,(1920-s.safeBottom)/1920);
    world.scale.set(safeScale*camera.scale);world.position.set(camera.x*safeScale,camera.y*safeScale);
    const anchors=new Map<string,{x:number;y:number}>();
    const donorNameBounds:Rect[]=[];
    let walkers=0;focusGlow.visible=false;
    const welcomes:{key:string;phase:string;x:number;y:number}[]=[];
    let activeOfferingPose: ReturnType<typeof offeringPose> | undefined;
    let activeOfferingHasSprites = false;
    for(const view of actorViews.values()){
      const a=view.actor,rawSeat=actorHome(a),seat=goldenActive?presentHome(rawSeat):rawSeat;const age=(now-a.statusAt)*s.animationSpeed;
      let x=seat.x,y=seat.y,scaleY=1;
      if(a.status==='enter'){x=540;y=1970;view.root.alpha=Math.min(1,age/300);}
      else if(a.status==='walk'&&a.transitionFrom){const from=goldenActive?presentHome(a.transitionFrom):a.transitionFrom;const p=Math.max(0,Math.min(1,age/2800));x=from.x+(seat.x-from.x)*p;y=from.y+(seat.y-from.y)*p;view.root.alpha=1;}
      else if(a.status==='walk'){const p=Math.max(0,Math.min(1,age/2800));const mid=.65;if(p<mid){x=540;y=1920+(seat.y-1920)*(p/mid);}else{x=540+(seat.x-540)*((p-mid)/(1-mid));y=seat.y;}view.root.alpha=1;view.body.rotation=Math.sin(elapsed/90)*.035;}
      else if(a.status==='to-standing'){const from=goldenActive?presentHome(a.transitionFrom||seat):a.transitionFrom||seat;const p=Math.max(0,Math.min(1,age/1800));x=from.x+(seat.x-from.x)*p;y=from.y+(seat.y-from.y)*p;view.root.alpha=1;}
      else if(a.status==='exit'){const p=Math.max(0,Math.min(1,age/1800));x=seat.x+(540-seat.x)*p;y=seat.y+(1940-seat.y)*p;view.root.alpha=1-p;}
      else{view.root.alpha=1;view.body.rotation=0;if(a.status==='kneel')scaleY=1-.336*Math.min(1,age/550);if(a.status==='pray')scaleY=.664-Math.sin(Math.min(1,age/1800)*Math.PI)*.08;if(a.status==='idle')scaleY=.664;}
      const ritualPose=ritual?.actorId===a.key && ritual.seatId===a.seatId
        ? offeringPose(ritual,now,seat) : undefined;
      const ritualMoving=ritualPose && ritualPose.phase!=='done';
      const welcome=!ritualMoving?welcomePose(a,seat,now,goldenActive,floorPreview):undefined;
      if(welcome){x=welcome.x;y=welcome.y;scaleY=!goldenActive&&welcome.pose==='pray'?.664:1;view.root.alpha=1;welcomes.push({key:a.key,phase:welcome.phase,x,y});}
      if(floorPreview&&a.travel){const p=a.travel.route?sampleRoute(a.travel.route,now):a.travel.from;x=p.x;y=p.y;scaleY=1;view.root.alpha=1;}
      if(floorPreview&&welcome?.phase==='waiting'&&a.welcome?.reason==='welcome')view.root.alpha=0;
      if(ritualMoving){
        x=ritualPose.x;y=ritualPose.y;scaleY=ritualPose.phase==='offer' ? .98-ritualPose.bow*.15 : 1;
        const p=cameraPoint(cameraView,ritualPose.x,ritualPose.y);activeOfferingPose={...ritualPose,x:p.x,y:p.y,scale:ritualPose.scale*p.scale};
        activeOfferingHasSprites = Boolean(view.hasOfferingSprites);
        view.root.alpha=1;view.body.rotation=ritualPose.phase==='offer'?ritualPose.bow*.06:0;
      }
      const idle=idleMotion(a,now,s.idleActivities,s.reducedEffects||floorPreview,ritual?.actorId);
      if(idle.walking)walkers++;
      const previous=motionOffsets.get(a.key)||{x:0,y:0};
      const blend=1-Math.exp(-dt/80);
      previous.x+=(idle.dx-previous.x)*blend;previous.y+=(idle.dy-previous.y)*blend;
      motionOffsets.set(a.key,previous);x+=previous.x;y+=previous.y;
      const referenceScale=ritualMoving?ritualPose.scale:welcome?.scale??seat.scale;
      // Preserve the seated reference size; never enlarge it just because the pose is standing.
      const logicalScale=goldenActive?Math.min(.70,referenceScale):referenceScale;
      const projected=cameraPoint(cameraView,x,y);
      view.presentationScale={reference:logicalScale,projection:projected.scale};
      view.root.position.set(projected.x,projected.y);view.root.scale.set(logicalScale*projected.scale);view.body.scale.y=scaleY;view.root.zIndex=projected.y;
      const ritualSprite = ritualMoving && view.hasOfferingSprites
        ? offeringSpriteFrame(ritualPose) : undefined;
      // Sample the same timeline in scene coordinates: camera zoom cannot turn people.
      const nextRitual=ritualMoving?offeringPose(ritual!,now+80,seat):undefined;
      const nextWelcome=welcome?welcomePose(a,seat,now+80,goldenActive,floorPreview):undefined;
      const from=a.transitionFrom?(goldenActive?presentHome(a.transitionFrom):a.transitionFrom):undefined;
      let dx=0,dy=0;
      if(nextRitual&&nextRitual.phase===ritualPose?.phase){dx=nextRitual.x-ritualPose.x;dy=nextRitual.y-ritualPose.y;}
      else if(nextWelcome&&nextWelcome.phase===welcome?.phase){dx=nextWelcome.x-welcome.x;dy=nextWelcome.y-welcome.y;}
      else if(a.travel?.route){const p=sampleRoute(a.travel.route,now+80);dx=p.x-x;dy=p.y-y;}
      else if(!ritualMoving&&!welcome){
        if(a.status==='exit'){dx=540-seat.x;dy=1940-seat.y;}
        else if((a.status==='walk'||a.status==='to-standing')&&from){dx=seat.x-from.x;dy=seat.y-from.y;}
        else if(a.status==='walk'&&age/2800>=.65){dx=seat.x-540;}
        else if(idle.walking){const before=idleMotion(a,now-50,s.idleActivities,s.reducedEffects||floorPreview,ritual?.actorId);dx=idle.dx-before.dx;dy=idle.dy-before.dy;}
      }
      const motion=cameraPoint(cameraView,x+dx,y+dy);dx=motion.x-projected.x;dy=motion.y-projected.y;
      const facing=actorFacing({ritualPhase:ritualPose?.phase,welcomePhase:welcome?.phase,status:a.status,deltaX:dx,deltaY:dy,
        fromY:a.transitionFrom?(goldenActive?presentHome(a.transitionFrom):a.transitionFrom).y:1920,toY:seat.y,
        idleWalking:idle.walking,idleDeltaY:idle.dy-idleMotion(a,now-50,s.idleActivities,s.reducedEffects||floorPreview,ritual?.actorId).dy});
      view.pose?.(ritualMoving?((now-ritual!.startedAt)%1800):welcome?welcome.age:(a.chantUntil??0)>now?550:a.status==='idle'?idle.age:age, logicalScale,
        ritualMoving?(ritualSprite || 'walk'):welcome?welcome.pose:a.travel?(a.travel.route?'walk':'idle'):(a.chantUntil??0)>now?'kneel':a.status==='idle'?idle.pose:undefined,facing,altarFacing(cameraView,x,y));
      view.body.scale.x*=actorSize;view.body.scale.y*=actorSize;
      if(!view.pose)view.body.scale.x=actorSize;
      if(ritualMoving&&activeOfferingPose&&view.bodyHeight)activeOfferingPose.scale*=logicalScale/referenceScale*view.bodyHeight/136;
      // Keep the donor's name above their head throughout the ceremony, including
      // the offering phase. UI cards can cover foot labels during the camera ramp.
      const tall=isStanding(a)||welcome?.pose==='walk'||idle.pose==='walk'||ritualMoving||Boolean(a.travel)||['enter','walk','exit'].includes(a.status);
      const head=goldenActive?(view.bodyHeight??(tall?136:85))*logicalScale*actorSize*projected.scale:80*seat.scale*actorSize;
      view.label.scale.set(1/(view.root.scale.x*camera.scale));
      view.label.x=0;
      view.label.y=-head/view.root.scale.y-19/(view.root.scale.y*camera.scale);
      const screenHead={x:projected.x*camera.scale+camera.x,y:(projected.y-head)*camera.scale+camera.y};
      // An oblique view can crop seats. Do not clamp their chat bubbles onto unrelated people at the frame edge.
      if(a.status!=='exit'&&view.root.alpha>0&&screenHead.x>=12&&screenHead.x<=1068&&screenHead.y>=200&&screenHead.y<=1900)anchors.set(a.key,{...screenHead,y:screenHead.y-38});
      if(ritualMoving&&ritualPose.phase==='offer'){focusGlow.visible=true;focusGlow.position.set(projected.x,projected.y+4);focusGlow.scale.set(ritualPose.scale*actorSize*projected.scale);focusGlow.zIndex=projected.y-1;}
      if(ritualMoving && ritualPose.phase==='offer') view.body.scale.y *= scaleY;
      view.label.visible=s.showLabels && view.root.alpha>0 && a.status!=='exit';
      if(ritualMoving&&view.label.visible){const b=view.label.getBounds();donorNameBounds.push({x:b.x/safeScale-6,y:b.y/safeScale-6,width:b.width/safeScale+12,height:b.height/safeScale+12});}
      view.hands.rotation=ritualMoving&&ritualPose.phase==='offer'?ritualPose.bow*.13:a.status==='pray'?Math.sin(Math.min(age/1800,1)*Math.PI)*.13:0;
      if(transition){
        const bodyScale={x:view.body.scale.x,y:view.body.scale.y};
        cameraActors.push({apply:(v)=>{
          const c=cameraFrame(state!,now,v);
          const p=cameraPoint(v,x,y);view.root.position.set(p.x,p.y);view.root.scale.set(logicalScale*p.scale);view.root.zIndex=p.y;
          view.presentationScale={reference:logicalScale,projection:p.scale};
          // Rear sprite selection is geometric; moving actors keep projected direction.
          view.pose?.(ritualMoving?((now-ritual!.startedAt)%1800):welcome?welcome.age:(a.chantUntil??0)>now?550:a.status==='idle'?idle.age:age,logicalScale,
            ritualMoving?(ritualSprite||'walk'):welcome?welcome.pose:a.travel?(a.travel.route?'walk':'idle'):(a.chantUntil??0)>now?'kneel':a.status==='idle'?idle.pose:undefined,facing,altarFacing(v,x,y));
          view.body.scale.set(bodyScale.x,bodyScale.y);
          view.label.scale.set(1/(view.root.scale.x*c.scale));
          view.label.y=-(goldenActive?(view.bodyHeight??(tall?136:85))*logicalScale*actorSize:80*seat.scale*actorSize)/logicalScale-19/(view.root.scale.y*c.scale);
          if(ritualMoving&&ritualPose.phase==='offer'){focusGlow.position.set(p.x,p.y+4);focusGlow.scale.set(ritualPose.scale*actorSize*p.scale);}
        }});
        const source=cameraPoint(transition.from!,x,y),sourceHead=projected.scale?head/projected.scale*source.scale:head;
        const c=cameraFrame(state,now,transition.from!),end=anchors.get(a.key);
        if(end)anchors.set(a.key,{x:(source.x*c.scale+c.x)*(1-fade)+end.x*fade,y:((source.y-sourceHead)*c.scale+c.y-38)*(1-fade)+end.y*fade});
      }
    }
    const arrangeNames=(c:{x:number;y:number;scale:number},updateAnchors:boolean)=>{
      const plates:NamePlate[]=[];
      for(const v of actorViews.values())if(v.root.alpha>0&&v.actor.status!=='exit'&&s.showLabels){
        const b=v.label.getLocalBounds(),scale=v.root.scale.x*c.scale*v.label.scale.x;
        const x=(v.root.x+v.label.x*v.root.scale.x)*c.scale+c.x+b.x*scale;
        const y=(v.root.y+v.label.y*v.root.scale.y)*c.scale+c.y+b.y*scale;
        plates.push({key:v.actor.key,x,y,width:b.width*scale,height:b.height*scale,seated:!v.actor.welcome&&!v.actor.travel&&v.actor.status==='idle'&&v.actor.key!==ritual?.actorId,priority:(v.actor.key===ritual?.actorId?1e15:0)+v.actor.lastActiveAt});
      }
      for(const [key,p] of layoutNames(plates)){
        const v=actorViews.get(key)!;v.label.visible=p.visible;
        v.label.x+=p.dx/(v.root.scale.x*c.scale);v.label.y+=p.dy/(v.root.scale.y*c.scale);
        const anchor=anchors.get(key);if(updateAnchors&&anchor){anchor.x+=p.dx;anchor.y+=p.dy;}
      }
    };
    arrangeNames(camera,true);
    incenseCeremony.update(now, ritual, activeOfferingPose?{...activeOfferingPose,scale:activeOfferingPose.scale*actorSize}:undefined, state.sessionId, s, quality === 'reduced', goldenActive, activeOfferingHasSprites,cameraView);
    giftRitualVisual.update(now, s, goldenActive, quality === 'reduced');
    smokeLayer.visible=!goldenActive&&s.effects&&s.smoke!==false&&s.effectIntensity>0;
    golden?.tick(dt, quality === 'reduced');
    if(transition){
      for(const [i,v] of [transition.from!,cameraView].entries()){
        const c=cameraFrame(state,now,v);world.scale.set(safeScale*c.scale);world.position.set(safeScale*c.x,safeScale*c.y);
        golden!.selectView(v);for(const a of cameraActors)a.apply(v);
        for(const a of actorViews.values())a.label.x=0;
        arrangeNames(c,false);
        const original=ritual?offeringPose(ritual,now,presentHome(actorHome(state.actors.find(a=>a.key===ritual.actorId)!))):undefined;
        const point=original?cameraPoint(v,original.x,original.y):undefined;
        incenseCeremony.update(now,ritual,original&&point?{...original,x:point.x,y:point.y,scale:original.scale*point.scale*actorSize}:undefined,state.sessionId,s,quality==='reduced',goldenActive,activeOfferingHasSprites,v);
        app.renderer.render({container:world,target:cameraFrames[i],clear:true});
      }
      cameraImages[0].alpha=1;cameraImages[1].alpha=fade*fade*(3-2*fade);cameraMix.visible=true;world.renderable=false;
    }
    fortuneCard.tick(now);Object.assign(window,{__fortuneDebug:fortuneCard.debug()});
    lanternCard.tick(now,quality==='reduced');Object.assign(window,{__lanternDebug:lanternCard.debug()});
    const presentationState:SceneState={...state,camera:{...state.camera,view:cameraView,revision:state.camera?.revision??0,stage:'automatic'}};
    giftShowVisual.tick(presentationState,now,quality==='reduced',donorNameBounds);Object.assign(window,{__giftShowDebug:giftShowVisual.debug()});
    const obstacles:Rect[]=[...donorNameBounds,...giftShowVisual.obstacles()];
    for(const card of [fortuneCard.debug(),lanternCard.debug()])if(card.visible&&card.bounds)obstacles.push(card.bounds);
    if(goldenActive)obstacles.push(...informationObstacles(state));
    communityVisuals.tick(presentationState,now,anchors,quality==='reduced');Object.assign(window,{__communityDebug:communityVisuals.debug(presentationState)});
    obstacles.push(...communityVisuals.obstacles());
    treeVisual.tick(presentationState,now,quality==='reduced'||s.reducedEffects);Object.assign(window,{__treeDebug:treeVisual.debug(presentationState)});
    chatBubbles.tick(now,anchors,obstacles);
    const focusActor=state.camera?.motion?.actorId,focusAnchor=focusActor?anchors.get(focusActor):undefined;
    focusName.visible=Boolean(goldenActive&&s.showLabels&&focusAnchor);
    if(focusAnchor&&focusActor){focusName.text=actorViews.get(focusActor)?.actor.displayName??'';focusName.position.set(focusAnchor.x,focusAnchor.y-25);const v=actorViews.get(focusActor);if(v)v.label.visible=false;}
    particles.forEach((p,i)=>{p.visible=quality==='full'||i<8;const phase=(elapsed*.00008+i/24)%1;p.x=540+Math.sin(phase*7+i)*23;p.y=858-phase*150;p.alpha=Math.sin(phase*Math.PI)*s.effectIntensity;p.scale.set(.5+phase*1.6);});
    for(let i=effects.length-1;i>=0;i--){const e=effects[i],p=(elapsed-e.born)/3200;if(p>=1||!s.effects){e.root.destroy({children:true});effects.splice(i,1);continue;}e.root.position.set(e.x,e.y-p*100);e.root.scale.set(Math.min(1,p*5));e.root.alpha=(1-p)*s.effectIntensity;}
    // Expose only synthetic scene diagnostics for repeatable local visual tests.
    if(now-debugAt>=200)Object.assign(window,{__actorFacingDebug:[...actorViews.values()].map(v=>({key:v.actor.key,variant:v.actor.variant,facing:v.facing,x:v.root.x,y:v.root.y}))});
    if(now-debugAt>=200){debugAt=now;Object.assign(window,{__sceneDebug:{floorPreview,camera,cameraView,motion:state.camera?.motion,focusName:focusName.visible?{key:focusActor,text:focusName.text,x:focusName.x,y:focusName.y,width:focusName.width,height:focusName.height}:null,fade:transition?fade:null,walkers,welcomes,bubbles:chatBubbles.debug(),actorSize:s.actorSize,theme:goldenActive?'golden':'classic',golden:golden?.debug(),actors:actorViews.size,states:[...actorViews.values()].map(v=>v.actor.status),bodies:[...actorViews.values()].map(v=>({key:v.actor.key,referenceScale:v.presentationScale?.reference,projectionScale:v.presentationScale?.projection,rootScale:v.root.scale.x,localHeight:v.bodyHeight,bodyScale:v.body.scale.x,x:v.body.getBounds().x,y:v.body.getBounds().y,width:v.body.getBounds().width,height:v.body.getBounds().height})),labels:[...actorViews.values()].filter(v=>v.label.visible).map(v=>({key:v.actor.key,name:v.actor.displayName,x:v.label.getBounds().x,y:v.label.getBounds().y,width:v.label.getBounds().width,height:v.label.getBounds().height})),effects:goldenActive?golden!.debug().effects:effects.length,ritual:state.ritual?{...state.ritual,phase:offeringPose(state.ritual,now,presentHome(actorHome(state.actors.find(a=>a.key===state!.ritual!.actorId)!))).phase}:null,fps,quality,revision:state.revision}});}
  });
}
void start().catch(error=>{document.getElementById('error')!.textContent=`Không khởi tạo được đồ hoạ. Bật tăng tốc phần cứng trong trình duyệt rồi tải lại. ${String(error)}`;console.error(error);});
