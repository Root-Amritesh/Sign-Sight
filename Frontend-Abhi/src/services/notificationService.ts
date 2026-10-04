import type { UIAlertListItem } from '../types/api';

class NotificationService {
  private lastTriggerTime = 0;
  private audioCtx: AudioContext | null = null;
  private isAudioEnabled = false;
  private isNotificationEnabled = false;

  constructor() {
    try {
      this.isAudioEnabled = localStorage.getItem('signsight_sound_enabled') === 'true';
      this.isNotificationEnabled = localStorage.getItem('signsight_notifications_enabled') === 'true';
    } catch {
      // Storage in try/catch
    }
  }

  public setAudioEnabled(enabled: boolean) {
    this.isAudioEnabled = enabled;
    try {
      localStorage.setItem('signsight_sound_enabled', enabled ? 'true' : 'false');
    } catch {
      // Ignore
    }
  }

  public setNotificationEnabled(enabled: boolean) {
    this.isNotificationEnabled = enabled;
    try {
      localStorage.setItem('signsight_notifications_enabled', enabled ? 'true' : 'false');
    } catch {
      // Ignore
    }
  }

  public isAudioOn(): boolean {
    return this.isAudioEnabled;
  }

  public isNotificationOn(): boolean {
    return this.isNotificationEnabled;
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    const res = await Notification.requestPermission();
    const granted = res === 'granted';
    this.setNotificationEnabled(granted);
    return granted;
  }

  public notifyCriticalAlert(alert: UIAlertListItem) {
    const now = Date.now();
    // 10-second rate limit
    if (now - this.lastTriggerTime < 10000) return;
    this.lastTriggerTime = now;

    // 1. Synthesize WebAudio Alert Tone if enabled
    if (this.isAudioEnabled) {
      this.playAlertTone();
    }

    // 2. Dispatch Browser Notification if enabled
    if (this.isNotificationEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const family = (alert.predictedLabel || 'attack').toUpperCase();
        const score = alert.anomalyScore !== undefined ? ` (Anomaly: ${alert.anomalyScore.toFixed(2)})` : '';
        new Notification(`SignSight CRITICAL Alert: ${family}`, {
          body: `Alert ID: ${alert.id}${score}`,
          icon: '/favicon.svg',
          tag: 'signsight-critical-alert',
        });
      } catch {
        // Notification error fallback
      }
    }
  }

  private playAlertTone() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, this.audioCtx.currentTime + 0.15); // A4

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.15);
    } catch {
      // Audio autoplay restrictions
    }
  }
}

export const notificationService = new NotificationService();
