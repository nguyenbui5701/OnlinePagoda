import { Container, Graphics, Text } from 'pixi.js';
import {cleanText} from '@vuonsen/shared';
import type { CommentEffectKind, GiftConfirmed, Settings } from '@vuonsen/shared';
import {lotusPortrait} from './lotus-portrait';
import {showcaseSprite} from './showcase-art';

/** Stage 3.2.4: purely visual, lightweight gift effects. No networking or score changes. */
type GiftKind = 'rose' | 'candle' | 'heart' | 'lotus' | 'bell' | 'offering' | 'fish' | 'lantern' | 'dragon';
interface Spark {
  node: Graphics;
  x: number;
  y: number;
  phase: number;
  range: number;
}
interface ActiveEffect {
  honor?:Container; honorFlower?:Container; displayName?:string;
  root: Container;
  kind: string;
  born: number;
  duration: number;
  x: number;
  y: number;
  sparks: Spark[];
  accents: Container[];
}
const GOLD = 0xffdc83;
const CREAM = 0xfff1bf;
const PINK = 0xffa8c6;
const TAU = Math.PI * 2;

function aura(radius: number, color = GOLD): Graphics {
  return new Graphics()
    .circle(0, 0, radius).fill({ color, alpha: .07 })
    .circle(0, 0, radius * .69).fill({ color, alpha: .11 })
    .circle(0, 0, radius * .4).fill({ color: CREAM, alpha: .13 });
}
function lightRing(rx: number, ry = rx * .3): Graphics {
  return new Graphics().ellipse(0, 0, rx, ry).stroke({ color: GOLD, width: 3, alpha: .7 });
}
function lotus(size = 1): Container {
  const flower = new Container(); flower.scale.set(size);
  flower.addChild(new Graphics().ellipse(0, 14, 43, 10).fill({ color: GOLD, alpha: .25 }));
  for (let i = -4; i <= 4; i++) {
    const petal = new Graphics()
      .moveTo(0, 9).bezierCurveTo(-23, -11, -17, -44, 0, -64)
      .bezierCurveTo(17, -44, 23, -11, 0, 9).closePath()
      .fill(i % 2 ? 0xe46d99 : PINK)
      .stroke({ color: CREAM, width: 1.4, alpha: .9 });
    petal.rotation = i * .26; petal.x = i * 5;
    flower.addChild(petal);
  }
  flower.addChild(new Graphics().ellipse(0, -3, 17, 8).fill(CREAM));
  return flower;
}
function candle(): Container {
  const illustrated=showcaseSprite('candle',58,104);if(illustrated){illustrated.y=-24;return illustrated;}
  const holder = new Container();
  holder.addChild(new Graphics()
    .ellipse(0, 10, 24, 7).fill(0x85502b)
    .roundRect(-12, -30, 24, 40, 5).fill(0xe8a64b).stroke({ color: CREAM, width: 1 })
    .ellipse(0, -43, 11, 23).fill({ color: GOLD, alpha: .72 })
    .ellipse(0, -44, 5, 13).fill(CREAM));
  return holder;
}
function heartShape(): Graphics {
  return new Graphics().moveTo(0, 16)
    .bezierCurveTo(-45, -10, -30, -46, 0, -18)
    .bezierCurveTo(30, -46, 45, -10, 0, 16)
    .fill(0xffb47a).stroke({ color: CREAM, width: 3 });
}
function bellShape(): Container {
  const illustrated=showcaseSprite('bell',88,132);if(illustrated){illustrated.y=-18;return illustrated;}
  const bell = new Container();
  bell.addChild(new Graphics()
    .circle(0, -65, 8).fill(0xb7782c)
    .moveTo(-44, 14).quadraticCurveTo(-27, -20, -25, -53)
    .quadraticCurveTo(0, -82, 25, -53).quadraticCurveTo(27, -20, 44, 14)
    .closePath().fill(0xd5a346).stroke({ color: CREAM, width: 3 })
    .ellipse(0, 14, 46, 9).fill(GOLD)
    .circle(0, 32, 9).fill(0xa76b29)
    .moveTo(-18, -46).quadraticCurveTo(-24, -8, -14, 3)
    .stroke({ color: 0xfff1ce, width: 6, alpha: .55 }));
  return bell;
}
function fishShape(): Container {
  const illustrated=showcaseSprite('fish',144,74);if(illustrated)return illustrated;
  const fish = new Container();
  fish.addChild(new Graphics()
    .poly([-35, 0, -70, -25, -60, 0, -70, 25]).fill(0xdb8c37)
    .ellipse(0, 0, 43, 20).fill(GOLD).stroke({ color: CREAM, width: 1.5 })
    .poly([0, -15, 16, -35, 27, -10]).fill(0xd99b46)
    .ellipse(27, -4, 4, 4).fill(0x4e291c)
    .moveTo(-12, -6).quadraticCurveTo(3, 4, 15, -4).stroke({ color: 0xc28337, width: 2 }));
  return fish;
}
function lantern(): Container {
  const light = new Container();
  light.addChild(aura(52, 0xffac5c));
  const petals = lotus(.53); petals.y = 20; light.addChild(petals);
  light.addChild(new Graphics()
    .roundRect(-13, -30, 26, 49, 8).fill({ color: 0xffc978, alpha: .94 })
    .roundRect(-10, -27, 20, 42, 6).stroke({ color: CREAM, width: 1.5 })
    .ellipse(0, -14, 5, 15).fill(CREAM));
  return light;
}
function dragon(side: number): Container {
  const illustrated=showcaseSprite('dragon',240,500);
  if(illustrated){illustrated.position.set(side*130,-12);if(side===1)illustrated.scale.x*=-1;return illustrated;}
  // A stylized gold guardian dragon along the shrine's sides, not over Buddha's face.
  const d = new Container();
  const x = side * 215;
  const body = new Graphics();
  // Restroke an explicit path per layer; thick dark edging separates gold from the shrine.
  for(const [color,width] of [[0x3a1a12,47],[0xf4a72e,38],[0xffdd72,25],[0xfff5cf,8]])
    body.moveTo(x + side * 6, -205)
      .bezierCurveTo(x + side * 100, -115, x - side * 80, -65, x + side * 30, 20)
      .bezierCurveTo(x + side * 118, 92, x - side * 50, 166, x + side * 19, 240)
      .stroke({color,width,cap:'round'});
  d.addChild(body);
  d.addChild(new Graphics()
    .ellipse(x, -206, 37, 24).fill(GOLD).stroke({ color: 0x492218, width: 4 })
    .poly([x - side * 15, -226, x - side * 5, -262, x + side * 6, -224]).fill(0xe59d36)
    .poly([x + side * 19, -218, x + side * 25, -252, x + side * 32, -217]).fill(0xe59d36)
    .ellipse(x + side * 24, -208, 8, 5).fill(0x783f25)
    .circle(x - side * 16, -213, 4).fill(0x7a2319)
    .moveTo(x - side * 12, -190).quadraticCurveTo(x - side * 64, -181, x - side * 86, -195)
    .stroke({ color: CREAM, width: 2 }));
  for (let i = 0; i < 5; i++) {
    const yy = -85 + i * 61;
    const xx = x + side * (i % 2 ? -25 : 28);
    d.addChild(new Graphics().poly([xx, yy, xx + side * 13, yy - 24, xx + side * 18, yy + 3]).fill(0xf5cc76));
  }
  return d;
}

