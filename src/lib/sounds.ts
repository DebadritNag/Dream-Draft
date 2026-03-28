/** Tiny Web Audio API sound effects — no external files needed */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  gainValue = 0.15
) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ac.currentTime);
    gain.gain.setValueAtTime(gainValue, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration);
  } catch {
    // Silently fail if audio not available
  }
}

export function playDraftSound() {
  // Two-tone "pick" chime
  playTone(523, 'sine', 0.15, 0.2);
  setTimeout(() => playTone(784, 'sine', 0.25, 0.2), 120);
}

export function playTimerUrgentSound() {
  playTone(440, 'square', 0.08, 0.08);
}
