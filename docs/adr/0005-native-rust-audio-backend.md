# ADR-0005: Native Rust Audio Backend Integration

## Context

Following the decisions in ADR-0002, we relied on the Web Audio API and HTML5 `<audio>` tag to stream audio natively using the Tauri custom asset protocol. However, on Linux WebKitGTK, the underlying media backend (GStreamer) exhibited severe instability when streaming large audio files. These issues included state corruption, looping playback, incorrect seek timing, and jumping playback when pausing and stopping.

Furthermore, WaveSurfer's internal peak generation processes required decoding large audio files within the WebAudio context, leading to extreme memory usage when rendering waveforms for long audio recordings.

## Decision

To bypass the buggy WebKitGTK HTML5 media backend, we have:

1. **Migrated Audio Decoding and Playback to Rust**: 
   *   We integrated `rodio` as a native Rust audio backend running alongside Tauri on a dedicated thread.
   *   The Rust backend fully handles playback, pausing, seeking, and polling for the playhead time using native system libraries (e.g., ALSA/PulseAudio on Linux).
2. **Created a JavaScript Media Mock (`NativeMediaElement`)**:
   *   To maintain compatibility with `WaveSurfer.js`, we implemented an `EventTarget` mock object in the Svelte frontend. This object acts exactly like a standard HTML5 `<audio>` element but proxies all media commands to Rust via Tauri IPC (`invoke`).
3. **Offloaded Peak Generation to Rust**:
   *   Instead of letting WaveSurfer calculate peaks via WebAudio, we use `rodio::Decoder` in Rust to quickly stream through the samples and generate an array of amplitudes. These are sent over IPC and passed to WaveSurfer as pre-computed `peaks`, entirely sidestepping high memory WebAudio allocations.

## Consequences

*   **Pros**:
    *   Completely circumvents the WebKitGTK GStreamer playback looping and seeking bugs.
    *   Significantly lower RAM utilization since Svelte/WaveSurfer no longer needs to decode large files via WebAudio.
    *   Fast waveform visualization using native peak generation.
*   **Cons**:
    *   Slightly higher code complexity due to bridging state between the `NativeMediaElement` mock, Svelte stores, and the Rust backend.
    *   Requires proper disposal logic on both the JS side and Rust side to prevent lingering audio threads or memory leaks.
