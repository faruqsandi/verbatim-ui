import { tick } from "svelte";
import Papa from "papaparse";
import { isTauri } from "../utils/env.js";
import { applyPatch, compare } from "fast-json-patch";

/**
 * @param {any} seconds
 * @param {boolean} [isSrt]
 */
function formatTimeSub(seconds, isSrt = false) {
  const s = parseFloat(seconds) || 0;
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);

  const pad = (/** @type {number} */ num, /** @type {number} */ len = 2) => String(num).padStart(len, "0");
  const msDelim = isSrt ? "," : ".";

  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}${msDelim}${pad(ms, 3)}`;
}

/**
 * @typedef {Object} Word
 * @property {string} id
 * @property {string} word
 * @property {string} start
 * @property {string} end
 * @property {string} speaker
 * @property {number} [score]
 */

/**
 * @typedef {Object} SentenceGroup
 * @property {string} id
 * @property {string} speaker
 * @property {Array<{word: Word, index: number}>} words
 */

export class TranscriptState {
  // Reactive state using Svelte 5 runes
  /** @type {Word[]} */
  words = $state([]);
  /** @type {number | null} */
  activeWordIndex = $state(null);
  isLoading = $state(true);
  errorMsg = $state("");

  // Visual options
  showUnderlines = $state(true);
  showTablePanel = $state(false);
  fontScale = $state(1.0);
  isDarkMode = $state(false);

  // Audio Playback State
  audioLoaded = $state(false);
  audioDuration = $state(0);
  audioCurrentTime = $state(0);
  audioPaused = $state(true);
  playbackRate = $state(1.0);

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

  // File Path State for Tauri Desktop native saving
  /** @type {string | null} */
  currentFilePath = null;

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

    this.audio.onerror = () => {
      this.errorMsg = "Error: Failed to load audio file.";
      this.isLoading = false;
    };

    this.audio.onstalled = () => {
      this.errorMsg = "Warning: Audio loading stalled.";
    };

    this.audio.onseeked = () => {
      this.audioCurrentTime = this.audio.currentTime;
    };

    this.audio.onratechange = () => {
      this.playbackRate = this.audio.playbackRate;
    };
  }

  /**
   * @param {any} results
   */
  _validateCsv(results) {
    const required = ["word", "start", "end", "score", "speaker"];
    const fields = results.meta.fields || (results.data[0] ? Object.keys(results.data[0]) : []);
    const missing = required.filter((f) => !fields.includes(f));
    if (missing.length > 0) {
      throw new Error(`Invalid CSV schema. Missing columns: ${missing.join(", ")}`);
    }
  }

  // Initialize and load default demo data
  async initDemo() {
    this.isLoading = true;
    this.errorMsg = "";
    this.currentFilePath = null;
    
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
    this.currentFilePath = null;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (/** @type {any} */ results) => {
        try {
          this._validateCsv(results);
        } catch (e) {
          this.errorMsg = e instanceof Error ? e.message : String(e);
          this.isLoading = false;
          return;
        }

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

  // Native Open/Read CSV (Tauri Desktop mode)
  async selectAndLoadCsv() {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({
        filters: [{ name: "CSV Data", extensions: ["csv"] }],
        multiple: false,
      });

      if (path && typeof path === "string") {
        await this.loadCsvFromNativePath(path);
      }
    } catch (err) {
      console.error("Tauri open CSV error:", err);
    }
  }

  /**
   * @param {string} path
   */
  async loadCsvFromNativePath(path) {
    try {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      this.isLoading = true;
      this.errorMsg = "";
      this.currentFilePath = path;

      const csvStr = await readTextFile(path);
      Papa.parse(csvStr, {
        header: true,
        skipEmptyLines: true,
        complete: (/** @type {any} */ results) => {
          try {
            this._validateCsv(results);
          } catch (e) {
            this.errorMsg = e instanceof Error ? e.message : String(e);
            this.isLoading = false;
            return;
          }

          this.words = results.data.map((/** @type {any} */ w) => ({
            ...w,
            id: Math.random().toString(36).substring(2, 10),
          }));

          this.assignSpeakerColors();
          this.history = [];
          this.currentHistoryIndex = -1;
          this.pushState();

          this.autoLoadAudioForCsv(path);
          this.isLoading = false;
        },
        error: (/** @type {any} */ err) => {
          this.errorMsg = err.message;
          this.isLoading = false;
        },
      });
    } catch (err) {
      console.error("Tauri load CSV error:", err);
      this.errorMsg = err instanceof Error ? err.message : String(err);
      this.isLoading = false;
    }
  }

  /**
   * @param {string} csvPath
   */
  autoLoadAudioForCsv(csvPath) {
    const audioPathCandidate = csvPath.replace(/\.csv$/i, ".mp3");
    this.loadAudioFromNativePath(audioPathCandidate);
  }

  // Native Save CSV (Tauri Desktop mode)
  async saveCsv() {
    const csvStr = Papa.unparse(
      this.words.map((w) => {
        // Remove internal properties
        const { id, originalIndex, ...rest } = w;
        return rest;
      }),
    );

    if (isTauri() && this.currentFilePath) {
      try {
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        await writeTextFile(this.currentFilePath, csvStr);
        return; // File overwritten successfully
      } catch (err) {
        console.error("Failed to write native file directly:", err);
      }
    }

    // Trigger Save As
    await this.saveCsvAs(csvStr);
  }

  /**
   * @param {string} csvStr
   */
  async saveCsvAs(csvStr) {
    if (isTauri()) {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        
        const path = await save({
          filters: [{ name: "CSV Data", extensions: ["csv"] }],
          defaultPath: this.currentFilePath || "transcript_edited.csv",
        });

        if (path) {
          await writeTextFile(path, csvStr);
          this.currentFilePath = path;
        }
        return;
      } catch (err) {
        console.error("Tauri save dialog error:", err);
      }
    }

    // Web browser fallback
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

  // Native Open Audio (Tauri Desktop mode)
  async selectAndLoadAudio() {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({
        filters: [{ name: "Audio Files", extensions: ["mp3", "wav", "ogg", "m4a", "flac"] }],
        multiple: false,
      });

      if (path && typeof path === "string") {
        await this.loadAudioFromNativePath(path);
      }
    } catch (err) {
      console.error("Tauri open audio error:", err);
    }
  }

  /**
   * @param {string} nativePath
   */
  async loadAudioFromNativePath(nativePath) {
    try {
      const { convertFileSrc } = await import("@tauri-apps/api/core");
      const audioUrl = convertFileSrc(nativePath);
      this.audioLoaded = false;
      this.audio.src = audioUrl;
      this.audio.load();
    } catch (err) {
      console.error("Tauri convert file src error:", err);
    }
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
   * @param {number} rate
   */
  setPlaybackRate(rate) {
    this.playbackRate = rate;
    this.audio.playbackRate = rate;
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

  // Optimized History snapshot using fast-json-patch
  pushState() {
    const currentSnapshot = this.words.map((w) => ({ ...w }));

    if (this.currentHistoryIndex === -1) {
      this.history = [{ full: currentSnapshot }];
      this.currentHistoryIndex = 0;
      return;
    }

    const lastState = this._getStateAt(this.currentHistoryIndex);
    const patch = compare(lastState, currentSnapshot);

    if (patch.length === 0) {
      return; // No actual changes, skip pushing
    }

    if (this.currentHistoryIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentHistoryIndex + 1);
    }

    this.history.push({ patch });

    if (this.history.length > this.MAX_HISTORY) {
      const baseState = this.history[0].full;
      const firstPatch = this.history[1].patch;
      const newBaseState = applyPatch(baseState.map(w => ({ ...w })), firstPatch).newDocument;
      this.history.shift();
      this.history[0] = { full: newBaseState };
    } else {
      this.currentHistoryIndex++;
    }
  }

  _getStateAt(index) {
    if (!this.history[0] || !this.history[0].full) return [];
    
    let state = this.history[0].full.map((w) => ({ ...w }));
    for (let i = 1; i <= index; i++) {
      if (this.history[i].patch) {
        state = applyPatch(state, this.history[i].patch).newDocument;
      }
    }
    return state;
  }

  undo() {
    if (this.currentHistoryIndex > 0) {
      this.currentHistoryIndex--;
      this.words = this._getStateAt(this.currentHistoryIndex);
    }
  }

  redo() {
    if (this.currentHistoryIndex < this.history.length - 1) {
      this.currentHistoryIndex++;
      this.words = this._getStateAt(this.currentHistoryIndex);
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

  // Segment Splitter
  /**
   * @param {number} wordIndex
   * @param {string} newSpeakerName
   */
  splitSegmentAt(wordIndex, newSpeakerName) {
    if (wordIndex < 0 || wordIndex >= this.words.length) return;
    
    const currentSpeaker = this.words[wordIndex].speaker;
    for (let i = wordIndex; i < this.words.length; i++) {
      if (this.words[i].speaker === currentSpeaker) {
        this.words[i].speaker = newSpeakerName;
      } else {
        break; // Stop at next speaker block
      }
    }

    this.words = this.words;
    this.assignSpeakerColors();
    this.pushState();
  }

  // Advanced Segment Editing
  /**
   * @param {number} index
   */
  splitWord(index) {
    if (index < 0 || index >= this.words.length) return;
    const w = this.words[index];
    const text = w.word;
    if (text.length < 2) return;
    
    const mid = Math.floor(text.length / 2);
    const part1 = text.substring(0, mid);
    const part2 = text.substring(mid);
    
    const start = parseFloat(w.start);
    const end = parseFloat(w.end);
    const midTime = start + (end - start) / 2;

    const w1 = { ...w, word: part1, end: midTime.toFixed(3), id: Math.random().toString(36).substring(2, 10) };
    const w2 = { ...w, word: part2, start: midTime.toFixed(3), id: Math.random().toString(36).substring(2, 10) };

    this.words.splice(index, 1, w1, w2);
    this.pushState();
  }

  /**
   * @param {number} index
   */
  mergeWord(index) {
    if (index < 0 || index >= this.words.length - 1) return;
    const w1 = this.words[index];
    const w2 = this.words[index + 1];

    if (w1.speaker !== w2.speaker) return;

    w1.word = w1.word + w2.word;
    w1.end = w2.end;
    this.words.splice(index + 1, 1);
    this.pushState();
  }

  /**
   * @param {number} index
   * @param {string} start
   * @param {string} end
   */
  updateTimestamp(index, start, end) {
    if (index < 0 || index >= this.words.length) return;
    this.words[index].start = start;
    this.words[index].end = end;
    this.pushState();
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  // Global Search and Replace
  /**
   * @param {string} findText
   * @param {string} replaceText
   * @param {boolean} [caseSensitive]
   */
  findAndReplace(findText, replaceText, caseSensitive = false) {
    if (!findText) return 0;
    let count = 0;
    const search = caseSensitive ? findText : findText.toLowerCase();

    this.words = this.words.map((w) => {
      const wordVal = w.word || "";
      const matchVal = caseSensitive ? wordVal : wordVal.toLowerCase();

      if (matchVal.includes(search)) {
        count++;
        let newWord;
        if (caseSensitive) {
          newWord = wordVal.split(findText).join(replaceText);
        } else {
          const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
          newWord = wordVal.replace(regex, replaceText);
        }
        return { ...w, word: newWord };
      }
      return w;
    });

    if (count > 0) {
      this.pushState();
    }
    return count;
  }

  // Subtitle Exporters
  exportToSrt() {
    const lines = this.sentenceGroups.map((/** @type {any} */ group, /** @type {number} */ idx) => {
      const start = formatTimeSub(group.words[0].word.start, true);
      const end = formatTimeSub(group.words[group.words.length - 1].word.end, true);
      const text = group.words.map((/** @type {any} */ w) => w.word.word).join(" ");
      return `${idx + 1}\n${start} --> ${end}\n${group.speaker || "Unknown"}: ${text}\n`;
    }).join("\n");
    this._downloadSubFile(lines, "transcript.srt", "text/srt");
  }

  exportToVtt() {
    const header = "WEBVTT\n\n";
    const lines = this.sentenceGroups.map((/** @type {any} */ group, /** @type {number} */ idx) => {
      const start = formatTimeSub(group.words[0].word.start, false);
      const end = formatTimeSub(group.words[group.words.length - 1].word.end, false);
      const text = group.words.map((/** @type {any} */ w) => w.word.word).join(" ");
      return `${idx + 1}\n${start} --> ${end}\n<v ${group.speaker || "Unknown"}>${text}\n`;
    }).join("\n");
    this._downloadSubFile(header + lines, "transcript.vtt", "text/vtt");
  }

  exportToTxt() {
    const lines = this.sentenceGroups.map((/** @type {any} */ group) => {
      const text = group.words.map((/** @type {any} */ w) => w.word.word).join(" ");
      return `${group.speaker || "Unknown"}: ${text}`;
    }).join("\n\n");
    this._downloadSubFile(lines, "transcript.txt", "text/plain");
  }

  /**
   * @param {string} content
   * @param {string} filename
   * @param {string} mimeType
   */
  async _downloadSubFile(content, filename, mimeType) {
    if (isTauri()) {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        
        const path = await save({
          filters: [{ name: filename.split(".")[1].toUpperCase() + " File", extensions: [filename.split(".")[1]] }],
          defaultPath: filename,
        });

        if (path) {
          await writeTextFile(path, content);
        }
        return;
      } catch (err) {
        console.error("Tauri save subtitle error:", err);
      }
    }

    // Web browser fallback
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Clean up
  destroy() {
    this.audio.pause();
    this.audio.src = "";
    this._stopTimeSync();
  }
}
