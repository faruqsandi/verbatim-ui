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

  /** @type {any} */
  logger = null;

  log(level, msg) {
    if (this.logger) {
      this.logger.log(level, "AudioStore", msg);
    } else {
      console.log(`[AudioStore] ${msg}`);
    }
  }

  constructor() {
    this._updateTime = this._updateTime.bind(this);
    
    // Initialize HTML5 Audio (Only in browser environment)
    if (typeof window !== "undefined") {
      this.audio = new Audio();
      
      this.audio.onplay = () => {
        this.audioPaused = false;
        this.log("DEBUG", "audio.onplay fired");
        this._startTimeSync();
      };
      
      this.audio.onpause = () => {
        this.audioPaused = true;
        this.log("DEBUG", "audio.onpause fired");
        this._stopTimeSync();
      };
      
      this.audio.onended = () => {
        this.audioPaused = true;
        this.audioCurrentTime = 0;
        this.log("DEBUG", "audio.onended fired");
        this._stopTimeSync();
      };
      
      this.audio.onloadedmetadata = () => {
        this.audioDuration = this.audio.duration;
        this.audioLoaded = true;
        this.log("INFO", `Audio metadata loaded. Duration: ${this.audio.duration}s`);
      };

      this.audio.onerror = () => {
        const error = this.audio.error;
        let details = "Unknown error";
        if (error) {
          details = `Code: ${error.code}. Message: ${error.message || "none"}`;
        }
        this.log("ERROR", `Audio playback error: ${details}`);
      };

      this.audio.onseeked = () => {
        this.audioCurrentTime = this.audio.currentTime;
        this.log("DEBUG", `audio.onseeked to: ${this.audio.currentTime}s`);
      };

      this.audio.onratechange = () => {
        this.playbackRate = this.audio.playbackRate;
        this.log("DEBUG", `audio.onratechange to: ${this.audio.playbackRate}x`);
      };
    }
  }

  loadAudioFromUrl(url) {
    if (!this.audio) return;
    this.audioLoaded = false;
    this.log("INFO", `loadAudioFromUrl called with: ${url}`);
    this.audio.src = url;
    this.audio.load();
  }

  handleAudioUpload(file) {
    if (!file || !this.audio) return;
    this.audioLoaded = false;
    const url = URL.createObjectURL(file);
    this.log("INFO", `handleAudioUpload called. File: ${file.name}, size: ${file.size} bytes. Created ObjectURL: ${url}`);
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
    if (!this.audioLoaded || !this.audio) {
      this.log("WARN", "togglePlay ignored: audio not loaded");
      return;
    }
    this.log("DEBUG", `togglePlay. Current state paused: ${this.audio.paused}`);
    if (this.audio.paused) {
      this.audio.play().catch((err) => this.log("ERROR", `audio.play() rejected: ${err.message || err}`));
    } else {
      this.audio.pause();
    }
  }

  stopAudio() {
    if (!this.audioLoaded || !this.audio) return;
    this.log("DEBUG", "stopAudio called");
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audioCurrentTime = 0;
    this._stopTimeSync();
  }

  seekAudioTo(time) {
    if (!this.audioLoaded || !this.audio) return;
    this.log("DEBUG", `seekAudioTo: ${time}s`);
    this.audio.currentTime = Math.max(0, Math.min(time, this.audioDuration));
    this.audioCurrentTime = this.audio.currentTime;
  }

  setPlaybackRate(rate) {
    this.log("DEBUG", `setPlaybackRate: ${rate}x`);
    this.playbackRate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
  }

  destroy() {
    this.log("DEBUG", "destroying AudioStore");
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
    }
    this._stopTimeSync();
  }
}
