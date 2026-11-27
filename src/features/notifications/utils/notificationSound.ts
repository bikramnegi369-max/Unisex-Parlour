export interface NotificationSoundPrefs {
  enabled: boolean;
  volume: number; // 0 to 1
}

const PREFS_KEY = "saloon_erp_notification_sound_prefs";
const LAST_PLAYED_KEY = "saloon_erp_last_played_notification_id";

const DEFAULT_PREFS: NotificationSoundPrefs = {
  enabled: true,
  volume: 0.4,
};

let sharedAudioCtx: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (sharedAudioCtx && sharedAudioCtx.state !== "closed") {
      return sharedAudioCtx;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    sharedAudioCtx = new AudioCtx();
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Unlocks/resumes the shared AudioContext on a genuine user gesture.
 */
export async function unlockNotificationAudio(): Promise<boolean> {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    return ctx.state === "running";
  } catch {
    return false;
  }
}

export function getNotificationSoundPrefs(): NotificationSoundPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationSoundPrefs>;
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : true,
      volume:
        typeof parsed.volume === "number" && parsed.volume >= 0 && parsed.volume <= 1
          ? parsed.volume
          : 0.4,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveNotificationSoundPrefs(prefs: NotificationSoundPrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

export function hasPlayedNotificationSound(notificationId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(LAST_PLAYED_KEY) === notificationId;
  } catch {
    return false;
  }
}

export function markNotificationSoundPlayed(notificationId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_PLAYED_KEY, notificationId);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Plays a soft, restrained two-tone chime using the shared Web Audio API context.
 * Returns true if audio playback actually started, false if unavailable/suspended/muted.
 */
export async function playNotificationChime(volume = 0.4): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const clampedVol = Math.max(0, Math.min(1, volume));
  if (clampedVol === 0) return false;

  const ctx = getOrCreateAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    if (ctx.state !== "running") {
      return false;
    }

    const now = ctx.currentTime;
    const playTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + startOffset);

      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(
        clampedVol * 0.25,
        now + startOffset + 0.02,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + startOffset + duration,
      );

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    // Gentle two-tone chime: C6 -> E6
    playTone(1046.5, 0, 0.18);
    playTone(1318.5, 0.12, 0.24);
    return true;
  } catch {
    return false;
  }
}
