# Verbatim UI Improvement Tasks

This TODO list outlines actionable tasks to address the architectural issues, technical debt, and missing features identified in the Verbatim UI project.

## 📋 Meta Tasks (Current Sprint)
- [x] **Codebase Analysis**: Perform complete walkthrough and compile analysis report.
- [x] **Task List Expansion**: Expand new suggestions into actionable tasks in `todo.md`.
- [x] **Architecture Decision Records (ADRs)**: Document proposed changes (Undo/Redo optimization, Caret jumping, etc.) in `docs/adr/`.
- [x] **System Architecture Update**: Update `docs/system/architecture.md` to reflect Tauri v2 plugins and Svelte 5 state management.
- [x] **Context-Based Commits**: Create separate git commits for each change context.


---

## 🧱 1. Code Architecture & Modularization
- [ ] **Svelte 5 Layout Modernization**:
  - [ ] Refactor [src/routes/+layout.svelte](file:///home/bit/Playground/verbatim-ui/src/routes/+layout.svelte) to replace the deprecated `<slot />` with the new Svelte 5 `{@render children()}` syntax.
- [ ] **Remove Dead Rust Code**:
  - [ ] Delete the unused `load_csv_data` Rust command in [src-tauri/src/lib.rs](file:///home/bit/Playground/verbatim-ui/src-tauri/src/lib.rs).
  - [ ] Remove the command registration in the native handler (`.invoke_handler(...)`).
- [ ] **Centralize Environment Sniffing**:
  - [ ] Create a central helper function `isTauri()` to replace redundant checks for `window.__TAURI_INTERNALS__` in components and state managers.
- [ ] **Clean Dynamic Imports**:
  - [ ] Standardize the dynamic imports for `@tauri-apps/plugin-fs` and `@tauri-apps/plugin-dialog` inside [transcript.svelte.js](file:///home/bit/Playground/verbatim-ui/src/lib/state/transcript.svelte.js) to avoid ad-hoc imports.

---

## ⚙️ 2. Performance & Technical Optimization
- [ ] **True Patch-based Undo/Redo**:
  - [ ] Replace full-array snapshotting in `pushState()` with a diff/patch-based system (e.g., using RFC 6902 JSON patches or delta objects).
  - [ ] Implement state pushes throttling or debouncing during active word-editing sessions to avoid overhead.
- [ ] **Fix Caret Focus Jump**:
  - [ ] Refactor caretaker synchronization in [src/lib/components/WordBubble.svelte](file:///home/bit/Playground/verbatim-ui/src/lib/components/WordBubble.svelte) to prevent the cursor from snapping to the beginning of the word during live editing.
- [ ] **CSV Schema Validation**:
  - [ ] Implement strict schema verification in `Papa.parse()` callback inside [transcript.svelte.js](file:///home/bit/Playground/verbatim-ui/src/lib/state/transcript.svelte.js).
  - [ ] Ensure files missing `word`, `start`, `end`, `score`, or `speaker` headers are caught and trigger clean user-facing alerts instead of crashing the UI.
- [ ] **Robust Audio Load Error Handling**:
  - [ ] Listen to HTML5 `<audio>`'s `onerror` and `onstalled` events in the state constructor.
  - [ ] Expose an `audioError` state and display error messages in the HUD when a native path conversion fails or a file cannot be found.
- [ ] **Waveform Container Memory Cleanliness**:
  - [ ] Ensure the container DOM element in [src/lib/components/AudioPlayer.svelte](file:///home/bit/Playground/verbatim-ui/src/lib/components/AudioPlayer.svelte) is completely cleared of old canvas nodes before instantiating WaveSurfer to avoid leaks.
- [ ] **TypeScript / JSDoc Type Safety**:
  - [ ] Establish strict JSDoc definitions or migrate files to `.ts` / `.svelte` TypeScript files to properly define types like `Word`, `SentenceGroup`, and player configuration objects.

---

## 🎨 3. Functional & UI Features
- [ ] **Confidence Score Visualization**:
  - [ ] Add visual cues (e.g., orange/red dotted underlines or lighter opacity values) to word bubbles that have low confidence scores (e.g., `score < 0.8`).
- [ ] **Interactive Waveform Timeline**:
  - [ ] Enable click-to-seek directly on the waveform visualization.
  - [ ] Integrate a visual timeline showing timestamps along the waveform.
  - [ ] Add timeline zooming controls (zoom in/out) to examine small, precise audio gaps.
- [ ] **Active Editor Playback Shortcuts**:
  - [ ] Add global listener for keys like `Esc` or `Ctrl+Space` to toggle play/pause while editing contenteditable word bubbles without losing focus.
  - [ ] Add shortcuts to skip back (e.g., `Ctrl+Left` for 3 seconds rewind) and skip forward.
- [ ] **Audio HUD Customization**:
  - [ ] Add a volume control slider and mute button to the [AudioPlayer](file:///home/bit/Playground/verbatim-ui/src/lib/components/AudioPlayer.svelte) bar.
- [ ] **Advanced Segment Operations**:
  - [ ] **Word Splitter**: Implement a method to split a single word bubble into two with divided duration.
  - [ ] **Word Merger**: Implement a method to combine two selected word bubbles.
  - [ ] **Timestamp Editor**: Allow manual timestamp adjustment of individual words.
- [ ] **Visual Themes (Dark Mode)**:
  - [ ] Implement a CSS-variable-based dark/light theme switch in the toolbar.
- [ ] **Automated Testing Setup**:
  - [ ] Set up Vitest/Testing Library for component tests and Playwright for Tauri integration testing.

---

## 🎒 Completed Tasks (Historical Record)
- [x] **Break down `+page.svelte` into subcomponents** (Toolbar, AudioPlayer, TranscriptArea, WordBubble, SpeakerLegend).
- [x] **Migrate to Svelte 5 syntax** (State variables to Svelte 5 Runes, modernized handlers, callback props).
- [x] **Extract state management** to `src/lib/state/transcript.svelte.js` context structure.
- [x] **Initial Undo/Redo history stack** (Basic shallow cloning logic).
- [x] **Fix audio memory issues** (Replaced decodeAudioData buffer loading with HTML5 `<audio>` streaming).
- [x] **Refactor caret focus logic** (Replaced document selectors with Svelte-managed binding refs).
- [x] **Integrate Native Dialogs** (`@tauri-apps/plugin-dialog` native open/save dialogs).
- [x] **Integrate File System Access** (`@tauri-apps/plugin-fs` direct write/read).
- [x] **Activate Tauri backend commands** (Connected file loading to native paths).
- [x] **Drag and Drop** (Tauri file drop event handler integration).
- [x] **Audio Waveform Visualization** (Basic read-only `wavesurfer.js` view).
- [x] **Playback Speed Control** (Speed selector in audio bar).
- [x] **Subtitle Exporters** (SRT, WebVTT, TXT export files).
- [x] **Search and Replace** (Global search and replace drawer).
- [x] **Diarization Enhancements** (Color picker for speaker legend and speaker renaming logic).