function offeringShape(){
  const illustrated=showcaseSprite('offering',240,160);if(illustrated)return illustrated;
  const body=new Container();
  body.addChild(new Graphics().roundRect(-30,22,60,32,5).fill(0x8e4a20).stroke({color:0x2f170f,width:3})
    .ellipse(0,26,103,21).fill(0xb67533).stroke({color:0x2f170f,width:3})
    .ellipse(0,16,110,22).fill(0xffdf83).stroke({color:0x492218,width:3})
    .ellipse(0,13,94,12).stroke({color:CREAM,width:3}));
  const colors=[0xeb3e50,0xffcc35,0x7bbd39,0xff923b,0xb39aeb];
  for(let i=0;i<5;i++){
    const fruit=new Graphics().ellipse(0,0,25,i===2?34:28).fill(colors[i]).stroke({color:0x49301c,width:2.5})
      .ellipse(-7,-10,6,10).fill({color:CREAM,alpha:.65}).moveTo(0,-26).lineTo(1,-35).stroke({color:0x43321b,width:3})
      .ellipse(7,-31,9,4).fill(0x3c803d).stroke({color:0xcde68a,width:1});
    fruit.position.set((i-2)*39,i===2?-38:i%2?-19:-27);body.addChild(fruit);
  }
  return body;
}

