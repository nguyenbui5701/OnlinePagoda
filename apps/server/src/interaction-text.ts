/** Bounded, local grammar: never search arbitrary prose for an activation word. */
export const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase();
export function commandText(input: unknown): { original: string; plain: string } | null {
  if (typeof input !== 'string' || input.length > 140) return null;
  const original = input.normalize('NFC').trim();
  let plain = fold(original).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/\b(khong|dung|chua|chang|khoi)\b/.test(plain)) return null;
  if (/\b(que|xam)\b/.test(plain) && /\b(hoa dang|tha den)\b/.test(plain)) return null;
  plain = plain.replace(/^(?:cho (?:minh|em|toi|con|toi xin)|(?:minh|em|toi|con) muon) /, '')
    .replace(/ (?:nhe|nha|a|voi)$/, '')
    .replace(/^(xin|rut|xem|boi) (?:mot|1) (que|xam)\b/, '$1 $2');
  return { original, plain };
}
export function bubbleText(input: string, blocked: readonly string[]): string | null {
  // Test links before stripping markup so an anchor cannot smuggle a URL onto the scene.
  if (/(?:https?:|www\.|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,24}\b)/iu.test(input)) return null;
  const clean = input.replace(/<[^>]*>/g, '').replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim();
  const normalized = ` ${fold(clean).replace(/[^a-z0-9]+/g, ' ')} `;
  if (blocked.some(word => { const w = fold(word).replace(/[^a-z0-9]+/g, ' ').trim(); return w && normalized.includes(` ${w} `); })) return null;
  return Array.from(clean).slice(0, 80).join('') || null;
}
