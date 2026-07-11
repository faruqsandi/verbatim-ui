# ADR-0003: Native Tauri Integration for File Operations

## Context

Currently, Verbatim UI operates under standard web-sandbox limitations. Users load CSV files through standard `<input type="file">` HTML fields, and save modified files via browser blob downloads. 

This model does not provide a native desktop experience. Users cannot directly open files from their hard drives without a browser dialog, overwrite source files, or drag-and-drop file paths onto the window natively.

## Decision

We will:
1.  **Integrate Tauri Dialog and File System Plugins**:
    *   Enable `@tauri-apps/plugin-dialog` to launch OS-native file picker and save prompts.
    *   Enable `@tauri-apps/plugin-fs` to perform direct read and write file operations using absolute file paths.
2.  **Provide Save/Overwrite Mechanisms**:
    *   Expose a "Save" action that directly updates the original source CSV file path.
    *   Expose a "Save As" option that prompts the native OS file explorer.

## Consequences

*   **Pros**:
    *   Provides a genuine native desktop feel.
    *   Allows direct modification of the target CSV file instead of generating incremental `transcript_edited (1).csv` files.
    *   Enables drag-and-drop opening of files from anywhere on the filesystem.
*   **Cons**:
    *   Requires configuring Tauri v2 permissions in [capabilities/default.json](file:///home/bit/Playground/verbatim-ui/src-tauri/capabilities/default.json).
    *   Build artifacts must be configured for target platform permissions (Windows, macOS, Linux).
