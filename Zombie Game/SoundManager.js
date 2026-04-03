/**
 * SoundManager - Handles all game audio effects
 * Uses Web Audio API for better control and performance
 */
class SoundManager {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
    this.volume = 0.5;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await this.loadSounds();
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize audio system:', error);
    }
  }

  async loadSounds() {
    const soundFiles = {
      gunshot: 'sound assets/gunshot.wav',
      explosion: 'sound assets/explosion.wav',
      gameover: 'sound assets/gameover.wav',
      enemykill: 'sound assets/enemykill.wav',
      laser: 'sound assets/laser.wav',
      pause: 'sound assets/pause.wav'
    };

    for (const [name, path] of Object.entries(soundFiles)) {
      try {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.sounds[name] = audioBuffer;
      } catch (error) {
        console.warn(`Failed to load sound: ${name}`, error);
      }
    }
  }

  play(soundName, volume = 1.0, pitch = 1.0) {
    if (!this.initialized || !this.sounds[soundName]) return;

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = this.sounds[soundName];
      source.playbackRate.value = pitch;
      
      gainNode.gain.value = volume * this.volume;
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start(0);
    } catch (error) {
      console.warn(`Failed to play sound: ${soundName}`, error);
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  stopAllSounds() {
    // Create a new audio context to stop all currently playing sounds
    if (this.audioContext) {
      this.audioContext.close().then(() => {
        this.audioContext = null;
        this.initialized = false;
      }).catch(console.warn);
    }
  }

  // Resume audio context if suspended (required by some browsers)
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}
