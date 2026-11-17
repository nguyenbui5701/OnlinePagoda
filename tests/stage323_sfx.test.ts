import { describe, expect, it } from 'vitest';
import { giftSfxRecipe } from '../apps/overlay/src/sfx32';
const groups = ['rose', 'heart', 'bouquet', 'donut', 'offering', 'corgi', 'lantern', 'lion'];
describe('Stage 3.2.3 original gift sounds', () => {
  it('has a specific recipe for all eight gift groups', () => {
    const signatures = groups.map(key => giftSfxRecipe(key).map(n => n.hz).join(','));
    expect(new Set(signatures).size).toBe(8);
  });
  it('bounds amplitude, duration, node count and frequency', () => {
    for (const key of groups) {
      const notes = giftSfxRecipe(key);
      expect(notes.length).toBeGreaterThanOrEqual(2);
      expect(notes.length).toBeLessThanOrEqual(5);
      for (const n of notes) {
        expect(n.hz).toBeGreaterThanOrEqual(100);
        expect(n.hz).toBeLessThanOrEqual(4000);
        expect(n.level).toBeGreaterThan(0);
        expect(n.level).toBeLessThanOrEqual(.18);
        expect(n.seconds + n.offset).toBeLessThanOrEqual(3);
      }
    }
  });
  it('keeps a bounded generic fallback for unknown TikTok gift IDs', () => {
    expect(giftSfxRecipe('unmapped')).toBe(giftSfxRecipe('generic'));
  });
  it('the temple bell and lion have long decay; the water effect has rising bubble notes', () => {
    expect(giftSfxRecipe('donut')[0].seconds).toBeGreaterThan(2);
    expect(giftSfxRecipe('lion')[0].seconds).toBeGreaterThan(2);
    expect(giftSfxRecipe('corgi').every(note => (note.glide ?? 0) > 1)).toBe(true);
  });
});
