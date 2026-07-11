# Verbatim UI Documentation

This directory contains the official documentation for the Verbatim UI project. To maintain a clean and understandable project history, documentation is split into two distinct categories:

## 1. Architecture Decision Records (`adr/`)
Located in [`docs/adr`](./adr/), these documents capture important architectural decisions made during the project's lifecycle.
Each ADR explains the context of a problem, the proposed solutions, and the rationale behind the chosen implementation (e.g., why we chose an HTML5 audio element over `decodeAudioData`, or how we handle patch-based state).

## 2. System Architecture (`system/`)
Located in [`docs/system`](./system/), these documents record the current platform implementation, architecture, components, and data structures.
The primary entry point is `architecture.md`, which provides a high-level overview of how the Tauri backend and Svelte frontend communicate, build flows, and how state is managed across the application.
