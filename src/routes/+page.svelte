<script>
  import { onMount, onDestroy, setContext } from "svelte";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  
  import { UiStore } from "$lib/features/core/uiStore.svelte.js";
  import { AudioStore } from "$lib/features/audio-player/audioStore.svelte.js";
  import { TranscriptStore } from "$lib/features/transcript-editor/transcriptStore.svelte.js";
  import { StorageAdapter } from "$lib/features/core/storageAdapter.js";

  import Toolbar from "$lib/features/core/Toolbar.svelte";
  import AudioPlayer from "$lib/features/audio-player/AudioPlayer.svelte";
  import TranscriptArea from "$lib/features/transcript-editor/TranscriptArea.svelte";
  import ContextMenu from "$lib/features/transcript-editor/ContextMenu.svelte";
  import PropertiesPanel from "$lib/features/properties-panel/PropertiesPanel.svelte";
  import TablePanel from "$lib/features/data-view/TablePanel.svelte";
  import WelcomeScreen from "$lib/features/core/WelcomeScreen.svelte";
  import { Logger } from "$lib/features/core/logger.svelte.js";
  import LogPanel from "$lib/features/core/LogPanel.svelte";

  // Instantiate the feature stores
  const uiStore = new UiStore();
  const audioStore = new AudioStore();
  const transcriptStore = new TranscriptStore();
  const logger = new Logger();

  // Inject logger into static adapter and reactive stores
  StorageAdapter.logger = logger;
  audioStore.logger = logger;
  transcriptStore.logger = logger;

  // Provide to children
  setContext("UI_STORE", uiStore);
  setContext("AUDIO_STORE", audioStore);
  setContext("TRANSCRIPT_STORE", transcriptStore);
  setContext("LOGGER", logger);

  /** @type {any} */
  let unlistenFileDrop;

  onMount(async () => {
    // Check for autosave
    const autosaveData = await StorageAdapter.getAutosave();
    if (autosaveData) {
      if (confirm("Verbatim UI closed unexpectedly. Would you like to recover your unsaved changes?")) {
        await transcriptStore.loadProject(autosaveData, audioStore);
        // On Web, audio relinking will still need to happen manually.
        // On Desktop, we can try to re-link immediately.
        if (autosaveData.audioPath && typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
          const audioUrl = await StorageAdapter.convertFileSrc(autosaveData.audioPath);
          audioStore.loadAudioFromUrl(audioUrl);
        }
      } else {
        await StorageAdapter.clearAutosave();
      }
    }

    const isTauri = typeof window !== "undefined" && /** @type {any} */ (window).__TAURI_INTERNALS__;
    if (isTauri) {
      try {
        const appWindow = /** @type {any} */ (getCurrentWindow());
        unlistenFileDrop = await appWindow.onFileDropEvent(async (/** @type {any} */ event) => {
          if (event.payload.type === "drop") {
            const paths = event.payload.paths;
            if (paths && paths.length > 0) {
              const firstPath = paths[0];
              if (firstPath.endsWith(".csv")) {
                const csvStr = await StorageAdapter.readTextFile(firstPath);
                await transcriptStore.loadCsvFromString(csvStr, firstPath);
                
                // Try to load audio automatically
                const expectedAudio = firstPath.replace(/\.csv$/i, ".mp3");
                const audioUrl = await StorageAdapter.convertFileSrc(expectedAudio);
                audioStore.loadAudioFromUrl(audioUrl);
                
              } else if (/\.(mp3|wav|ogg|m4a|flac)$/i.test(firstPath)) {
                const audioUrl = await StorageAdapter.convertFileSrc(firstPath);
                audioStore.loadAudioFromUrl(audioUrl);
              }
            }
          }
        });
      } catch (err) {
        console.error("Failed to setup file drop listener:", err);
      }
    }
  });

  onDestroy(() => {
    audioStore.destroy();
    if (unlistenFileDrop) {
      unlistenFileDrop();
    }
  });

  function handleGlobalClick() {
    uiStore.hideContextMenu();
  }

  /**
   * @param {any} e
   */
  async function handleGlobalKeydown(e) {
    if (e.ctrlKey && (e.key === "z" || e.key === "Z")) {
      const isEditing =
        document.activeElement &&
        (document.activeElement.hasAttribute("contenteditable") ||
          document.activeElement.tagName === "INPUT");

      if (!isEditing) {
        e.preventDefault();
        if (e.shiftKey) {
          transcriptStore.redo();
        } else {
          transcriptStore.undo();
        }
      }
    }
    
    if (e.key === "F12") {
      e.preventDefault();
      uiStore.showLogPanel = !uiStore.showLogPanel;
      logger.info("Keyboard", `Toggled log panel via F12: ${uiStore.showLogPanel}`);
    }

    if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
      e.preventDefault();
      
      if (!transcriptStore.isProjectOpen) return;
      
      const projectData = transcriptStore.serializeProject();
      const result = await StorageAdapter.saveProject(
        transcriptStore.currentFilePath, 
        uiStore.webFileHandle,
        projectData,
        false
      );
      
      if (result) {
        transcriptStore.currentFilePath = result.path;
        uiStore.webFileHandle = result.handle;
        await StorageAdapter.clearAutosave(); // Clear autosave on clean save
      }
    }

    if ((e.code === "Space" || e.key === " ") && audioStore.audioLoaded) {
      const isEditing =
        document.activeElement &&
        (document.activeElement.hasAttribute("contenteditable") ||
          document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA");

      if (!isEditing) {
        e.preventDefault();
        audioStore.togglePlay();
      }
    }
  }
