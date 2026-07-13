<script>
  import { getContext } from "svelte";
  import { StorageAdapter } from "$lib/features/core/storageAdapter.js";

  const transcriptStore = getContext("TRANSCRIPT_STORE");
  const uiStore = getContext("UI_STORE");
  const audioStore = getContext("AUDIO_STORE");

  async function handleNewProject() {
    // Ask user to save a new vprj file first
    const result = await StorageAdapter.saveProject("Untitled.vprj", null, {
      version: 1,
      audioPath: null,
      speakers: [],
      speakerColors: {},
      words: []
    }, true);

    if (result) {
      transcriptStore.currentFilePath = result.path;
      uiStore.webFileHandle = result.handle;
      transcriptStore.isProjectOpen = true;
      transcriptStore.words = [];
      transcriptStore.history = [];
      transcriptStore.currentHistoryIndex = -1;
      transcriptStore.speakerColors = {};
      transcriptStore.audioPath = null;
    }
  }

  async function handleOpenProject() {
    const result = await StorageAdapter.openProject();
    if (result && result.data) {
      transcriptStore.currentFilePath = result.path;
      uiStore.webFileHandle = result.handle;
      await transcriptStore.loadProject(result.data, audioStore);

      // On Web, audio linking requires manual input if it exists
      if (result.data.audioPath) {
        if (typeof window !== "undefined" && !window.__TAURI_INTERNALS__) {
          alert("Please select the audio file for this project: " + result.data.audioPath.split(/[/\\]/).pop());
          const audioInput = document.createElement("input");
          audioInput.type = "file";
          audioInput.accept = "audio/*";
          audioInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
              const url = URL.createObjectURL(file);
              audioStore.loadAudioFromUrl(url);
            }
          };
          audioInput.click();
        } else {
          // Tauri: direct load
          const audioUrl = await StorageAdapter.convertFileSrc(result.data.audioPath);
          audioStore.loadAudioFromUrl(audioUrl);
        }
      }
    }
  }
</script>

<div class="welcome-container">
  <div class="welcome-box">
    <h1>Verbatim UI</h1>
    <p>Professional transcription and review environment.</p>
    
    <div class="actions">
      <button class="primary-btn" onclick={handleNewProject}>
        New Project
      </button>
      <button class="secondary-btn" onclick={handleOpenProject}>
        Open Project
      </button>
    </div>
  </div>
</div>

<style>
  .welcome-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: var(--bg-color);
  }

  .welcome-box {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.05);
    padding: 3rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    text-align: center;
    max-width: 500px;
    width: 100%;
  }

  h1 {
    font-family: var(--font-ui);
    color: var(--ui-color);
    margin-top: 0;
    margin-bottom: 0.5rem;
  }

  p {
    font-family: var(--font-ui);
    color: var(--text-color);
    margin-bottom: 2rem;
    opacity: 0.8;
  }

  .actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  button {
    font-family: var(--font-ui);
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    border: none;
    font-size: 1rem;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
  }

  .primary-btn {
    background: var(--ui-color);
    color: white;
  }

  .primary-btn:hover {
    background: #3a7bc8;
  }

  .secondary-btn {
    background: rgba(0, 0, 0, 0.05);
    color: var(--text-color);
  }

  .secondary-btn:hover {
    background: rgba(0, 0, 0, 0.1);
  }
</style>