/** Gift artwork without its glow, particle budget, scoring or playback controller. */
export function makeCommentArtwork(kind:CommentEffectKind,displayName?:string,avatarUrl?:string):Container {
  switch(kind){
    case 'phoenix':return showcaseSprite('phoenix',220,360)||dragon(-1);
    case 'long-phung':{
      const c=new Container(),d=dragon(-1),p=showcaseSprite('phoenix',220,460)||dragon(1);p.x=130;c.addChild(d,p);return c;
    }
    case 'sen-heart':case 'sen-fish':case 'sen-candle':{
      const c=new Container(),flower=lotusPortrait(undefined,undefined,false);flower.scale.set(.7);c.addChild(flower);
      for(const side of [-1,1]){const a=kind==='sen-heart'?heartShape():kind==='sen-fish'?fishShape():candle();a.position.set(side*140,0);a.scale.set(.7);c.addChild(a);}c.label='lotus:plain';return c;
    }
    case 'candle':return candle();
    case 'heart':return heartShape();
    case 'lotus':return lotusPortrait(undefined,undefined,false);
    case 'bell':return bellShape();
    case 'offering':return offeringShape();
    case 'fish':return fishShape();
    case 'dragon':{const pair=new Container();for(const side of [-1,1]){const d=dragon(side);d.scale.x*=1.3;pair.addChild(d);}return pair;}
  }
}

export function makeVisualEffect(kind: string, units: number, reduced: boolean,displayName?:string,avatarUrl?:string): ActiveEffect {
  const root = new Container();
  const n = reduced ? 1 : Math.min(3, Math.max(1, Math.floor(units)));
  const sparks: Spark[] = [], accents: Container[] = [];
  let x = 540, y = 1010, duration = 3600;
  const addSparks = (count: number, radius = 85) => {
    for (let i = 0; i < count; i++) {
      const phase = i * 2.3999632297;
      const r = radius * (.3 + .7 * ((i * 7 % 11) / 11));
      const point = new Graphics().circle(0, 0, i % 4 === 0 ? 4 : 2.5)
        .fill(i % 3 === 0 ? CREAM : GOLD);
      const baseX = Math.cos(phase) * r, baseY = Math.sin(phase) * r * .6;
      point.position.set(baseX, baseY); root.addChild(point);
      sparks.push({ node: point, x: baseX, y: baseY, phase, range: 23 + i % 5 * 9 });
    }
  };
  const glow = (radius: number, color = GOLD) => root.addChild(aura(radius, color));
  switch (kind as GiftKind) {
    case 'rose':
    case 'candle': {
      x = 346; y = 917; duration = 3500;
      glow(110, 0xffa84b);
      for (let i = 0; i < n; i++) {
        const c = candle(); c.x = (i - (n - 1) / 2) * 40; root.addChild(c); accents.push(c);
      }
      if (kind === 'rose') {
        for (let i = 0; i < (reduced ? 3 : 7); i++) {
          const p = new Graphics().ellipse(0, 0, 6, 12).fill(i % 2 ? 0xe3698c : PINK);
          p.position.set((i - 3) * 19, -95 - i % 2 * 13); p.rotation = i * .4;
          root.addChild(p); accents.push(p);
        }
      }
      addSparks(reduced ? 4 : 10); break;
    }
    case 'heart': {
      x = 730; y = 890; duration = 3200;
      glow(112, 0xffc35c); const h = heartShape(); h.scale.set(1.3); root.addChild(h); accents.push(h);
      root.addChild(new Graphics().roundRect(-17, 23, 34, 52, 5).fill(0xe09b3f)
        .ellipse(0, 12, 9, 19).fill(CREAM));
      addSparks(reduced ? 4 : 12); break;
    }
    case 'lotus': {
      x = 540; y = 895; duration = 4400;
      glow(175, PINK);
      const fl=lotusPortrait(displayName,avatarUrl);fl.scale.set(1.35);root.addChild(fl);accents.push(fl);
      addSparks(reduced ? 4 : 16, 160); break;
    }
    case 'bell': {
      x = 729; y = 901; duration = 3900;
      glow(132); const bell = bellShape(); root.addChild(bell); accents.push(bell);
      for (let i = 0; i < (reduced ? 1 : 3); i++) {
        const ring = lightRing(58 + i * 22, 65 + i * 19); root.addChildAt(ring, 0); accents.push(ring);
      }
      addSparks(reduced ? 5 : 12); break;
    }
    case 'offering': {
      x = 540; y = 920; duration = 4000;
      glow(140);
      const offering=offeringShape();offering.scale.set(1.8);root.addChild(offering);accents.push(offering);
      addSparks(reduced ? 4 : 10); break;
    }
    case 'fish': {
      x = 486; y = 1480; duration = 5200;
      root.addChild(new Graphics().ellipse(0, 0, 155, 38).fill({ color: 0x69bcc0, alpha: .18 }));
      for (let i = 0; i < (reduced ? 1 : 2); i++) {
        const fish = fishShape(); fish.x = i * 110 - 60; fish.y = i * 26; fish.scale.set(i ? .8 : 1);
        root.addChild(fish); accents.push(fish);
      }
      for (let i = 0; i < (reduced ? 1 : 3); i++) {
        const ring = lightRing(45 + i * 31, 13 + i * 10); root.addChildAt(ring, 0); accents.push(ring);
      }
      addSparks(reduced ? 3 : 8, 105); break;
    }
    case 'lantern': {
      x = 540; y = 1640; duration = 5700;
      for (let i = 0; i < (reduced ? 1 : 3); i++) {
        const l = lantern(); l.x = (i - 1) * 120; l.y = i % 2 * 65;
        root.addChild(l); accents.push(l);
      }
      addSparks(reduced ? 5 : 16, 135); break;
    }
    case 'dragon': {
      x = 540; y = 645; duration = 6500;
      glow(185);
      for (const side of [-1, 1]) { const d = dragon(side); root.addChild(d); accents.push(d); }
      addSparks(reduced ? 5 : 16, 210); break;
    }
    default: {
      glow(115); root.addChild(lotus(.9)); addSparks(reduced ? 3 : 8);
    }
  }
  root.position.set(x, y);
  return { root, kind, born: 0, duration, x, y, sparks, accents };
}

