import { describe, expect, it } from 'vitest';
import { defaultSettings, settingsSchema, settingsPatchSchema } from '@vuonsen/shared';
import { SceneEngine } from '../apps/server/src/engine';
import { giftConfigSchema } from '../apps/overlay/src/golden/gifts';

describe('Stage 3 presentation compatibility', () => {
  it('migrates older settings without losing user preferences', () => {
    const settings = settingsSchema.parse({ templeName: 'Chùa của tôi', showGuide: false, tiktokUsername: 'fixture_old', safeRight: 60 });
    expect(settings).toMatchObject({ theme: 'golden', templeName: 'Chùa của tôi', showGuide: false, tiktokUsername: 'fixture_old', safeRight: 60, showBubbles: true });
  });
  it('partial visual patches never inject unrelated creation defaults', () => {
    expect(settingsPatchSchema.parse({ smoke: false })).toEqual({ smoke: false });
    expect(settingsPatchSchema.safeParse({ theme: 'broken' }).success).toBe(false);
  });
  it('theme switching preserves IDs, seat allocation, queue, cooldown and counts', () => {
    const engine = new SceneEngine({...defaultSettings,maxActors:60});
    for (let i = 0; i < 100; i++) engine.receive({ type: 'chat', userId: String(i), nickname: 'An Nhiên', text: 'cầu an' });
    for (let i = 0; i < 4; i++) engine.tick();
    const before = engine.snapshot(), cooldowns = new Map(engine.cooldowns);
    engine.updateSettings({ theme: 'classic', reducedEffects: true, showBubbles: false });
    const after = engine.snapshot();
    expect(after.sessionId).toBe(before.sessionId); expect(after.actors).toEqual(before.actors);
    expect(after.queue).toBe(40); expect(after.total).toBe(100); expect(engine.cooldowns).toEqual(cooldowns);
    expect(after.metrics).toEqual(before.metrics);
  });
  it('gift display metadata comes only from completed deduplicated gifts and is sanitized', () => {
    const engine = new SceneEngine(defaultSettings);
    const event = { type: 'gift', source: 'tiktok', scope: '123', userId: '77', nickname: '<b>Diệu Tâm</b>', gift: { id: '5655', count: 3, finished: true, streakId: 'group1' }, eventId: 'g1' };
    engine.receive({ ...event, gift: { ...event.gift, count: 1, finished: false }, eventId: 'partial' }); engine.tick();
    engine.receive(event); engine.receive(event); engine.tick();
    const actions = engine.actions.filter(a => a.type === 'GIFT_THANKS');
    expect(actions).toHaveLength(1); expect(actions[0].gift).toEqual({ id: '5655', count: 3, displayName: 'Diệu Tâm' });
    expect(engine.metrics.giftUnits).toBe(3); expect(engine.metrics.giftTransactions).toBe(1);
  });
  it('gift mapping requires operator confirmation, numeric IDs and unique assignments', () => {
    expect(giftConfigSchema.parse({ mappings: [] })).toEqual({ mappings: [] });
    const mapping = { giftId: '5655', label: 'Hoa hồng', effect: 'lotus', verified: true };
    expect(giftConfigSchema.safeParse({ mappings: [mapping] }).success).toBe(true);
    expect(giftConfigSchema.safeParse({ mappings: [{ ...mapping, verified: false }] }).success).toBe(false);
    expect(giftConfigSchema.safeParse({ mappings: [mapping, mapping] }).success).toBe(false);
    expect(giftConfigSchema.safeParse({ mappings: [{ ...mapping, label: '<script>x</script>' }] }).success).toBe(false);
  });
});
