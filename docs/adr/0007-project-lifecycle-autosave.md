# ADR-0007: Implement Project Lifecycle, .vprj Format, and Autosave

## Context

Previously, Verbatim UI treated `.csv` files as the primary project save format. 
This was problematic because:
1. CSVs cannot store application state metadata (e.g., custom speaker colors, zoom levels).
2. The audio file was loosely coupled (the app lazily searched for an `.mp3` with the exact same name in the same folder).
3. If the user closed the app without saving, all progress was lost.
4. "Saving" on the web fallback always triggered a loud browser "Download" prompt.

## Decision

We will decouple raw data ingestion (Importing CSV/Audio) from Project State Management by introducing a custom project file format, cross-platform autosaving, and modern web APIs.

1.  **The `.vprj` Format**:
    *   A lightweight JSON file containing: `{ version: 1, audioPath, speakers, speakerColors, words }`.
    *   It stores the absolute path to the audio file instead of embedding the audio directly, ensuring saves are instantaneous and file sizes remain tiny.

2.  **Cross-Platform StorageAdapter Enhancements**:
    *   **Web File System Access API**: On the web (Chrome/Edge), the `StorageAdapter` will use `window.showSaveFilePicker()` and retain the `FileSystemFileHandle`. This allows the web fallback to silently overwrite the local `.vprj` file when the user presses `Ctrl+S`, mirroring the native desktop experience.
    *   **Tauri AppData Autosave**: On desktop, a background autosave loop writes a temporary `latest.vprj.tmp` file to the OS's hidden AppData directory using `@tauri-apps/plugin-fs`.
    *   **Web IndexedDB Autosave**: On the web, the autosave loop writes the same temporary JSON to the browser's native `IndexedDB`.

3.  **Empty State (Welcome Screen)**:
    *   The app now boots into a `WelcomeScreen.svelte` if no project is active, guiding the user to either "New Project" (creating an empty `.vprj`) or "Open Project".

## Consequences

*   **Pros**:
    *   Zero data loss due to crashes (Autosave loop + Recovery prompt on mount).
    *   Instant saving (JSON serialization is magnitudes faster than bundling audio).
    *   Web developers testing the app get a native-feeling save experience (no constant downloads).
    *   Speaker colors and metadata are preserved between sessions.
*   **Cons**:
    *   On the web, browsers strictly block reading absolute paths (`audioPath`) from disk automatically. If a user opens a `.vprj` on the web, they will always be prompted to manually re-select the audio file via `<input type="file">` to bypass browser security. This is an accepted trade-off that does not affect the final compiled Tauri Desktop app.
