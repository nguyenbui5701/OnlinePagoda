/** Stage 3.2.5EF. Gift visuals are fully independent of actor motion/ritual queue.
 * Created ONLY for server-confirmed gifts, with a bounded queue and reduced-FPS mode.
 */
import { Container, Graphics } from 'pixi.js';
import type { GiftConfirmed, SceneAction, Settings } from '@vuonsen/shared';
import type { RitualKind } from './gift-ritual-motion';

const PI = Math.PI;
const TAU = PI * 2;
const GOLD = 0xffd277, CREAM = 0xffeccc, WHITE = 0xffffff;
const LIGHT = 0xffedb0, PINK = 0xff9ebd;
interface GiftBurst { key: string; kind: RitualKind; at: number; duration: number }
const ALL: readonly RitualKind[] = ['rose','candle','heart','lotus','bell','offering','fish','lantern','dragon'];

export class GiftRitualVisual {
  readonly layer = new Container();
  private graphics = new Graphics();
  private active: GiftBurst[] = [];
  private seen = new Set<string>();
  private session = '';
  constructor() { this.layer.addChild(this.graphics); }
  reset() { this.active = []; this.seen.clear(); this.graphics.clear(); }

  /** Fired as soon as the gift is confirmed, even when its donor is still queued. */
  accept(session: string, actions: readonly SceneAction[], at: number): void {
    if (this.session !== session) { this.session = session; this.reset(); }
    for (const a of actions) {
      if (a.type !== 'GIFT_CONFIRMED' || !a.confirmedGift) continue;
      const gift: GiftConfirmed = a.confirmedGift;
      if (this.seen.has(gift.eventKey)) continue;
      this.seen.add(gift.eventKey);
      if (this.seen.size > 256) this.seen.delete(this.seen.values().next().value!);
      const kind: RitualKind = ALL.includes(gift.mappedEffect) ? gift.mappedEffect : 'rose';
      if (this.active.length >= 6) this.active.shift();
      this.active.push({ key: gift.eventKey, kind, at, duration: kind === 'dragon' ? 7500 : 3500 });
    }
  }

  update(now: number, settings: Settings, goldenActive: boolean, lowFps: boolean): void {
    const g = this.graphics;
    g.clear();
    this.active = this.active.filter(e => now >= e.at - 250 && now - e.at < e.duration);
    this.layer.visible = goldenActive && settings.effects && settings.effectIntensity > 0;
    if (!this.layer.visible) return;
    const reduced = lowFps || settings.reducedEffects;
    for (const e of this.active) {
      const p = Math.max(0, Math.min(1, (now - e.at) / e.duration));
      const inAlpha = Math.min(1, p * 10), outAlpha = Math.min(1, (1-p) * 4);
      const alpha = Math.max(0, Math.min(inAlpha, outAlpha)) * settings.effectIntensity;
      if (e.kind === 'dragon') this.dragonBlessing(g, p, alpha, reduced);
      else this.smallGiftGlow(g, e.kind, p, alpha, reduced);
    }
  }

  /** Halo around the altar, separate from existing gift-specific effects. */
  private smallGiftGlow(g: Graphics, kind: RitualKind, p: number, alpha: number, reduced: boolean) {
    const tint = kind === 'lotus' ? PINK : kind === 'fish' ? 0x8bd9db : GOLD;
    const x = 540, y = 987;
    const pulse = .6 + .4 * Math.sin(p * PI * 6) ** 2;
    g.ellipse(x, y, 85 + p * 82, 28 + p * 31)
      .stroke({ color: tint, width: 3, alpha: alpha * .35 * (1-p) });
    g.ellipse(x, y, 45 + 12*p, 13 + 4*p)
      .fill({ color: tint, alpha: alpha * .12 * pulse });
    const count = reduced ? 3 : 9;
    for(let i=0;i<count;i++) {
      const a = i * 2.399963 + p * 2.2;
      const x1=x+Math.cos(a)*(44+i%4*14), y1=y-20-p*80+Math.sin(a)*20;
      g.circle(x1,y1,i%3===0?3.5:2).fill({color:i%3?GOLD:CREAM,alpha:alpha*.65});
    }
  }

