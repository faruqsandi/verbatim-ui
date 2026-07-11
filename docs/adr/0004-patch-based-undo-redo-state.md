# ADR-0004: Patch-Based Undo/Redo State Management

## Context

Verbatim UI maintains an undo/redo stack to recover previous states during transcription correction. Currently, this stack is implemented in [transcript.svelte.js](file:///home/bit/Playground/verbatim-ui/src/lib/state/transcript.svelte.js#L463) by creating a full clone of the `words` array on every change:
```javascript
const snapshot = this.words.map((w) => ({ ...w }));
```
For transcriptions containing thousands of words, this shallow-cloning approach is highly inefficient. Pushing full states up to 50 times consumes unnecessary memory, increases garbage collection frequency, and degrades performance during frequent edits.

Additionally, states are pushed on every input blur without debouncing, which results in redundant history steps during rapid, incremental changes.

## Decision

We will:
1.  **Transition to a Diff/Patch History System**:
    *   Instead of storing complete array snapshots, the history stack will store diffs (deltas) between consecutive states (e.g., using JSON Patches matching the RFC 6902 standard or simple index-based change operations).
    *   `undo()` will apply backward patches to revert the state, and `redo()` will apply forward patches to advance it.
2.  **Throttle State Pushes**:
    *   Introduce a debounced/throttled state-saver that groups quick edits (e.g., key-presses inside the same word or rapid changes) into a single logical history change.

## Consequences

*   **Pros**:
    *   **Memory Efficiency**: Memory footprint is significantly reduced, as each history step only records changes (e.g., a single character change or a speaker switch) instead of thousands of unaffected word elements.
    *   **Scale Ready**: Allows the application to handle long, multi-hour transcripts seamlessly.
    *   **Granular History**: Clear logs of what exactly changed at each undo/redo action.
*   **Cons**:
    *   **Traversal Complexity**: Reverting state requires applying a sequence of patches sequentially, which is mathematically more complex than simply swapping the array reference.
