let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) {
    return null;
  }
  audioCtx ??= new Ctx();
  return audioCtx;
}

/** Short confirmation beep after a successful scan add. */
export function playScanBeep(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }
    void ctx.resume();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.04;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    oscillator.start(now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    oscillator.stop(now + 0.13);
  } catch {
    // Audio may be blocked; vibration / toast still run.
  }
}

export function vibrateScanSuccess(): void {
  try {
    navigator.vibrate?.(40);
  } catch {
    // ignore
  }
}

export function notifyScanSuccess(): void {
  vibrateScanSuccess();
  playScanBeep();
}