  /** Grand dragon blessing: layered golden luminance with deliberately slow pulses (no strobe). */
  private dragonBlessing(g: Graphics, p: number, alpha: number, reduced: boolean) {
    const pulse = .83 + .17 * Math.sin(p * TAU * 1.25) ** 2;
    // Radiant warm-gold halo; frame of Buddha remains readable at the centre.
    for (let i=3;i>=0;i--) {
      const r = 175 + i * 43 + 11 * Math.sin(p * TAU * 2);
      g.ellipse(540, 724, r, r * 1.05).stroke({ color: i % 2 ? GOLD : LIGHT,
        width: 4 + (3-i)*2, alpha: alpha * (.075 + (3-i)*.035) * pulse });
    }
    g.circle(540, 724, 145).fill({color: GOLD, alpha: alpha * .035 * pulse});
    // Warmly illuminated side pillars frame the blessing but never cover Buddha's face.
    for (const side of [-1, 1]) {
      const bx = 540 + side * 345;
      for(let n=0;n<3;n++) {
        const w = 42 + n * 26;
        g.roundRect(bx-w/2, 470, w, 505, w/2)
          .fill({color:n===0?0xffde86:0xffad37,alpha:alpha*(.048-n*.010)*pulse});
      }
      for(let n=0;n<4;n++) {
        const y=526+n*125;
        const drift=Math.sin(p*TAU*.8+n*2+side)*18;
        g.ellipse(bx+drift,y,18+n%2*7,5)
          .fill({color:CREAM,alpha:alpha*(.20+n*.025)});
      }
    }
    // A ring of soft rotating rays around the statue, with clear center transparency.
    for(let i=0;i<(reduced?8:18);i++) {
      const a=(i/(reduced?8:18))*TAU+p*.28;
      const cx=540+Math.cos(a)*210, cy=724+Math.sin(a)*245;
      const ex=540+Math.cos(a)*300, ey=724+Math.sin(a)*335;
      g.moveTo(cx,cy).lineTo(ex,ey)
        .stroke({color:i%3===0?CREAM:GOLD,width:i%4===0?5:2,alpha:alpha*.17*pulse});
    }
    // Two stylized guardian dragons surround the Buddha without covering the face.
    for (const side of [-1, 1]) {
      const x = 540 + side * 235;
      const sway = Math.sin(p*TAU*1.6 + side) * 15;
      const startY=492+p*26;
      g.moveTo(x+side*22, startY)
        .bezierCurveTo(x+side*95+sway, 585, x-side*40, 680, x+side*42, 762)
        .bezierCurveTo(x+side*105, 825, x-side*35+sway, 891, x+side*28, 963)
        .stroke({color:0xffa13c,width:reduced?19:34,alpha:alpha*.10});
      g.moveTo(x+side*22, startY)
        .bezierCurveTo(x+side*95+sway, 585, x-side*40, 680, x+side*42, 762)
        .bezierCurveTo(x+side*105, 825, x-side*35+sway, 891, x+side*28, 963)
        .stroke({color:0xffd26f,width:reduced?9:17,alpha:alpha*.82});
      g.moveTo(x+side*22,startY)
        .bezierCurveTo(x+side*95+sway,585,x-side*40,680,x+side*42,762)
        .bezierCurveTo(x+side*105,825,x-side*35+sway,891,x+side*28,963)
        .stroke({color:CREAM,width:reduced?3:5,alpha:alpha*.72});
      // Dragon heads, snouts, horns, glowing eyes and whiskers.
      const hx=x+side*23, hy=startY-12;
      g.ellipse(hx,hy,29,19).fill({color:GOLD,alpha});
      g.poly([hx-side*18,hy-8,hx-side*11,hy-45,hx-side*4,hy-14]).fill({color:LIGHT,alpha});
      g.poly([hx+side*10,hy-13,hx+side*18,hy-47,hx+side*23,hy-6]).fill({color:LIGHT,alpha});
      g.ellipse(hx+side*23,hy+7,20,9).fill({color:0xf4aa42,alpha});
      g.circle(hx+side*6,hy-5,3).fill({color:WHITE,alpha});
      g.moveTo(hx+side*10,hy+9).quadraticCurveTo(hx+side*56,hy+22,hx+side*82,hy+2)
        .stroke({color:LIGHT,width:2,alpha:alpha*.85});
      // The dragon carries a glowing pearl. Slow breathing brightness, never a hard flash.
      const orbX=hx+side*78, orbY=hy+70+Math.sin(p*TAU)*6;
      g.circle(orbX,orbY,19).fill({color:0xffbb48,alpha:alpha*.09*pulse});
      g.circle(orbX,orbY,10).fill({color:LIGHT,alpha:alpha*.42*pulse});
      g.circle(orbX,orbY,4).fill({color:WHITE,alpha:alpha*.8*pulse});
      for(let i=0;i<(reduced?3:6);i++) {
        const y=628+i*52, bx=x+side*(i%2?48:12);
        g.poly([bx,y,bx+side*14,y-22,bx+side*20,y+5]).fill({color:CREAM,alpha:alpha*.65});
      }
    }
    // Glowing particles and spreading wave rings, not a rapid full-screen flash.
    for(let i=0;i<(reduced?9:32);i++){
      const a=i*2.39996+p*TAU*.65, radius=160+(i%7)*40+p*60;
      const x=540+Math.cos(a)*radius,y=744+Math.sin(a)*radius*.9-p*45;
      const flicker=.60+.40*Math.sin(p*TAU*2+i)**2;
      g.circle(x,y,i%5===0?5:2.5).fill({color:i%4===0?WHITE:GOLD,alpha:alpha*flicker*.83});
    }
    // Small falling golden lotus motes are intentionally slow and bounded.
    for(let i=0;i<(reduced?3:10);i++) {
      const f=(p*.7+i/10)%1;
      const lx=540+Math.sin(i*2.4+p*3)*Math.min(390,140+i*32);
      const ly=490+f*590;
      g.ellipse(lx,ly,2+(i%3),5+(i%2)*2)
        .fill({color:i%2?LIGHT:CREAM,alpha:alpha*.44*(1-f)});
    }
    for(let i=0;i<(reduced?1:3);i++){
      const rp=(p*1.8+i/3)%1;
      g.ellipse(540,1040,70+rp*350,25+rp*110).stroke({color:GOLD,width:3,alpha:alpha*(1-rp)*.29});
    }
  }
  debug() { return { active: this.active.map(a => a.kind), pending: this.active.length }; }
}
