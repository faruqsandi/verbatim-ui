import { tick } from "svelte";
import Papa from "papaparse";

export class TranscriptState {
  // Reactive state using Svelte 5 runes
  /** @type {any[]} */
  words = $state([]);
  /** @type {number | null} */
  activeWordIndex = $state(null);
  isLoading = $state(true);
  errorMsg = $state("");

  // Visual options
  showUnderlines = $state(true);
  showTablePanel = $state(false);
  fontScale = $state(1.0);

  // Audio Playback State
  audioLoaded = $state(false);
  audioDuration = $state(0);
  audioCurrentTime = $state(0);
  audioPaused = $state(true);

  // Speaker color map
  /** @type {Record<string, string>} */
  speakerColors = $state({});
  palette = [
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#ef4444", // red-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#06b6d4", // cyan-500
    "#f97316", // orange-500
  ];

  // Context Menu State
  /** @type {{show: boolean, x: number, y: number, word: any, showDropdown: boolean}} */
  contextMenu = $state({
    show: false,
    x: 0,
    y: 0,
    word: null,
    showDropdown: false,
  });

  // Non-reactive audio buffers and nodes
  /** @type {AudioContext | null} */
  audioCtx = null;
  /** @type {AudioBuffer | null} */
  audioBuffer = null;
  /** @type {AudioBufferSourceNode | null} */
  sourceNode = null;
  /** @type {GainNode | null} */
  gainNode = null;
  _startOffset = 0;
  _startCtxTime = 0;
  /** @type {number | null} */
  _animFrameId = null;

  // History lists
  /** @type {any[]} */
  history = [];
  currentHistoryIndex = -1;
  MAX_HISTORY = 50;

  // Derived getters
  get speakers() {
    return [...new Set(this.words.map((w) => w.speaker).filter(Boolean))];
  }

