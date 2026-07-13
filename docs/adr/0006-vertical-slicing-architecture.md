# ADR-0006: Migrate to Vertical Slicing Architecture and Domain Stores

## Context

Following the initial component modularization in ADR-0001, the application grew to rely on a single, massive Svelte 5 class called `TranscriptState`. This "God Object" managed everything from transcription word data, history (undo/redo), and audio playback synchronization, to UI dark mode toggles, contextual menus, and native OS file dialogues. 

Additionally, the components were organized horizontally (i.e. all components inside `src/lib/components`, all state inside `src/lib/state`), making it difficult to find related pieces of functionality or scale the app with new features. DOM references were also kept inside the global state, causing tightly coupled interactions.

## Decision

We will migrate the architecture to **Feature-Driven Architecture (Vertical Slicing)** and decompose the global state object.

1.  **Vertical Slicing**:
    *   Group files by domain feature into `src/lib/features/`.
    *   Specific feature directories established: `core`, `audio-player`, `transcript-editor`, `data-view`, `properties-panel`.
2.  **Domain Stores**:
    *   Break down the `TranscriptState` God Object into focused, domain-specific stores:
        *   `UiStore`: Visual toggles, scaling, panel labels, Context Menu.
        *   `AudioStore`: HTML5 audio stream, playback, time polling.
        *   `TranscriptStore`: CSV transcription array, editing logic, undo/redo history stack.
3.  **Storage Adapter**:
    *   Extract mixed Tauri API and Web Fallback calls into a dedicated `StorageAdapter` inside `features/core/`.
4.  **Remove DOM Nodes from State**:
    *   Remove the tracking of physical DOM nodes in Svelte state. Components will use Svelte reactivity and standard HTML `data-index` attributes for keyboard navigation focus.

## Consequences

*   **Pros**:
    *   Highly cohesive architecture where related UI, logic, and state live together in the same directory.
    *   Scalable for adding new features without muddying existing components or state.
    *   Removes memory leaks from storing DOM elements in reactive stores.
    *   Separates native OS boundaries (Tauri logic) smoothly using an adapter pattern.
*   **Cons**:
    *   Requires passing multiple contexts (`UI_STORE`, `AUDIO_STORE`, `TRANSCRIPT_STORE`) to components, slightly increasing boilerplate.
    *   Cross-domain communication requires stores to reference one another occasionally (e.g., `TranscriptStore` seeking audio via `AudioStore`).
