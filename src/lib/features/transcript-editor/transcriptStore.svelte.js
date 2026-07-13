import Papa from "papaparse";
import { applyPatch, compare } from "fast-json-patch";

export class TranscriptStore {
  /** @type {any[]} */
  words = $state([]);
  /** @type {number | null} */
  activeWordIndex = $state(null);
  isLoading = $state(true);
  errorMsg = $state("");

  showUnderlines = $state(true);

  // Speaker color map
  /** @type {Record<string, string>} */
  speakerColors = $state({});
  palette = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
    "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
  ];

  /** @type {string | null} */
  currentFilePath = null;

  // History lists
  /** @type {any[]} */
  history = [];
  currentHistoryIndex = -1;
  MAX_HISTORY = 50;

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

  _validateCsv(results) {
    const required = ["word", "start", "end", "score", "speaker"];
    const fields = results.meta.fields || (results.data[0] ? Object.keys(results.data[0]) : []);
    const missing = required.filter((f) => !fields.includes(f));
    if (missing.length > 0) {
      throw new Error(`Invalid CSV schema. Missing columns: ${missing.join(", ")}`);
    }
  }

  assignSpeakerColors() {
    this.speakers.forEach((sp, idx) => {
      if (!this.speakerColors[sp]) {
        this.speakerColors[sp] = this.palette[idx % this.palette.length];
      }
    });
  }

  async initDemo() {
    this.isLoading = false;
    this.errorMsg = "";
    this.currentFilePath = null;
    this.words = [];
    this.history = [];
    this.currentHistoryIndex = -1;
  }

  async loadDemoData(audioStore) {
    this.isLoading = true;
    this.errorMsg = "";
    this.currentFilePath = null;
    
    if (audioStore) {
      audioStore.loadAudioFromUrl("/artikulasi.mp3");
    }

    try {
      const response = await fetch("/artikulasi.csv");
      if (!response.ok) {
        throw new Error("Demo data not found on server.");
      }
      const csvStr = await response.text();
      Papa.parse(csvStr, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          this.words = results.data.map((w) => ({
            ...w,
            id: Math.random().toString(36).substring(2, 10),
          }));

          this.assignSpeakerColors();
          this.history = [];
          this.currentHistoryIndex = -1;
          this.pushState();

          this.isLoading = false;
        },
        error: (err) => {
          this.errorMsg = err.message;
          this.isLoading = false;
        },
      });
    } catch (e) {
      this.errorMsg = e instanceof Error ? e.message : String(e);
      this.isLoading = false;
    }
  }

  loadCsv(file, audioStore) {
    this.isLoading = true;
    this.errorMsg = "";
    this.currentFilePath = null;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          this._validateCsv(results);
        } catch (e) {
          this.errorMsg = e instanceof Error ? e.message : String(e);
          this.isLoading = false;
          return;
        }

        this.words = results.data.map((w) => ({
          ...w,
          id: Math.random().toString(36).substring(2, 10),
        }));

        this.assignSpeakerColors();
        this.history = [];
        this.currentHistoryIndex = -1;
        this.pushState();

        if (audioStore) {
          const expectedAudio = file.name.replace(/\.csv$/i, ".mp3");
          audioStore.loadAudioFromUrl("/" + expectedAudio);
        }

        this.isLoading = false;
      },
      error: (err) => {
        this.errorMsg = err.message;
        this.isLoading = false;
      },
    });
  }

  async loadCsvFromString(csvStr, path = null) {
    this.isLoading = true;
    this.errorMsg = "";
    if (path) this.currentFilePath = path;

    return new Promise((resolve, reject) => {
      Papa.parse(csvStr, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            this._validateCsv(results);
          } catch (e) {
            this.errorMsg = e instanceof Error ? e.message : String(e);
            this.isLoading = false;
            reject(e);
            return;
          }

          this.words = results.data.map((w) => ({
            ...w,
            id: Math.random().toString(36).substring(2, 10),
          }));

          this.assignSpeakerColors();
          this.history = [];
          this.currentHistoryIndex = -1;
          this.pushState();

          this.isLoading = false;
          resolve(true);
        },
        error: (err) => {
          this.errorMsg = err.message;
          this.isLoading = false;
          reject(err);
        },
      });
    });
  }

  getCsvString() {
    return Papa.unparse(
      this.words.map((w) => {
        const { id, originalIndex, ...rest } = w;
        return rest;
      })
    );
  }

  pushState() {
    const currentSnapshot = this.words.map((w) => ({ ...w }));

    if (this.currentHistoryIndex === -1) {
      this.history = [{ full: currentSnapshot }];
      this.currentHistoryIndex = 0;
      return;
    }

    const lastState = this._getStateAt(this.currentHistoryIndex);
    const patch = compare(lastState, currentSnapshot);

    if (patch.length === 0) return;

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

  splitSegmentAt(wordIndex, newSpeakerName) {
    if (wordIndex < 0 || wordIndex >= this.words.length) return;
    
    const currentSpeaker = this.words[wordIndex].speaker;
    for (let i = wordIndex; i < this.words.length; i++) {
      if (this.words[i].speaker === currentSpeaker) {
        this.words[i].speaker = newSpeakerName;
      } else {
        break;
      }
    }

    this.words = this.words;
    this.assignSpeakerColors();
    this.pushState();
  }

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

  updateTimestamp(index, start, end) {
    if (index < 0 || index >= this.words.length) return;
    this.words[index].start = start;
    this.words[index].end = end;
    this.pushState();
  }

  findAndReplace(findText, replaceText, options = {}) {
    const { caseSensitive = false, useRegex = false, wholeWord = false } = options;
    if (!findText) return 0;
    
    let searchRegex;
    try {
      let pattern = useRegex ? findText : findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (wholeWord) pattern = `\\b${pattern}\\b`;
      const flags = caseSensitive ? "g" : "gi";
      searchRegex = new RegExp(pattern, flags);
    } catch (e) {
      console.error("Invalid regex pattern", e);
      return 0;
    }

    let count = 0;
    this.words = this.words.map((w) => {
      const wordVal = w.word || "";
      searchRegex.lastIndex = 0;
      if (searchRegex.test(wordVal)) {
        count++;
        searchRegex.lastIndex = 0;
        const newWord = wordVal.replace(searchRegex, replaceText);
        return { ...w, word: newWord };
      }
      return w;
    });

    if (count > 0) this.pushState();
    return count;
  }
}
