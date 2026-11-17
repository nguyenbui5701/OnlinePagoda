import { describe, expect, it } from 'vitest';
import { defaultSettings, seats, settingsPatchSchema, type Actor } from '@vuonsen/shared';
import { SceneEngine } from '../apps/server/src/engine';
import { parseFortuneCommand } from '../apps/server/src/fortune-parser';
import { parseLanternCommand } from '../apps/server/src/lantern-queue';
import { bubbleText } from '../apps/server/src/interaction-text';
import { giftCamera, idleMotion, placeBubble, overlaps } from '../apps/overlay/src/live-motion';

describe('Live experience: bounded natural commands', () => {
  it.each(['cho mình xin một quẻ gia đình', 'CHO MINH XIN 1 QUE GIA DINH!', 'xin xăm gia đình nhé'])('%s', text => {
    expect(parseFortuneCommand(text)).toMatchObject({ theme: 'gia_dao' });
  });
  it.each(['mình muốn thả đèn ba mẹ', 'cho mình thả hoa đăng bố mẹ', 'hoa đăng cha mẹ nhé'])('%s', text => {
    expect(parseLanternCommand(text)).toBe('cha_me');
  });
  it.each(['không xin quẻ', 'đừng thả đèn', 'xin quẻ và hoa đăng', 'mình kể về hoa đăng gia đình', 'bình an', 'cầu an', 'lễ Phật'])('no accidental activation: %s', text => {
    expect(parseFortuneCommand(text)).toBeNull(); expect(parseLanternCommand(text)).toBeNull();
  });
  it('preserves number/year and accented zodiac distinctions with wrappers', () => {
    expect(parseFortuneCommand('xem quẻ 123')).toMatchObject({ number: 123 });
    expect(parseFortuneCommand('xin quẻ 1991')).toMatchObject({ scope: 'tan_mui_1991' });
    expect(parseFortuneCommand('cho mình xin quẻ tuổi Tỵ nhé')).toMatchObject({ theme: 'tuoi_ti' });
    expect(parseFortuneCommand('cho mình xin quẻ tuổi Tý nhé')).toMatchObject({ theme: 'tuoi_ty' });
    expect(parseFortuneCommand('xin quẻ 999')).toBeNull();
  });
});
describe('Real chat text, identity and lifetime', () => {
  it('strips markup/control characters, bounds Unicode, blocks links and configured whole words', () => {
    expect(bubbleText('<b>Xin chào</b>\u202e', [])).toBe('Xin chào');
    expect(Array.from(bubbleText('🌸'.repeat(100), [])!)).toHaveLength(80);
    expect(bubbleText('mời xem example.com', [])).toBeNull();
    expect(bubbleText('TU bị chặn!', ['bị chặn'])).toBeNull();
    expect(bubbleText('an lành', ['lan'])).toBe('an lành');
  });
  it('emits for seated and standing viewers, limits by identity, never replays snapshots', () => {
    let now = 100000;
    const engine = new SceneEngine({ ...defaultSettings, lanternEnabled: true, maxActors: 1 }, () => now);
    const send = (id: string, eventId: string) => { engine.receive({ type: 'chat', userId: id, nickname: 'Same name', eventId, text: 'hoa đăng' }); engine.tick(); };
    send('a', '1'); send('a', '1'); send('a', '2'); send('b', '3');
    expect(engine.actions.filter(a => a.type === 'CHAT_BUBBLE')).toHaveLength(2);
    expect([...engine.waiting.values()][0].chatText).toBeUndefined();
    now += 2000; send('a', '4');
    const bubbles = engine.actions.filter(a => a.type === 'CHAT_BUBBLE');
    expect(bubbles).toHaveLength(3); expect(bubbles[2].bubble).toEqual({ text: 'hoa đăng', expiresAt: now + 4000 });
    expect(engine.snapshot()).not.toHaveProperty('actions');
    engine.updateSettings({ showBubbles: false }); now += 2000; send('a', '5');
    expect(engine.actions.filter(a => a.type === 'CHAT_BUBBLE')).toHaveLength(3);
    engine.reset(); expect(engine.actions).toHaveLength(0);
  });
  it('new settings patches do not reset saved voice/gift/fortune configuration', () => {
    const e = new SceneEngine({ ...defaultSettings, voiceVolume: .3, fortuneVoiceEnabled: true });
    e.updateSettings({ actorSize: 1.8 });
    expect(e.settings).toMatchObject({ actorSize: 1.8, voiceVolume: .3, fortuneVoiceEnabled: true });
    expect(settingsPatchSchema.parse({ compactGiftPanels: false })).toEqual({ compactGiftPanels: false });
  });
});
describe('Motion, camera and bubble placement', () => {
  const actors: Actor[] = seats.map((s, i) => ({ key: String(i), seatId: s.id, displayName: 'Test', variant: i, joinedAt: 0, lastActiveAt: 0, status: 'idle', statusAt: 0 }));
  it('caps walkers at six across 100 seats and returns to the same seats without changing activity', () => {
    for (let now = 100000; now < 225000; now += 91) {
      const motions = actors.map(a => idleMotion(a, now, true, false));
      expect(motions.filter(m => m.walking).length).toBeLessThanOrEqual(6);
      expect(motions.every(m => Math.hypot(m.dx, m.dy) <= 32)).toBe(true);
    }
    expect(actors.every(a => a.lastActiveAt === 0)).toBe(true);
  });
  it('commands, rituals, exit and reduced effects take precedence', () => {
    for (const status of ['pray', 'walk', 'exit', 'kneel'] as const) expect(idleMotion({ ...actors[0], status }, 5000, true, false).walking).toBe(false);
    expect(idleMotion(actors[0], 5000, true, false, '0').dx).toBe(0);
    expect(idleMotion(actors[0], 5000, true, true).walking).toBe(false);
    expect(idleMotion(actors[0], 5000, false, false).pose).toBe('idle');
  });
  it('camera resumes from timestamps, stays covered, and switches off without changing ritual data', () => {
    const ritual = { actorId: '0', seatId: 'seat-0', startedAt: 1000, durationMs: 7200 };
    for (let now = 1000; now <= 8200; now += 20) {
      const c = giftCamera(ritual, now, true, false);
      expect(c.scale).toBeGreaterThanOrEqual(1); expect(c.scale).toBeLessThanOrEqual(1.3);
      expect(c.x).toBeLessThanOrEqual(0); expect(c.y).toBeLessThanOrEqual(0);
      expect(c.y + 1920 * c.scale).toBeGreaterThanOrEqual(1920 - 1e-8);
    }
    expect(giftCamera(ritual, 5000, true, false).scale).toBeCloseTo(1.3);
    expect(giftCamera(ritual, 5000, true, true).scale).toBe(1);
    expect(giftCamera(ritual, 5000, false, false).scale).toBe(1);
    expect(giftCamera(ritual, 8200, true, false).scale).toBe(1);
  });
  it('moves bubbles clear of shared cards or drops when all positions are occupied', () => {
    const card = { x: 148, y: 1056, width: 784, height: 184 };
    const box = placeBubble(540, 1200, 280, 80, [card]);
    expect(box).not.toBeNull(); expect(overlaps(box!, card)).toBe(false);
    expect(placeBubble(540, 1200, 280, 80, [{ x: 0, y: 0, width: 1080, height: 1920 }])).toBeNull();
  });
});
