# ADR-0002: Memory-Efficient Audio Streaming

## Context

The current audio system fetches the target audio file, converts it into an `ArrayBuffer`, and decodes it completely into PCM data via `AudioContext.decodeAudioData`. 

While this works for short clips, transcription files are typically 30 minutes to several hours long. Decompressing a 100MB MP3 into raw PCM data consumes hundreds of megabytes (or gigabytes) of memory, blocks the CPU, and crashes the WebView instance.

## Decision

We will:
1.  **Migrate to Streaming HTML5 Audio**:
    *   Use a native `<audio>` element or standard audio tag.
    *   Expose local media paths using Tauri's native custom protocol (e.g., `tauri://` or a custom custom asset protocol) rather than fetching raw data array buffers.
2.  **Maintain Web Audio API for Timeline Hooks**:
    *   Instead of loading the buffer directly, create a `MediaElementAudioSourceNode` pointing to the HTML5 audio element.
    *   This retains access to the Web Audio API nodes (e.g., gain, filters, analyzer) without loading the audio buffer into RAM.

## Consequences

*   **Pros**:
    *   **Near-zero startup time**: Audio starts playing instantly without waiting for file downloads and decompression.
    *   **Low memory usage**: Memory usage remains constant regardless of the audio duration.
    *   Allows native seek and buffering behavior.
*   **Cons**:
    *   Requires configuring Tauri custom asset protocols to stream native files safely outside the web assets directory.
