# ADR-0001: Modularize Components and Migrate to Svelte 5 Runes

**Status**: Superseded by [ADR-0006](file:///home/bit/Playground/verbatim-ui/docs/adr/0006-vertical-slicing-architecture.md)

## Context

The current frontend codebase features a monolithic page component ([+page.svelte](file:///home/bit/Playground/verbatim-ui/src/routes/+page.svelte)) that spans over 1,450 lines of code. This single file manages:
1.  Global keyboard listeners and browser focus controls.
2.  Audio player controls, range sliders, and Web Audio API timelines.
3.  The main transcript viewer with inline word editing and key handlers.
4.  State management, undo/redo history, and imports/exports.
5.  All component CSS styles.

Furthermore, although Svelte 5 is installed, the project uses Svelte 3/4 legacy patterns (e.g., reactive declarations `$:`, `let` properties, and legacy event listeners `on:click`). This makes testing, scaling, and maintaining the app difficult.

## Decision

We will:
1.  **Refactor legacy syntax to Svelte 5 Runes**:
    *   Use `$state` for mutable state (e.g., transcription words, active word index).
    *   Use `$derived` for computed properties (e.g., `sentenceGroups`, button disable states).
    *   Use `$effect` for side effects (e.g., tracking current play time, focusing elements).
2.  **Modularize the Page layout**:
    *   Split the view into logical components under `src/lib/components/`:
        *   `Toolbar.svelte`
        *   `AudioPlayer.svelte`
        *   `TranscriptView.svelte`
        *   `WordItem.svelte` (representing individual contenteditable words)
        *   `SpeakerLegend.svelte`
3.  **Introduce a Context-Based State Store**:
    *   Create a dedicated class `TranscriptState.svelte.js` under `src/lib/state/` to manage words, playback progress, and the history stack.
    *   Inject this state class using Svelte's Context API (`setContext` / `getContext`) to avoid deep prop drilling.

## Consequences

*   **Pros**:
    *   Significantly cleaner code division (reduces [+page.svelte](file:///home/bit/Playground/verbatim-ui/src/routes/+page.svelte) to a simple layout wrapper of less than 100 lines).
    *   Improved Svelte rendering performance, as updates to isolated words only re-render the individual component.
    *   Simplified unit testing of components and business state logic.
*   **Cons**:
    *   Requires refactoring the keyboard event delegation model so child components can safely bubble up actions or intercept keys.
