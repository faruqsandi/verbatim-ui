export class AudioStore {
  audioLoaded = $state(false);
  audioDuration = $state(0);
  audioCurrentTime = $state(0);
  audioPaused = $state(true);
  playbackRate = $state(1.0);

  /** @type {HTMLAudioElement} */
  audio;
  /** @type {number | null} */
  _animFrameId = null;

  constructor() {
    this._updateTime = this._updateTime.bind(this);
    
    // Initialize HTML5 Audio (Only in browser environment)
    if (typeof window !== "undefined") {
      this.audio = new Audio();
      
      this.audio.onplay = () => {
        this.audioPaused = false;
        this._startTimeSync();
      };
      
      this.audio.onpause = () => {
        this.audioPaused = true;
        this._stopTimeSync();
      };
      
      this.audio.onended = () => {
        this.audioPaused = true;
        this.audioCurrentTime = 0;
        this._stopTimeSync();
      };
      
      this.audio.onloadedmetadata = () => {
        this.audioDuration = this.audio.duration;
        this.audioLoaded = true;
      };

      this.audio.onerror = () => {
        console.error("Audio playback error");
      };

      this.audio.onseeked = () => {
        this.audioCurrentTime = this.audio.currentTime;
      };

      this.audio.onratechange = () => {
        this.playbackRate = this.audio.playbackRate;
      };
    }
  }

  loadAudioFromUrl(url) {
    if (!this.audio) return;
    this.audioLoaded = false;
    this.audio.src = url;
    this.audio.load();
  }

  handleAudioUpload(file) {
    if (!file || !this.audio) return;
    this.audioLoaded = false;
    const url = URL.createObjectURL(file);
    this.audio.src = url;
    this.audio.load();
  }

  _startTimeSync() {
    if (typeof window === "undefined") return;
    const sync = () => {
      if (!this.audioPaused) {
        this.audioCurrentTime = this.audio.currentTime;
        this._animFrameId = requestAnimationFrame(sync);
      }
    };
    if (this._animFrameId) cancelAnimationFrame(this._animFrameId);
    this._animFrameId = requestAnimationFrame(sync);
  }

  _stopTimeSync() {
    if (typeof window === "undefined") return;
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
  }

  _updateTime() {
    if (this.audio) {
      this.audioCurrentTime = this.audio.currentTime;
    }
  }

  togglePlay() {
    if (!this.audioLoaded || !this.audio) return;
    if (this.audio.paused) {
      this.audio.play().catch((err) => console.error("Playback error:", err));
    } else {
      this.audio.pause();
    }
  }

  stopAudio() {
    if (!this.audioLoaded || !this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audioCurrentTime = 0;
    this._stopTimeSync();
  }

  seekAudioTo(time) {
    if (!this.audioLoaded || !this.audio) return;
    this.audio.currentTime = Math.max(0, Math.min(time, this.audioDuration));
    this.audioCurrentTime = this.audio.currentTime;
  }

  setPlaybackRate(rate) {
    this.playbackRate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
  }

  destroy() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
    }
    this._stopTimeSync();
  }
}