  get sentenceGroups() {
    if (this.words.length === 0) return [];
    return this.words.reduce((groups, word, index) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.speaker === word.speaker) {
        lastGroup.words.push({ word, index });
      } else {
        groups.push({
          id: word.id,
          speaker: word.speaker,
          words: [{ word, index }],
        });
      }
      return groups;
    }, []);
  }

  constructor() {
    this._ensureAudioCtx = this._ensureAudioCtx.bind(this);
    this._decodeAudioData = this._decodeAudioData.bind(this);
    this._updateTime = this._updateTime.bind(this);
  }

  // Initialize and load default demo data
  async initDemo() {
    this.isLoading = true;
    this.errorMsg = "";
    
    // Load default audio
    this.loadAudioFromUrl("/artikulasi.mp3");

    try {
      const response = await fetch("/artikulasi.csv");
      const csvStr = await response.text();
      Papa.parse(csvStr, {
        header: true,
        skipEmptyLines: true,
        complete: (/** @type {any} */ results) => {
          this.words = results.data.map((/** @type {any} */ w) => ({
            ...w,
            id: Math.random().toString(36).substring(2, 10),
          }));

          this.assignSpeakerColors();
          this.history = [];
          this.currentHistoryIndex = -1;
          this.pushState();

          this.isLoading = false;
        },
        error: (/** @type {any} */ err) => {
          this.errorMsg = err.message;
          this.isLoading = false;
        },
      });
    } catch (e) {
      this.errorMsg = e instanceof Error ? e.message : String(e);
      this.isLoading = false;
    }
  }

  assignSpeakerColors() {
    this.speakers.forEach((sp, idx) => {
      if (!this.speakerColors[sp]) {
        this.speakerColors[sp] = this.palette[idx % this.palette.length];
      }
    });
  }

  /**
   * @param {any} file
   */
  loadCsv(file) {
    this.isLoading = true;
    this.errorMsg = "";

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (/** @type {any} */ results) => {
        this.words = results.data.map((/** @type {any} */ w) => ({
          ...w,
          id: Math.random().toString(36).substring(2, 10),
        }));

        this.assignSpeakerColors();
        this.history = [];
        this.currentHistoryIndex = -1;
        this.pushState();

        // Try to load mp3 with same name
        const expectedAudio = file.name.replace(/\.csv$/i, ".mp3");
        const audioUrlCandidate = "/" + expectedAudio;
        this.loadAudioFromUrl(audioUrlCandidate);

        this.isLoading = false;
      },
      error: (/** @type {any} */ err) => {
        this.errorMsg = err.message;
        this.isLoading = false;
      },
    });
  }

  // Save/Export CSV file
  saveCsv() {
    const csvStr = Papa.unparse(
      this.words.map((w) => {
        // Remove internal properties
        const { id, originalIndex, ...rest } = w;
        return rest;
      }),
    );
    const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "transcript_edited.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Web Audio Context & Core Helpers
  _ensureAudioCtx() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    return this.audioCtx;
  }

  /**
   * @param {ArrayBuffer} arrayBuffer
   */
  async _decodeAudioData(arrayBuffer) {
    try {
      const ctx = this._ensureAudioCtx();
      const copy = arrayBuffer.slice(0);
      this.audioBuffer = await ctx.decodeAudioData(copy);
      this.audioDuration = this.audioBuffer.duration;
      this._startOffset = 0;
      this.audioCurrentTime = 0;
      this.audioLoaded = true;
      this.audioPaused = true;
    } catch (err) {
      console.error("Error decoding audio:", err);
      this.audioLoaded = false;
    }
  }

  /**
   * @param {string} url
   */
  async loadAudioFromUrl(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch audio: " + res.status);
      const arrayBuffer = await res.arrayBuffer();
      await this._decodeAudioData(arrayBuffer);
    } catch (err) {
      console.error("Error loading audio:", err);
      this.audioLoaded = false;
    }
  }

  _stopSource() {
    if (this.sourceNode) {
      try { this.sourceNode.onended = null; this.sourceNode.stop(); } catch(e) {}
      try { this.sourceNode.disconnect(); } catch(e) {}
      this.sourceNode = null;
    }
  }

  _updateTime() {
    if (!this.audioPaused && this.audioCtx) {
      this.audioCurrentTime = this._startOffset + (this.audioCtx.currentTime - this._startCtxTime);
      if (this.audioCurrentTime >= this.audioDuration) {
        this._stopSource();
        this.audioPaused = true;
        this._startOffset = 0;
        this.audioCurrentTime = 0;
        return;
      }
      this._animFrameId = requestAnimationFrame(this._updateTime);
    }
  }

  /**
   * @param {number} offset
   */
  _playFrom(offset) {
    if (!this.audioBuffer) return;
    const ctx = this._ensureAudioCtx();
    if (ctx.state === "suspended") ctx.resume();

    this._stopSource();

    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    if (!this.gainNode) {
      this.gainNode = ctx.createGain();
      this.gainNode.connect(ctx.destination);
    }
    this.sourceNode.connect(this.gainNode);

    this._startOffset = Math.max(0, Math.min(offset, this.audioDuration));
    this._startCtxTime = ctx.currentTime;
    this.sourceNode.start(0, this._startOffset);
    this.audioPaused = false;

    this.sourceNode.onended = () => {
      if (!this.audioPaused) {
        this.audioPaused = true;
        this._startOffset = 0;
        this.audioCurrentTime = 0;
        if (this._animFrameId) cancelAnimationFrame(this._animFrameId);
      }
    };

    if (this._animFrameId) cancelAnimationFrame(this._animFrameId);
    this._animFrameId = requestAnimationFrame(this._updateTime);
  }

  togglePlay() {
    if (!this.audioBuffer) return;
    if (this.audioPaused) {
      this._playFrom(this._startOffset);
    } else {
      if (this.audioCtx) {
        this._startOffset = this._startOffset + (this.audioCtx.currentTime - this._startCtxTime);
      }
      this.audioCurrentTime = this._startOffset;
      this._stopSource();
      this.audioPaused = true;
      if (this._animFrameId) cancelAnimationFrame(this._animFrameId);
    }
  }

  stopAudio() {
    this._stopSource();
    this.audioPaused = true;
    this._startOffset = 0;
    this.audioCurrentTime = 0;
    if (this._animFrameId) cancelAnimationFrame(this._animFrameId);
  }

  /**
   * @param {number} time
   */
  seekAudioTo(time) {
    this._startOffset = Math.max(0, Math.min(time, this.audioDuration));
    this.audioCurrentTime = this._startOffset;
    if (!this.audioPaused) {
      this._playFrom(this._startOffset);
    }
  }

  /**
   * @param {any} file
   */
  handleAudioUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target && e.target.result instanceof ArrayBuffer) {
        await this._decodeAudioData(e.target.result);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // History & Undo / Redo
  pushState() {
    const newStr = JSON.stringify(this.words);
    if (this.currentHistoryIndex >= 0 && this.currentHistoryIndex < this.history.length) {
      const currentStateStr = JSON.stringify(this.history[this.currentHistoryIndex]);
      if (currentStateStr === newStr) return; // no change
    }

    if (this.currentHistoryIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentHistoryIndex + 1);
    }

    this.history.push(JSON.parse(newStr));

    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    } else {
      this.currentHistoryIndex++;
    }
  }

  undo() {
    if (this.currentHistoryIndex > 0) {
      this.currentHistoryIndex--;
      this.words = JSON.parse(JSON.stringify(this.history[this.currentHistoryIndex]));
    }
  }

  redo() {
    if (this.currentHistoryIndex < this.history.length - 1) {
      this.currentHistoryIndex++;
      this.words = JSON.parse(JSON.stringify(this.history[this.currentHistoryIndex]));
    }
  }

  // Speaker Operations
  /**
   * @param {string} oldName
   * @param {string} newName
   */
  renameSpeaker(oldName, newName) {
    newName = newName.trim();
    if (!newName || oldName === newName) return;

    let changed = false;
    this.words = this.words.map((w) => {
      if (w.speaker === oldName) {
        changed = true;
        return { ...w, speaker: newName };
      }
      return w;
    });

    if (changed) {
      if (!this.speakerColors[newName]) {
        this.speakerColors[newName] = this.speakerColors[oldName];
      }
      this.pushState();
    }
  }

  // Clean up
  destroy() {
    this._stopSource();
    if (this._animFrameId) cancelAnimationFrame(this._animFrameId);
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch(e) {}
    }
  }
}