</script>

<svelte:window onclick={handleGlobalClick} onkeydown={handleGlobalKeydown} />

{#if !transcriptStore.isProjectOpen}
  <WelcomeScreen />
{:else}
  <div class="app-container" style="--dynamic-scale: {uiStore.fontScale}">
    <!-- Top Toolbar -->
  <Toolbar />

  <!-- Sticky Audio Player HUD -->
  <AudioPlayer />

  <div class="content-wrapper {uiStore.showTablePanel ? 'show-table' : ''}">
    <!-- Left Sidebar (Data Table View) -->
    {#if uiStore.showTablePanel && !transcriptStore.isLoading && !transcriptStore.errorMsg}
      <aside class="left-sidebar">
        {#if uiStore.showPanelLabels}
          <div class="panel-label">TablePanel</div>
        {/if}
        <div class="panel-header">
          <h3>Data View</h3>
        </div>
        <div class="panel-content">
          <TablePanel
            bind:words={transcriptStore.words}
            speakers={transcriptStore.speakers}
            bind:activeWordIndex={transcriptStore.activeWordIndex}
            onupdate={() => {
              transcriptStore.words = transcriptStore.words;
              transcriptStore.pushState();
            }}
          />
        </div>
      </aside>
    {/if}

    <!-- Reading/Transcript Area -->
    <TranscriptArea />

    <!-- Right Sidebar (Properties View) -->
    {#if uiStore.showPropertiesPanel}
      <PropertiesPanel />
    {/if}
  </div>

  <!-- Context Menu for Speakers -->
  <ContextMenu />
  </div>
{/if}

<LogPanel />

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .content-wrapper {
    display: flex;
    flex: 1;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
    position: relative;
    gap: 2rem;
    transition: max-width 0.3s ease;
    justify-content: center;
  }

  .content-wrapper.show-table {
    max-width: 100%;
    padding: 0 1rem;
  }

  /* Left Sidebar for Table */
  .left-sidebar {
    width: 450px;
    display: flex;
    flex-direction: column;
    padding: 2rem 0;
    align-self: flex-start;
    flex-shrink: 0;
    border-right: 1px solid rgba(0, 0, 0, 0.05);
    margin-right: 1rem;
    height: calc(100vh - 130px);
    position: sticky;
    top: 130px;
  }

  .panel-header {
    padding: 0 1rem 1rem 1rem;
  }

  .panel-header h3 {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 1rem;
    color: var(--ui-color);
  }

  .panel-content {
    flex: 1;
    overflow: hidden;
    padding-right: 1rem;
    min-height: 0;
  }
  
  .panel-label {
    position: absolute;
    top: 4px;
    right: 8px;
    font-size: 0.7rem;
    color: #94a3b8;
    font-family: var(--font-ui);
    pointer-events: none;
    z-index: 10;
  }
</style>
