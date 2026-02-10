class AudioNotificationService {
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.7;
  private isUnlocked: boolean = false;

  constructor() {
    // Charger les préférences depuis localStorage
    const savedEnabled = localStorage.getItem('pizzeria_audio_enabled');
    const savedVolume = localStorage.getItem('pizzeria_audio_volume');

    if (savedEnabled !== null) {
      this.isEnabled = savedEnabled === 'true';
    }

    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
    }
  }

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async unlockAudio() {
    if (this.isUnlocked) return;

    try {
      this.initAudioContext();
      if (!this.audioContext) return;

      // Créer un buffer silencieux pour débloquer l'audio
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isUnlocked = true;
      console.log('✅ Audio débloqué avec succès');
    } catch (error) {
      console.warn('⚠️ Impossible de débloquer l\'audio automatiquement:', error);
      this.isUnlocked = false;
    }
  }

  private async playBeep(frequency: number, duration: number, delay: number = 0) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    const currentTime = this.audioContext.currentTime + delay;

    // Envelope pour un son plus doux
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);
  }

  async playNotification() {
    if (!this.isEnabled || !this.isUnlocked) {
      if (!this.isUnlocked) {
        console.warn('⚠️ Audio non débloqué. Tentative de déblocage...');
        await this.unlockAudio();
        if (!this.isUnlocked) return;
      } else {
        return;
      }
    }

    try {
      this.initAudioContext();
      if (!this.audioContext) return;

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Jouer une séquence de 3 notes agréables (comme une notification moderne)
      await this.playBeep(800, 0.6, 0);      // Note 1
      await this.playBeep(1000, 0.6, 0.6);   // Note 2
      await this.playBeep(1200, 1.0, 1.2);   // Note 3 (plus longue)
    } catch (error) {
      console.error('❌ Erreur lors de la lecture du son:', error);
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem('pizzeria_audio_enabled', enabled.toString());
  }

  getEnabled(): boolean {
    return this.isEnabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('pizzeria_audio_volume', this.volume.toString());
  }

  getVolume(): number {
    return this.volume;
  }

  getIsUnlocked(): boolean {
    return this.isUnlocked;
  }
}

export const audioNotificationService = new AudioNotificationService();
