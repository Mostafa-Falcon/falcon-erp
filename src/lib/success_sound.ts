import { SettingsRepository } from '@/modules/settings/settings_repository';

export type SuccessSoundKind = 'sale' | 'purchase';

type Note = {
  frequency: number;
  type: OscillatorType;
  start: number;
  duration: number;
};

/** Per-event setting keys. Absent values fall back to the defaults below. */
const SOUND_KEYS: Record<SuccessSoundKind, string> = {
  sale: 'sale_success_sound',
  purchase: 'purchase_success_sound',
};

const DEFAULT_THEME: Record<SuccessSoundKind, string> = {
  sale: 'chime',
  purchase: 'register',
};

const THEMES: Record<string, Note[]> = {
  // Ascending, bright triad — confirms a completed sale.
  chime: [
    { frequency: 523.25, type: 'sine', start: 0, duration: 0.16 },
    { frequency: 659.25, type: 'sine', start: 0.12, duration: 0.16 },
    { frequency: 783.99, type: 'sine', start: 0.24, duration: 0.22 },
  ],
  // Two-step register "ka-ching" — confirms stock/money in on purchases.
  register: [
    { frequency: 587.33, type: 'triangle', start: 0, duration: 0.13 },
    { frequency: 880, type: 'triangle', start: 0.11, duration: 0.16 },
    { frequency: 1174.66, type: 'triangle', start: 0.24, duration: 0.2 },
  ],
  pulse: [
    { frequency: 440, type: 'sine', start: 0, duration: 0.12 },
    { frequency: 880, type: 'sine', start: 0.1, duration: 0.2 },
  ],
  classic: [
    { frequency: 1046.5, type: 'square', start: 0, duration: 0.2 },
  ],
};

async function readSetting(orgId: string, key: string): Promise<string | undefined> {
  // localStorage mirrors freshly saved settings, so the next operation already uses the new value.
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(`falcon_${key}`);
    if (local !== null) return local;
  }
  if (!orgId) return undefined;
  try {
    const settings = await SettingsRepository.getAppSettings(orgId);
    return settings.find((s) => s.id === key)?.value;
  } catch {
    return undefined;
  }
}

/**
 * Plays a short confirmation tone after a sale or purchase is successfully saved.
 * Must never break the save flow — all failures are swallowed on purpose.
 */
export async function playSuccessSound(kind: SuccessSoundKind, orgId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const [enabled, theme] = await Promise.all([
      readSetting(orgId, 'enable_sounds'),
      readSetting(orgId, SOUND_KEYS[kind]),
    ]);
    if (enabled === 'false' || theme === 'off') return;

    const notes = THEMES[theme || DEFAULT_THEME[kind]] || THEMES[DEFAULT_THEME[kind]];
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor || notes.length === 0) return;

    const ctx = new AudioCtor();
    if (ctx.state === 'suspended') await ctx.resume();

    const now = ctx.currentTime;
    let lastOscillator: OscillatorNode | null = null;

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type;
      osc.frequency.setValueAtTime(note.frequency, now + note.start);
      gain.gain.setValueAtTime(0.0001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(0.12, now + note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration);
      lastOscillator = osc;
    }

    // Release the AudioContext as soon as the tone finishes (no lingering resources).
    if (lastOscillator) lastOscillator.onended = () => void ctx.close();
  } catch {
    // Audio is best-effort; the document is already saved at this point.
  }
}