export class GiftEffectManager {
  readonly layer = new Container();
  private active: ActiveEffect[] = [];
  private queue: GiftConfirmed[] = [];
  private seen = new Set<string>();
  private elapsed = 0;
  skipped = 0;

  enqueue(gift: GiftConfirmed, settings: Settings): void {
    if (this.seen.has(gift.eventKey)) return;
    this.seen.add(gift.eventKey);
    if (this.seen.size > 2048) this.seen.delete(this.seen.values().next().value!);
    if (!settings.effects || !settings.showGiftThanks ||
      (gift.mappedEffect === 'lotus' && !settings.flowers) ||
      (['rose', 'candle', 'heart'].includes(gift.mappedEffect) && !settings.candles)) return;
    if (this.queue.length >= 20) { this.queue.shift(); this.skipped++; }
    this.queue.push(gift);
    const priority = (g: GiftConfirmed) => g.mappedEffect === 'dragon' ? 2 : g.mappedEffect === 'lantern' ? 1 : 0;
    this.queue.sort((a, b) => priority(b) - priority(a));
  }

  clear(): void {
    for (const a of this.active) {a.root.destroy({ children: true });a.honor?.destroy({children:true});}
    this.active = []; this.queue = []; this.seen.clear();
  }

  tick(dt: number, settings: Settings, lowFps: boolean): void {
    this.elapsed += Math.max(0, dt);
    if (!settings.effects || !settings.showGiftThanks || settings.effectIntensity === 0) { this.clear(); return; }
    const reduced = settings.reducedEffects || lowFps;
    // One named celebration at a time so two donor portraits cannot obscure each other.
    while (this.queue.length && this.active.length < 1) {
      const gift = this.queue.shift()!, kind = gift.mappedEffect;
      if ((kind === 'lotus' && !settings.flowers) ||
        (['rose', 'candle', 'heart'].includes(kind) && !settings.candles)) continue;
      const effect = makeVisualEffect(kind, gift.units, reduced,gift.displayName,gift.avatarUrl);
      effect.displayName=cleanText(gift.displayName);
      if(kind!=='lotus'&&settings.flowers){
        const honor=new Container(),flower=lotusPortrait(gift.displayName,gift.avatarUrl);flower.scale.set(1.35);honor.addChild(flower);
        const label=new Text({text:effect.displayName,style:{fontFamily:'Segoe UI',fontSize:24,fontWeight:'600',fill:0xffefd2,stroke:{color:0x25120b,width:5}}});label.anchor.set(.5);label.y=203;honor.addChild(label);
        effect.honor=honor;effect.honorFlower=flower;effect.duration=6600;honor.visible=false;this.layer.addChild(honor);
      }
      effect.born = this.elapsed;
      this.layer.addChild(effect.root);
      this.active.push(effect);
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      const p = Math.max(0, (this.elapsed - a.born) / a.duration);
      if (p >= 1 || (a.honor&&!settings.flowers&&this.elapsed-a.born>=2200) || (a.kind === 'lotus' && !settings.flowers) ||
        (['rose', 'candle', 'heart'].includes(a.kind) && !settings.candles)) {
        a.root.destroy({ children: true });a.honor?.destroy({children:true}); this.active.splice(i, 1); continue;
      }
      if(a.honor){
        const age=this.elapsed-a.born,h=Math.max(0,(age-2200)/4400);
        a.root.visible=age<2200;a.honor.visible=age>=2200&&settings.flowers;
        a.honor.alpha=Math.max(0,Math.min(1,h*7,(1-h)*5))*Math.sqrt(settings.effectIntensity);
        a.honor.scale.set(Math.min(1,.7+h*2.5));a.honor.position.set(540,895-(reduced?0:Math.min(1,h/.8)*155));
      }
      const ease = Math.sin(Math.PI * p);
      const fadeIn = Math.min(1, p * 7);
      const fadeOut = Math.min(1, (1 - p) * 5);
      a.root.alpha = Math.max(0, Math.min(fadeIn, fadeOut)) * Math.sqrt(settings.effectIntensity);
      if(a.honor)a.root.alpha*=Math.max(0,Math.min(1,(2200-(this.elapsed-a.born))/300));
      a.root.scale.set(Math.min(1, .7 + p * 2.5));
      a.root.position.set(a.x, a.y);
      switch (a.kind) {
        case 'rose': case 'candle':
          a.root.y -= ease * 12;
          a.accents.forEach((v, j) => { v.rotation = Math.sin(p * 22 + j) * .035; });
          break;
        case 'heart': a.root.y -= ease * 30; if (a.accents[0]) a.accents[0].scale.set(1.25 + ease * .15); break;
        case 'lotus': a.root.y -= reduced?0:Math.min(1,p/.8)*155; break;
        case 'bell':
          if (a.accents[0]) a.accents[0].rotation = Math.sin(p * 38) * .22 * (1 - p);
          a.accents.slice(1).forEach((v, j) => { v.scale.set(.8 + ((p * 2 + j / 3) % 1) * .5); v.alpha = .15 + ease * .4; });
          break;
        case 'offering': a.root.y -= ease * 48; break;
        case 'fish':
          a.root.x += Math.sin(p * TAU * 1.3) * 78;
          a.root.y -= p * 85;
          a.accents.forEach((v, j) => {
            if (j < (reduced ? 1 : 2)) v.rotation = Math.sin(p * 21 + j * 1.7) * .08;
            else { v.scale.set(.8 + p * .65); v.alpha = .65 * (1 - p); }
          });
          break;
        case 'lantern':
          a.root.y -= p * 360;
          a.root.x += Math.sin(p * TAU * 1.2) * 22;
          a.accents.forEach((v, j) => { v.rotation = Math.sin(p * 8 + j * 1.7) * .06; });
          break;
        case 'dragon':
          a.root.y -= ease * 15;
          a.accents.forEach((v, j) => { v.x = Math.sin(p * 7 + j * 2.4) * 9; });
          break;
      }
      for (const s of a.sparks) {
        s.node.position.set(s.x + Math.sin(p * 9 + s.phase) * 12,
          s.y - p * s.range);
        s.node.alpha = Math.max(0, Math.sin(Math.PI * Math.min(1, p * 1.15))) * (.45 + .45 * Math.sin(p * 18 + s.phase) ** 2);
      }
    }
  }

  debug() {
    return { active: this.active.map(a => a.kind), queued: this.queue.length, skipped: this.skipped,
      portraits:this.active.filter(a=>a.kind==='lotus'||a.honor?.visible).map(a=>({kind:a.kind,displayName:a.displayName,status:a.kind==='lotus'?a.accents[0]?.label:a.honorFlower?.label,y:(a.honor||a.root).y,alpha:(a.honor||a.root).alpha})) };
  }
}
