// Sound effect utilities for chat notifications

class SoundManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  // Generate a simple tone
  private generateTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    try {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.error('Error generating tone:', error);
    }
  }

  // Message sent sound - short pleasant "whoosh"
  playMessageSent(): void {
    this.generateTone(800, 0.1, 'sine');
    setTimeout(() => this.generateTone(1000, 0.08, 'sine'), 50);
  }

  // Message received sound - soft notification
  playMessageReceived(): void {
    this.generateTone(600, 0.15, 'sine');
    setTimeout(() => this.generateTone(800, 0.1, 'sine'), 80);
  }

  // Call dialing tone - classic ring pattern
  private dialingInterval: NodeJS.Timeout | null = null;
  
  startDialingTone(): void {
    this.stopDialingTone();
    
    const playRing = () => {
      this.generateTone(440, 0.4, 'sine');
      setTimeout(() => this.generateTone(480, 0.4, 'sine'), 50);
    };
    
    playRing();
    this.dialingInterval = setInterval(playRing, 3000);
  }

  stopDialingTone(): void {
    if (this.dialingInterval) {
      clearInterval(this.dialingInterval);
      this.dialingInterval = null;
    }
  }

  // Incoming call ringtone
  private ringtoneInterval: NodeJS.Timeout | null = null;

  startRingtone(): void {
    this.stopRingtone();
    
    const playRing = () => {
      // Two-tone ring pattern
      this.generateTone(523, 0.2, 'sine'); // C5
      setTimeout(() => this.generateTone(659, 0.2, 'sine'), 200); // E5
      setTimeout(() => this.generateTone(523, 0.2, 'sine'), 400); // C5
      setTimeout(() => this.generateTone(659, 0.2, 'sine'), 600); // E5
    };
    
    playRing();
    this.ringtoneInterval = setInterval(playRing, 2000);
  }

  stopRingtone(): void {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  // Call connected sound
  playCallConnected(): void {
    this.generateTone(523, 0.15, 'sine');
    setTimeout(() => this.generateTone(659, 0.15, 'sine'), 100);
    setTimeout(() => this.generateTone(784, 0.2, 'sine'), 200);
  }

  // Call ended sound
  playCallEnded(): void {
    this.generateTone(440, 0.3, 'sine');
    setTimeout(() => this.generateTone(349, 0.4, 'sine'), 200);
  }

  // Stop all sounds
  stopAll(): void {
    this.stopDialingTone();
    this.stopRingtone();
  }
}

// Singleton instance
export const soundManager = new SoundManager();
