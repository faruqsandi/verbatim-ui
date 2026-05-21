- [x] Scaffold Tauri + Svelte project
- [x] Add mock chat UI components
- [x] Implement word-level timestamps UI
- [x] Implement edit/reassign/split/delete actions
- [x] Add persistence (localStorage)
- [x] Verify app runs (dev instructions)

Priority: Next -> Implement word-range split (select multiple words and split them into a new bubble assigned to a speaker)

Planned UI/UX improvements (actionable items):
- [ ] Implement word-range split
  - Allow selecting a contiguous range of words in a bubble.
  - Provide UI to choose target speaker for the new bubble.
  - Preserve timestamps for moved words and update source bubble.
- [ ] Drag-and-drop bubble reordering
  - Add drag handles to bubbles.
  - Smoothly reorder bubbles in the UI and persist order.
- [ ] Improve selection UX
  - Add click-and-drag selection for words (range selection).
  - Show clear selection highlight and a small action toolbar (assign/split/edit).
- [ ] Timestamp format & display
  - Normalize timestamps to `HH:MM:SS.mmm`.
  - Show timestamp on hover and optionally under each word.
  - Add a user setting to toggle inline vs hover display.
- [ ] Keyboard shortcuts
  - Add shortcuts for split (`Ctrl+Enter`), assign (`Ctrl+Shift+A`), undo (`Ctrl+Z`).
- [ ] Visual feedback & animations
  - Animate bubble moves/splits and provide success toasts.
- [ ] Tests & QA checklist
  - Manual QA checklist for split/reassign/delete flows.
  - Add simple UI tests where feasible.
- [ ] Accessibility improvements
  - Add ARIA attributes, keyboard navigation, focus management.
