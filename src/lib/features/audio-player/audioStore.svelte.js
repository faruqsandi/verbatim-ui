export class AudioStore {
  audioLoaded = $state(false);
  audioDuration = $state(0);
  audioCurrentTime = $state(0);
  audioPaused = $state(true);
  playbackRate = $state(1.0);
  peaks = $state([]);

  /** @type {AudioContext} */
  ctx;
  /** @type {AudioBuffer | null} */
  buffer = null;
  /** @type {AudioBufferSourceNode | null} */
  source = null;
  /** @type {GainNode} */
  gainNode;

  startTime = 0;
  startOffset = 0;
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
    if (typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.gainNode = this.ctx.createGain();
        this.gainNode.connect(this.ctx.destination);
      }
    }
  }

  getPeaks(width = 1000) {
    if (!this.buffer) return [];
    this.log("DEBUG", `Generating ${width} peaks from decoded AudioBuffer`);
    const channelData = this.buffer.getChannelData(0);
    const step = Math.floor(channelData.length / width) || 1;
    const peaks = [];
    for (let i = 0; i < width; i++) {
      let max = 0;
      const start = i * step;
      const end = Math.min(channelData.length, start + step);
      for (let j = start; j < end; j++) {
        const val = Math.abs(channelData[j]);
        if (val > max) max = val;
      }
      peaks.push(max);
    }
    return peaks;
  }

  async _decodeAndLoad(arrayBuffer) {
    this.log("DEBUG", "Decoding Audio ArrayBuffer...");
    try {
      this._stopPlayback();
      this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.audioDuration = this.buffer.duration;
      this.peaks = this.getPeaks(1000);
      this.startOffset = 0;
      this.audioCurrentTime = 0;
      this.audioLoaded = true;
      this.audioPaused = true;
      this.log("INFO", `Decoded audio successfully. Duration: ${this.buffer.duration}s`);
    } catch (err) {
      this.log("ERROR", `Failed to decode audio: ${err.message || err}`);
    }
  }

  async loadAudioFromUrl(url) {
    this.audioLoaded = false;
    this.log("INFO", `loadAudioFromUrl called with: ${url}`);
    try {
      this.log("DEBUG", `Fetching audio data from: ${url}`);
      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();
      await this._decodeAndLoad(arrayBuffer);
    } catch (err) {
      this.log("ERROR", `Failed to fetch audio from URL: ${err.message || err}`);
    }
  }

  async loadAudioFromPath(path) {
    this.audioLoaded = false;
    this.log("INFO", `loadAudioFromPath called with native path: ${path}`);
    try {
      const { StorageAdapter } = await import("../core/storageAdapter.js");
      this.log("DEBUG", "Reading binary file via StorageAdapter...");
      const bytes = await StorageAdapter.readBinaryFile(path);
      this.log("DEBUG", `Read ${bytes.length} bytes. Transferring to ArrayBuffer...`);
      const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      await this._decodeAndLoad(arrayBuffer);
    } catch (err) {
      this.log("ERROR", `Failed to read/decode audio from native path: ${err.message || err}`);
    }
  }

  async handleAudioUpload(file) {
    if (!file) return;
    this.audioLoaded = false;
    this.log("INFO", `handleAudioUpload called. File: ${file.name}`);
    try {
      const arrayBuffer = await file.arrayBuffer();
      await this._decodeAndLoad(arrayBuffer);
    } catch (err) {
      this.log("ERROR", `Failed to upload/decode file: ${err.message || err}`);
    }
  }

  _startPlayback() {
    if (!this.buffer) return;
    
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.playbackRate.value = this.playbackRate;
    
    this.source.connect(this.gainNode);

    this.startTime = this.ctx.currentTime;
    
    this.source.start(0, this.startOffset);
    this.audioPaused = false;
    this.log("DEBUG", `Playback started from offset: ${this.startOffset}s`);

    this.source.onended = () => {
      const elapsed = (this.ctx.currentTime - this.startTime) * this.playbackRate;
      const totalElapsed = this.startOffset + elapsed;
      if (!this.audioPaused && totalElapsed >= this.audioDuration - 0.2) {
        this.log("DEBUG", "Audio playback completed naturally");
        this.audioPaused = true;
        this.startOffset = 0;
        this.audioCurrentTime = 0;
        this._stopTimeSync();
      }
    };

    this._startTimeSync();
  }

  _stopPlayback() {
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {}
      this.source.disconnect();
      this.source = null;
    }
    this.audioPaused = true;
    this._stopTimeSync();
  }

  _startTimeSync() {
    const sync = () => {
      if (!this.audioPaused) {
        const elapsed = (this.ctx.currentTime - this.startTime) * this.playbackRate;
        this.audioCurrentTime = Math.min(this.audioDuration, this.startOffset + elapsed);
        this._animFrameId = requestAnimationFrame(sync);
      }
    };
    if (this._animFrameId) cancelAnimationFrame(this._animFrameId);
    this._animFrameId = requestAnimationFrame(sync);
  }

  _stopTimeSync() {
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
  }

  togglePlay() {
    if (!this.audioLoaded) {
      this.log("WARN", "togglePlay ignored: audio not loaded");
      return;
    }
    this.log("DEBUG", `togglePlay. Current state paused: ${this.audioPaused}`);
    if (this.audioPaused) {
      this._startPlayback();
    } else {
      const elapsed = (this.ctx.currentTime - this.startTime) * this.playbackRate;
      this.startOffset = Math.min(this.audioDuration, this.startOffset + elapsed);
      this._stopPlayback();
    }
  }

  stopAudio() {
    if (!this.audioLoaded) return;
    this.log("DEBUG", "stopAudio called");
    this._stopPlayback();
    this.startOffset = 0;
    this.audioCurrentTime = 0;
  }

  seekAudioTo(time) {
    if (!this.audioLoaded) return;
    this.log("DEBUG", `seekAudioTo: ${time}s`);
    const wasPlaying = !this.audioPaused;
    
    if (wasPlaying) {
      this._stopPlayback();
    }
    
    this.startOffset = Math.max(0, Math.min(time, this.audioDuration));
    this.audioCurrentTime = this.startOffset;

    if (wasPlaying) {
      this._startPlayback();
    }
  }

  setPlaybackRate(rate) {
    this.log("DEBUG", `setPlaybackRate: ${rate}x`);
    const oldRate = this.playbackRate;
    this.playbackRate = rate;
    
    if (!this.audioPaused && this.source) {
      const elapsed = (this.ctx.currentTime - this.startTime) * oldRate;
      this.startOffset = Math.min(this.audioDuration, this.startOffset + elapsed);
      this.startTime = this.ctx.currentTime;
      this.source.playbackRate.value = rate;
    }
  }

  setVolume(vol) {
    this.log("DEBUG", `setVolume: ${vol}`);
    if (this.gainNode) {
      this.gainNode.gain.value = vol;
    }
  }

  destroy() {
    this.log("DEBUG", "destroying AudioStore");
    this._stopPlayback();
    this.audioLoaded = false;
    this.startOffset = 0;
    this.audioCurrentTime = 0;
    this.buffer = null;
  }
}
