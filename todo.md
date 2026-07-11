# Verbatim UI - Task Board

## 1. Documentation & Meta
- [x] Formalize `docs` directory structure (`adr` and `system` categories).
- [x] Ensure all changes are committed by context.

## 2. Technical Debt & Architecture
- [ ] **State Management Optimization**: Replace full-array cloning in Undo/Redo with a true patch/diff-based system (e.g., JSON patches) to save memory on large transcripts.
- [ ] **Caret Focus Fix**: Fix the bug where dynamic text-binding in `contenteditable` causes the caret to jump to the beginning of the word during live editing.
- [ ] **CSV Schema Validation**: Add robust validation for `papaparse` to ensure `word`, `start`, `end`, `score`, and `speaker` columns exist before parsing, preventing app crashes.
- [ ] **WaveSurfer Memory Leak**: Ensure the `wavesurfer.js` canvas container node is cleared upon destruction/re-instantiation in `AudioPlayer.svelte`.
- [ ] **Audio Error Handling**: Add event listeners for `<audio>` `onerror` and `onstalled` to gracefully handle failed local file conversions or missing media.
- [ ] **Tauri IPC Cleanup**: Remove the unused `load_csv_data` Rust command from `src-tauri/src/lib.rs`.
- [ ] **Tauri App Configuration**: Update `tauri.conf.json` to replace default `"productName": "tauri-app"` and `"identifier": "com.bit.tauri-app"` with proper project values.
- [ ] **Environment Helpers**: Centralize `window.__TAURI_INTERNALS__` sniffing into a single `isTauri()` utility function.
- [ ] **Svelte Modernization**: Update `src/routes/+layout.svelte` to replace deprecated `<slot />` with `{@render children()}`.
- [ ] **Type Safety**: Introduce proper TypeScript interfaces or JSDoc definitions for `Word`, `SentenceGroup`, and store states.

## 3. Functional Features
- [ ] **Confidence Score Visualization**: Add UI cues (like underlines or opacity changes) for words with low ASR confidence scores.
- [ ] **Interactive Waveform**: Implement click-to-seek directly on the waveform, add a visual timestamp timeline, and provide zoom in/out controls.
- [ ] **Editor Playback Shortcuts**: Add keyboard shortcuts (e.g., `Esc` to toggle play/pause, `Ctrl+Left/Right` to skip) that work while editing a `contenteditable` word without losing focus.
- [ ] **Advanced Segment Editing**:
  - [ ] **Word Splitter**: Divide a single word block into two.
  - [ ] **Word Merger**: Combine two adjacent words.
  - [ ] **Timestamp Editor**: Allow manual tuning of a word's `start` and `end` times.
- [ ] **Audio HUD**: Add volume control slider and mute toggle to the player bar.
- [ ] **Themes**: Add a Dark/Light mode toggle.
- [ ] **Testing**: Set up Vitest for components and Playwright for Tauri E2E tests.
