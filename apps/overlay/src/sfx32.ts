/**
 * Stage 3.2.3: original, procedural TikTok gift cues. No audio downloads or new deps.
 * SFX never modifies the voice track. The existing output compressor protects peaks.
 */
export type GiftSfxKey = 'rose' | 'heart' | 'bouquet' | 'donut' | 'offering' | 'corgi' | 'lantern' | 'lion' | 'generic';
export type SfxTone = Readonly<{
  hz: number;
  offset: number;
  seconds: number;
  level: number;
  wave: 'sine' | 'triangle';
  glide?: number;
}>;

const recipes: Record<GiftSfxKey, readonly SfxTone[]> = {
  rose: [
    { hz: 880, offset: 0, seconds: .54, level: .115, wave: 'triangle' },
    { hz: 1320, offset: .17, seconds: .64, level: .090, wave: 'sine' },
    { hz: 1760, offset: .34, seconds: .72, level: .064, wave: 'sine' }
  ],
  heart: [
    { hz: 659, offset: 0, seconds: .72, level: .132, wave: 'sine' },
    { hz: 987, offset: .16, seconds: .82, level: .113, wave: 'triangle' },
    { hz: 1319, offset: .36, seconds: 1.05, level: .091, wave: 'sine' }
  ],
  bouquet: [
    { hz: 523, offset: 0, seconds: .72, level: .107, wave: 'sine' },
    { hz: 659, offset: .18, seconds: .88, level: .104, wave: 'triangle' },
    { hz: 784, offset: .36, seconds: 1.05, level: .100, wave: 'sine' },
    { hz: 1046, offset: .58, seconds: 1.10, level: .072, wave: 'sine' }
  ],
  // Struck temple bell: several harmonic/inharmonic partials with long decay.
  donut: [
    { hz: 146.8, offset: 0, seconds: 2.55, level: .160, wave: 'sine' },
    { hz: 293.7, offset: 0, seconds: 2.20, level: .115, wave: 'sine' },
    { hz: 440.3, offset: .008, seconds: 1.85, level: .073, wave: 'triangle' },
    { hz: 676.0, offset: .020, seconds: 1.35, level: .051, wave: 'sine' }
  ],
  offering: [
    { hz: 392, offset: 0, seconds: .72, level: .125, wave: 'triangle' },
    { hz: 494, offset: .20, seconds: .86, level: .108, wave: 'sine' },
    { hz: 587, offset: .38, seconds: 1.10, level: .097, wave: 'sine' }
  ],
  corgi: [
    { hz: 240, offset: .05, seconds: .52, level: .086, wave: 'sine', glide: 1.23 },
    { hz: 360, offset: .28, seconds: .58, level: .086, wave: 'sine', glide: 1.28 },
    { hz: 300, offset: .52, seconds: .51, level: .087, wave: 'sine', glide: 1.20 },
    { hz: 480, offset: .77, seconds: .62, level: .075, wave: 'sine', glide: 1.24 }
  ],
  lantern: [
    { hz: 523, offset: 0, seconds: .95, level: .119, wave: 'sine' },
    { hz: 784, offset: .24, seconds: 1.05, level: .108, wave: 'sine' },
    { hz: 1046, offset: .48, seconds: 1.20, level: .093, wave: 'triangle' },
    { hz: 1568, offset: .70, seconds: 1.35, level: .070, wave: 'sine' }
  ],
  // Lion/dragon: deep gong supported by audible higher harmonics for phone speakers.
  lion: [
    { hz: 110, offset: 0, seconds: 2.65, level: .165, wave: 'sine' },
    { hz: 165, offset: .02, seconds: 2.35, level: .120, wave: 'triangle' },
    { hz: 220, offset: .08, seconds: 2.20, level: .126, wave: 'sine' },
    { hz: 440, offset: .25, seconds: 1.64, level: .081, wave: 'triangle' },
    { hz: 660, offset: .55, seconds: 1.20, level: .059, wave: 'sine' }
  ],
  generic: [
    { hz: 523, offset: 0, seconds: .65, level: .114, wave: 'sine' },
    { hz: 784, offset: .17, seconds: .85, level: .086, wave: 'sine' }
  ]
};

export function giftSfxRecipe(key: string): readonly SfxTone[] {
  return Object.prototype.hasOwnProperty.call(recipes, key)
    ? recipes[key as GiftSfxKey]
    : recipes.generic;
}

/** Track each source through AudioManager.sources so mute/reset can stop it. */
export function playGiftSfx(
  context: AudioContext,
  output: AudioNode,
  key: string,
  track: (source: AudioScheduledSourceNode) => void
): void {
  const now = context.currentTime + .015;
  const notes = giftSfxRecipe(key);
  for (const note of notes) {
    const source = context.createOscillator();
    const envelope = context.createGain();
    const start = now + note.offset;
    const duration = note.seconds;
    source.type = note.wave;
    source.frequency.setValueAtTime(note.hz, start);
    if (note.glide) source.frequency.exponentialRampToValueAtTime(note.hz * note.glide, start + duration * .65);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(note.level, start + Math.min(.025, duration * .08));
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(envelope);
    envelope.connect(output);
    source.onended = () => { source.disconnect(); envelope.disconnect(); };
    track(source);
    source.start(start);
    source.stop(start + duration + .01);
  }
  if (key === 'corgi' || key === 'lion') {
    // A bounded filtered-noise layer: flowing water for corgi, low gong rush for lion.
    const seconds = key === 'corgi' ? 1.65 : 1.9;
    const samples = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, samples, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = key === 'corgi' ? 82471 : 19137;
    for (let i = 0; i < samples; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = ((seed / 4294967296) * 2 - 1) * .8;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(key === 'corgi' ? 950 : 480, now);
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(key === 'corgi' ? .075 : .105, now + .12);
    envelope.gain.exponentialRampToValueAtTime(.0001, now + seconds);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(output);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    track(source);
    source.start(now);
    source.stop(now + seconds + .01);
  }
}
