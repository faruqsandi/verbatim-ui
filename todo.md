# Verbatim UI - Task Board

## 1. Documentation & Meta
- [x] Formalize `docs` directory structure (`adr` and `system` categories).
- [x] Ensure all changes are committed by context.

## 2. Technical Debt & Architecture
- [x] **State Management Optimization**: Replace full-array cloning in Undo/Redo with a true patch/diff-based system (e.g., JSON patches) to save memory on large transcripts.
- [x] **Caret Focus Fix**: Fix the bug where dynamic text-binding in `contenteditable` causes the caret to jump to the beginning of the word during live editing.
- [x] **CSV Schema Validation**: Add robust validation for `papaparse` to ensure `word`, `start`, `end`, `score`, and `speaker` columns exist before parsing, preventing app crashes.
- [x] **WaveSurfer Memory Leak**: Ensure the `wavesurfer.js` canvas container node is cleared upon destruction/re-instantiation in `AudioPlayer.svelte`.
- [x] **Audio Error Handling**: Add event listeners for `<audio>` `onerror` and `onstalled` to gracefully handle failed local file conversions or missing media.
- [x] **Tauri IPC Cleanup**: Remove the unused `load_csv_data` Rust command from `src-tauri/src/lib.rs`.
- [x] **Tauri App Configuration**: Update `tauri.conf.json` to replace default `"productName": "tauri-app"` and `"identifier": "com.bit.tauri-app"` with proper project values.
- [x] **Environment Helpers**: Centralize `window.__TAURI_INTERNALS__` sniffing into a single `isTauri()` utility function.
- [x] **Svelte Modernization**: Update `src/routes/+layout.svelte` to replace deprecated `<slot />` with `{@render children()}`.
- [x] **Type Safety**: Introduce proper TypeScript interfaces or JSDoc definitions for `Word`, `SentenceGroup`, and store states.

## 3. Functional Features
- [x] **Confidence Score Visualization**: Add UI cues (like underlines or opacity changes) for words with low ASR confidence scores.
- [x] **Interactive Waveform**: Implement click-to-seek directly on the waveform, add a visual timestamp timeline, and provide zoom in/out controls.
- [x] **Editor Playback Shortcuts**: Add keyboard shortcuts (e.g., `Esc` to toggle play/pause, `Ctrl+Left/Right` to skip) that work while editing a `contenteditable` word without losing focus.
- [x] **Advanced Segment Editing**:
  - [x] **Word Splitter**: Divide a single word block into two.
  - [x] **Word Merger**: Combine two adjacent words.
  - [x] **Timestamp Editor**: Allow manual tuning of a word's `start` and `end` times.
- [x] **Audio HUD**: Add volume control slider and mute toggle to the player bar.
- [x] **Themes**: Add a Dark/Light mode toggle.
- [x] **Testing**: Set up Vitest for components and Playwright for Tauri E2E tests.
