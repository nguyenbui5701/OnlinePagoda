/** Local PixiJS incense visuals. No new actor, scoring change, or server event. */
import { Container, Graphics } from 'pixi.js';
import {cameraProfile, type CameraView, type OfferingRitual, type Settings } from '@vuonsen/shared';
import type { OfferingPose } from './offering-ritual';

interface Planted { key: string; placedAt: number; offset: number }
const PERSIST_MS = 24000;
const PLANT_AFTER_MS = 4041; // 1.25x ritual speed; visual stick remains in urn
const MAX_PLANTED = 5;

export class IncenseCeremonyVisual {
  readonly layer = new Container();
  private spot = new Graphics();
  private held = new Graphics();
  private plantedArt = new Graphics();
  private planted: Planted[] = [];
  private sessionId = '';
  constructor() {
    this.layer.addChild(this.spot, this.plantedArt, this.held);
  }
  clear() {
    this.planted = [];
    this.spot.clear();
    this.plantedArt.clear();
    this.held.clear();
    this.held.visible = false;
  }
  update(now: number, ritual: OfferingRitual | undefined, pose: OfferingPose | undefined,
    sessionId: string, settings: Settings, reduced: boolean, goldenActive: boolean, hasOfferingSprites = false, cameraView:CameraView='front') {
    if (this.sessionId !== sessionId) { this.sessionId = sessionId; this.clear(); }
    if (ritual && pose?.incensePlanted && now < ritual.startedAt+ritual.durationMs) {
      const key = `${sessionId}:${ritual.actorId}:${ritual.startedAt}`;
      if (!this.planted.some(p => p.key === key)) {
        const j=ritual.journey,placedAt=j?j.arrivedAt+(j.departAt-j.arrivedAt)*1900/2750:ritual.startedAt+PLANT_AFTER_MS;
        this.planted.push({ key, placedAt, offset: (this.planted.length % 3 - 1) * 11 });
        if (this.planted.length > MAX_PLANTED) this.planted.shift();
      }
    }
    this.planted = this.planted.filter(p => now >= p.placedAt && now - p.placedAt < PERSIST_MS);
    this.layer.visible = settings.theme === 'golden' && goldenActive;
    if (!this.layer.visible) return;
    this.spot.clear();
    this.held.clear();
    this.held.visible = !hasOfferingSprites && Boolean(pose?.carryingIncense && ritual);
    if (pose && ritual) this.drawStandingSpot(pose, now);
    if (this.held.visible && pose) this.drawHeld(pose, now);
    this.drawPlanted(now, settings, reduced,cameraView);
  }
  private drawStandingSpot(p: OfferingPose, now: number) {
    if (p.phase !== 'offer') return;
    const pulse = 0.18 + 0.05 * Math.sin(now / 240);
    this.spot.ellipse(p.x, p.y + 10 * p.scale, 23 * p.scale, 8 * p.scale)
      .fill({ color: 0xffd58c, alpha: pulse });
  }
  private drawHeld(p: OfferingPose, now: number) {
    // Rear-facing actors: the hands/forearms are in front of their body, away
    // from the camera. Do not paint an extra fake arm across the actor's back.
    // Show only the three small incense tips rising above the silhouette.
    const g = this.held;
    const scale = p.scale;
    const raise = Math.max(0, Math.min(1, p.handRaise));
    const x = p.x;
    const gripY = p.y - (126 + 25 * raise + 9 * p.armReach) * scale;
    const flutter = Math.sin(now / 330) * .25;
    // An unobtrusive grip glimmer, not a separately visible third hand.
    g.ellipse(x, gripY + 2 * scale, 9 * scale, 3 * scale)
      .fill({ color: 0xf2c985, alpha: .3 });
    for (const dx of [-1, 0, 1]) {
      const xx = x + dx * 6 * scale;
      const topY = gripY - (21 - Math.abs(dx) * 2) * scale + flutter;
      g.moveTo(xx, gripY + 2 * scale).lineTo(xx, topY)
        .stroke({ color: 0x593719, width: Math.max(1.8, 2.5 * scale) });
      g.moveTo(xx, topY + 3 * scale).lineTo(xx, topY)
        .stroke({ color: 0xe46b43, width: 3 * scale });
      g.circle(xx, topY, Math.max(1.6, 2.4 * scale))
        .fill({ color: 0xffc979, alpha: .85 });
    }
  }
  private drawPlanted(now: number, settings: Settings, reduced: boolean,view:CameraView) {
    const g = this.plantedArt; g.clear();
    const intensity = settings.effectIntensity;
    for (const [index, p] of this.planted.entries()) {
      const fade = Math.max(0, Math.min(1, (PERSIST_MS - (now - p.placedAt)) / 2500));
      const urn=cameraProfile(view,settings.templeFloorPreview&&settings.sceneSpace==='hall').urn,ratio=urn.width/295;
      const cx = urn.x + p.offset*ratio, baseY = urn.y-44*ratio;
      for (let i = -1; i <= 1; i++) {
        const xx = cx + i * 7;
        const tipY = urn.y-(82-i*4)*ratio;
        g.moveTo(xx + i, baseY).lineTo(xx, tipY).stroke({ color: 0x75401c, width: 3, alpha: fade });
        g.moveTo(xx, tipY + 3).lineTo(xx, tipY).stroke({ color: 0xf4774d, width: 4, alpha: fade });
        g.circle(xx, tipY, 4.5).fill({ color: 0xffd58c, alpha: .48 * fade });
        if (settings.effects && settings.smoke && !reduced && intensity > 0) {
          for (let segment = 0; segment < 2; segment++) {
            const drift = (now / 1500 + index * 2 + i * .35 + segment * .65) % 1;
            const sy = tipY - 8 - drift * 58;
            const sx = xx + Math.sin(now / 900 + index + i * .7 + segment) * 6 * drift;
            g.moveTo(sx, sy + 8)
              .quadraticCurveTo(sx + 5, sy, sx + 1, sy - 10)
              .stroke({ color: 0xffeed3, width: 1.8, alpha: (.12 + .12 * (1 - drift)) * fade * intensity });
          }
        }
      }
    }
  }
}
