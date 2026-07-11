# Verbatim UI Improvement Tasks

This TODO list outlines actionable tasks to address the architectural issues, technical debt, and missing features identified in the Verbatim UI project.

## 🧱 1. Code Architecture & Modularization
- [ ] **Break down `+page.svelte` into subcomponents**:
  - [ ] Create `src/lib/components/Toolbar.svelte` for font scale, layout options, imports/exports.
  - [ ] Create `src/lib/components/AudioPlayer.svelte` for the player bar, seek timeline, play/pause controls.
  - [ ] Create `src/lib/components/TranscriptArea.svelte` for managing sentence speaker segments.
  - [ ] Create `src/lib/components/WordBubble.svelte` for individual editable contenteditable words.
  - [ ] Create `src/lib/components/SpeakerLegend.svelte` for the speaker renaming sidebar.
- [ ] **Migrate to Svelte 5 syntax**:
  - [ ] Refactor state variables to Svelte 5 Runes (`$state()`, `$derived()`, `$effect()`).
  - [ ] Modernize event handlers (change `on:click`, `on:keydown` to `onclick`, `onkeydown`).
  - [ ] Replace `createEventDispatcher` with callback props.
- [ ] **Extract state management**:
  - [ ] Implement a clean, reactive stores or context structure (e.g. `src/lib/state/transcript.svelte.js`) to handle shared state (`words`, `activeWordIndex`, `audioCurrentTime`, undo/redo history) to avoid deep prop drilling.

## ⚙️ 2. Performance & Technical Optimization
- [ ] **Optimize Undo/Redo history stack**:
  - [ ] Replace full-array deep copy (`JSON.stringify`/`JSON.parse`) with a diff-based (patch) change log.
  - [ ] Throttle state pushes during editing (e.g., save state on word change or after brief idle, not on every keystroke).
- [ ] **Fix audio memory issues**:
  - [ ] Replace Web Audio API `decodeAudioData` (in-memory loading) with standard HTML5 `<audio>` streaming or Tauri's asset protocol streaming to allow long recordings.
- [ ] **Refactor caret focus logic**:
  - [ ] Replace brittle `document.getElementById` and manual selection offsets with Svelte-managed binding refs or index trackers.

## 🖥️ 3. Native Desktop (Tauri) Integrations
- [ ] **Integrate Native Dialogs**:
  - [ ] Add `@tauri-apps/plugin-dialog` to project dependencies.
  - [ ] Replace browser HTML file uploads with native Open dialog for audio and CSV files.
  - [ ] Replace mock browser click download with native Save dialog.
- [ ] **Integrate File System Access**:
  - [ ] Add `@tauri-apps/plugin-fs` to write exported files directly to the user-chosen filesystem path.
- [ ] **Activate Tauri backend commands**:
  - [ ] Wire up frontend file loading/saving to call Rust endpoints or invoke native read operations.
- [ ] **Drag and Drop**:
  - [ ] Enable dragging audio and CSV files directly onto the app window to load them.

## 🎨 4. Functional & UI Features
- [ ] **Audio Waveform Visualization**:
  - [ ] Integrate a library like `wavesurfer.js` or write a custom light canvas wave reader to visualize syllables, word segments, and pauses.
- [ ] **Playback Speed Control**:
  - [ ] Add a playback rate dropdown/slider (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2.0x).
- [ ] **Subtitle Exporters**:
  - [ ] Implement SRT exporter module.
  - [ ] Implement WebVTT exporter module.
  - [ ] Implement raw TXT script exporter module.
- [ ] **Search and Replace**:
  - [ ] Implement a find-and-replace drawer to batch update recurring transcription errors.
- [ ] **Diarization Enhancements**:
  - [ ] Add a visual color picker to the speaker legend sidebar to customize speaker colors.
  - [ ] Add ability to insert a new speaker block mid-paragraph.
