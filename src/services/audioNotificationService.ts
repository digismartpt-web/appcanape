class AudioNotificationService {
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.7;
  private isUnlocked: boolean = false;
  private customSoundUrl: string | null = null;

  constructor() {
    const savedEnabled = localStorage.getItem('pizzaria_audio_enabled');
    const savedVolume = localStorage.getItem('pizzaria_audio_volume');
    const savedSoundUrl = localStorage.getItem('pizzaria_notification_sound_url');

    if (savedEnabled !== null) {
      this.isEnabled = savedEnabled === 'true';
    }

    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
    }

    if (savedSoundUrl) {
      this.customSoundUrl = savedSoundUrl;
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

      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.isUnlocked = true;
      console.log('✅ Áudio desbloqueado com sucesso');
    } catch (error) {
      console.warn('⚠️ Não foi possível desbloquear o áudio automaticamente:', error);
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

    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);
  }

  private async playDefaultBeeps() {
    if (!this.isUnlocked) {
      console.warn('⚠️ Áudio não desbloqueado. A tentar desbloquear...');
      await this.unlockAudio();
      if (!this.isUnlocked) return;
    }

    this.initAudioContext();
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    await this.playBeep(800, 0.6, 0);
    await this.playBeep(1000, 0.6, 0.6);
    await this.playBeep(1200, 1.0, 1.2);
  }

  async playNotification() {
    if (!this.isEnabled) return;

    if (this.customSoundUrl) {
      try {
        const audio = new Audio(this.customSoundUrl);
        audio.volume = this.volume;
        await audio.play();
        return;
      } catch (error) {
        console.error('❌ Erro ao reproduzir som personalizado, usando som padrão:', error);
      }
    }

    try {
      await this.playDefaultBeeps();
    } catch (error) {
      console.error('❌ Erro ao reproduzir o som:', error);
    }
  }

  async playClientNotification() {
    if (!this.isUnlocked) {
      await this.unlockAudio();
      if (!this.isUnlocked) return;
    }

    try {
      this.initAudioContext();
      if (!this.audioContext) return;

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      await this.playBeep(1000, 0.3, 0);
      await this.playBeep(1300, 0.5, 0.3);
    } catch (error) {
      console.error('❌ Erro ao reproduzir som do cliente:', error);
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem('pizzaria_audio_enabled', enabled.toString());
  }

  getEnabled(): boolean {
    return this.isEnabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('pizzaria_audio_volume', this.volume.toString());
  }

  getVolume(): number {
    return this.volume;
  }

  getIsUnlocked(): boolean {
    return this.isUnlocked;
  }

  setCustomSoundUrl(url: string | null) {
    this.customSoundUrl = url;
    if (url) {
      localStorage.setItem('pizzaria_notification_sound_url', url);
    } else {
      localStorage.removeItem('pizzaria_notification_sound_url');
    }
  }

  getCustomSoundUrl(): string | null {
    return this.customSoundUrl;
  }
}

export const audioNotificationService = new AudioNotificationService();
