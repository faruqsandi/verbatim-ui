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

  // HTML5 Audio Element
  /** @type {HTMLAudioElement} */
  audio;
  /** @type {number | null} */
  _animFrameId = null;

  // Svelte-native reference map for word spans
  /** @type {Record<number, HTMLElement>} */
  wordElements = {};

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
    this._updateTime = this._updateTime.bind(this);
    
    // Initialize HTML5 Audio
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

    this.audio.onseeked = () => {
      this.audioCurrentTime = this.audio.currentTime;
    };
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

  /**
   * @param {string} url
   */
  loadAudioFromUrl(url) {
    this.audioLoaded = false;
    this.audio.src = url;
    this.audio.load();
  }

  _startTimeSync() {
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
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
  }

  _updateTime() {
    this.audioCurrentTime = this.audio.currentTime;
  }

  togglePlay() {
    if (!this.audioLoaded) return;
    if (this.audio.paused) {
      this.audio.play().catch((err) => console.error("Playback error:", err));
    } else {
      this.audio.pause();
    }
  }

  stopAudio() {
    if (!this.audioLoaded) return;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audioCurrentTime = 0;
    this._stopTimeSync();
  }

  /**
   * @param {number} time
   */
  seekAudioTo(time) {
    if (!this.audioLoaded) return;
    this.audio.currentTime = Math.max(0, Math.min(time, this.audioDuration));
    this.audioCurrentTime = this.audio.currentTime;
  }

  /**
   * @param {any} file
   */
  handleAudioUpload(file) {
    if (!file) return;
    this.audioLoaded = false;
    const url = URL.createObjectURL(file);
    this.audio.src = url;
    this.audio.load();
  }

  // Optimized History snapshot using fast shallow object copying
  pushState() {
    const snapshot = this.words.map((w) => ({ ...w }));
    if (this.currentHistoryIndex >= 0 && this.currentHistoryIndex < this.history.length) {
      const lastState = this.history[this.currentHistoryIndex];
      if (this._isEqual(lastState, snapshot)) {
        return; // No actual changes, skip pushing
      }
    }

    if (this.currentHistoryIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentHistoryIndex + 1);
    }

    this.history.push(snapshot);

    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
    } else {
      this.currentHistoryIndex++;
    }
  }

  /**
   * @param {any[]} a
   * @param {any[]} b
   */
  _isEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (
        a[i].word !== b[i].word ||
        a[i].speaker !== b[i].speaker ||
        a[i].start !== b[i].start ||
        a[i].end !== b[i].end
      ) {
        return false;
      }
    }
    return true;
  }

  undo() {
    if (this.currentHistoryIndex > 0) {
      this.currentHistoryIndex--;
      this.words = this.history[this.currentHistoryIndex].map((/** @type {any} */ w) => ({ ...w }));
    }
  }

  redo() {
    if (this.currentHistoryIndex < this.history.length - 1) {
      this.currentHistoryIndex++;
      this.words = this.history[this.currentHistoryIndex].map((/** @type {any} */ w) => ({ ...w }));
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
    this.audio.pause();
    this.audio.src = "";
    this._stopTimeSync();
  }
}
