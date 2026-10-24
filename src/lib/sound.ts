import { journeyStore } from "./journey";

let ctx: AudioContext | null = null;

/**
 * The IC-reader "beep": two short sine tones synthesised with Web Audio, so
 * there is no audio file to download. Silent unless the visitor turned sound on.
 */
export function beep() {
  if (!journeyStore.get().sound || typeof window === "undefined") return;
  ctx ??= new AudioContext();
  const now = ctx.currentTime;
  [
    [2093, 0],
    [2637, 0.09],
  ].forEach(([freq, offset]) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + offset);
    gain.gain.linearRampToValueAtTime(0.06, now + offset + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.085);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.1);
  });
}

/** Browsers only allow audio after a user gesture — resume on the toggle click. */
export function unlockAudio() {
  ctx ??= new AudioContext();
  void ctx.resume();
}
