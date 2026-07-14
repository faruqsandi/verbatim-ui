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
    
    if (typeof window !== "undefined") {
      const isTauri = window.__TAURI_INTERNALS__ !== undefined;
      
      if (isTauri) {
        // Use our Mock Media Element for Tauri to route playback to Rust
        import('./NativeMediaElement.js').then(({ NativeMediaElement }) => {
          this.audio = new NativeMediaElement();
          this._bindAudioEvents();
        });
      } else {
        // Fallback to standard HTML5 Audio for Web builds
        this.audio = new Audio();
        this._bindAudioEvents();
      }
    }
  }

  _bindAudioEvents() {
    this.audio.addEventListener('play', () => {
      this.audioPaused = false;
      this.log("DEBUG", "audio.play fired");
      this._startTimeSync();
    });
    
    this.audio.addEventListener('pause', () => {
      this.audioPaused = true;
      this.log("DEBUG", "audio.pause fired");
      this._stopTimeSync();
    });
    
    this.audio.addEventListener('ended', () => {
      this.audioPaused = true;
      this.audioCurrentTime = 0;
      this.log("DEBUG", "audio.ended fired");
      this._stopTimeSync();
    });
    
    this.audio.addEventListener('loadedmetadata', () => {
      this.audioDuration = this.audio.duration;
      this.audio.currentTime = 0;
      this.audioCurrentTime = 0;
      this.audioLoaded = true;
      this.log("INFO", `Audio metadata loaded. Duration: ${this.audio.duration}s`);
    });

    this.audio.addEventListener('error', () => {
      const error = this.audio.error;
      this.log("ERROR", `Audio playback error: ${error ? error.message || error.code : 'Unknown'}`);
    });

    this.audio.addEventListener('seeked', () => {
      this.audioCurrentTime = this.audio.currentTime;
      this.log("DEBUG", `audio.seeked to: ${this.audio.currentTime}s`);
    });

    this.audio.addEventListener('ratechange', () => {
      this.playbackRate = this.audio.playbackRate;
      this.log("DEBUG", `audio.ratechange to: ${this.audio.playbackRate}x`);
    });
  }

  loadAudioFromUrl(url) {
    if (!this.audio) return;
    this.audioLoaded = false;
    this.log("INFO", `loadAudioFromUrl called with: ${url}`);
    this.audio.src = url;
    this.audio.load();
  }

  async loadAudioFromPath(path) {
    if (!this.audio) return;
    this.audioLoaded = false;
    this.log("INFO", `loadAudioFromPath called with native path: ${path}`);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      
      this.log("DEBUG", `Loading audio into Rust native backend...`);
      await invoke('load_audio', { path });
      
      this.log("DEBUG", `Fetching audio peaks from Rust backend...`);
      // Request 8000 peaks from the Rust backend for WaveSurfer
      this.peaks = await invoke('get_audio_peaks', { path, numPeaks: 8000 });
      
      // We set duration manually if it's not set by loadedmetadata immediately
      // Actually, NativeMediaElement isn't triggering loadedmetadata yet. We trigger it manually.
      this.audio.duration = await invoke('get_audio_duration', { path });
      // Let's just let WaveSurfer initialize.
      
      this.log("INFO", `Audio successfully loaded into Native backend.`);
      
      // Manually trigger loadedmetadata and canplay since we don't have a real stream
      if (this.audio instanceof EventTarget) {
         this.audio.readyState = 4; // HAVE_ENOUGH_DATA
         this.audio.dispatchEvent(new Event('loadedmetadata'));
         this.audio.dispatchEvent(new Event('canplay'));
         this.audio.dispatchEvent(new Event('canplaythrough'));
      }
      
    } catch (err) {
      this.log("ERROR", `Failed to load audio into Rust backend: ${err.message || err}`);
    }
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
    this.audioPaused = true;
    
    // Delay the seek slightly to allow WebKitGTK/GStreamer to complete the 
    // asynchronous PLAYING -> PAUSED state transition. Seeking synchronously 
    // during this state transition causes the seek to be dropped on Linux.
    setTimeout(() => {
      if (this.audio) {
        this.audio.currentTime = 0;
        this.audioCurrentTime = 0;
      }
    }, 50);
    
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
