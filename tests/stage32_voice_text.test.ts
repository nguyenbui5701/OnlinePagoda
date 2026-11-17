import { describe, expect, it } from 'vitest';
import { dynamicThanksText, giftWishVariants, giftGroups } from '@vuonsen/shared';

const example = (eventKey: string, displayName = 'Hoàng Khang', thanksTemplateKey: (typeof giftGroups)[number] = 'heart') => ({eventKey, displayName, thanksTemplateKey});

describe('Stage 3.2 - dynamic Vietnamese gratitude text', () => {
  it('uses the confirmed display name and an appropriate action', () => {
    const text = dynamicThanksText(example('example-1'));
    expect(text).toContain('Cảm ơn Hoàng Khang đã');
    expect(text).toMatch(/đèn|ánh sáng/);
  });
  it('has at least sixteen distinct possible wishes', () => {
    expect(new Set(giftWishVariants).size).toBeGreaterThanOrEqual(16);
    const options = new Set(Array.from({ length: 100 }, (_, i) => dynamicThanksText(example(`gift-${i}`))));
    expect(options.size).toBeGreaterThan(10);
  });
  it('is repeatable for the same event and distinct groups have valid text', () => {
    expect(dynamicThanksText(example('x'))).toBe(dynamicThanksText(example('x')));
    for (const group of giftGroups) expect(dynamicThanksText(example('group', 'Hoàng Khang', group))).toContain('Cảm ơn Hoàng Khang');
  });
  it('does not speak raw links or HTML', () => {
    const text = dynamicThanksText(example('unsafe', '<script>x</script> https://example.com @@@'));
    expect(text).toContain('Cảm ơn bạn đã');
    expect(text).not.toMatch(/<|>|https|example\.com/);
  });
});
