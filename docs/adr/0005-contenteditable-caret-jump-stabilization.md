# ADR-0005: Contenteditable Caret Jump Stabilization

## Context

In [WordBubble.svelte](file:///home/bit/Playground/verbatim-ui/src/lib/components/WordBubble.svelte), individual words are rendered inside contenteditable elements, allowing inline editing. Currently, the text synchronizes with the Svelte 5 state manager using Svelte's two-way text binding:
```svelte
bind:textContent={transcriptState.words[index].word}
```
When Svelte 5's reactivity triggers a state update, the DOM is re-synchronized. In many browsers, this causes the cursor (caret) position to jump back to the beginning of the element or lose its context during active typing. This breaks standard text editing flows.

## Decision

We will:
1.  **Break Two-Way Binding During Editing**:
    *   Change the element binding to a one-way down data flow. The word is rendered using the initial state text, and local modifications are kept in the DOM.
    *   Prevent Svelte from forcibly re-rendering the text content of the element *while* it has active focus.
2.  **Explicit Sync handlers**:
    *   Capture input changes via `oninput` or `onblur`.
    *   Sync changes back to the global state class ([transcript.svelte.js](file:///home/bit/Playground/verbatim-ui/src/lib/state/transcript.svelte.js)) explicitly when the user loses focus (`onblur`) or transitions to another word.

## Consequences

*   **Pros**:
    *   **Smooth Typing**: Eliminates caret jump bugs, restoring native browser typing behaviors in contenteditable components.
    *   **Controlled State Updates**: Prevents unnecessary intermediate reactivity updates on every keystroke.
*   **Cons**:
    *   Requires writing manual input listeners and state sync hooks instead of relying on Svelte's direct `bind:textContent` convenience helper.
