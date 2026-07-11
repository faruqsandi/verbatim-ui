<script>
  import { onMount, onDestroy, setContext } from "svelte";
  import { TranscriptState } from "$lib/state/transcript.svelte.js";
  import Toolbar from "$lib/components/Toolbar.svelte";
  import AudioPlayer from "$lib/components/AudioPlayer.svelte";
  import TranscriptArea from "$lib/components/TranscriptArea.svelte";
  import SpeakerLegend from "$lib/components/SpeakerLegend.svelte";
  import VirtualTable from "$lib/VirtualTable.svelte";

  // Instantiate the Svelte 5 state manager
  const state = new TranscriptState();

  // Set the state in context so children can access it
  setContext("TRANSCRIPT_STATE", state);

  onMount(() => {
    state.initDemo();
  });

  onDestroy(() => {
    state.destroy();
  });

  function handleGlobalClick() {
    if (state.contextMenu.show) {
      state.contextMenu.show = false;
    }
  }

  /**
   * @param {any} e
   */
  function handleGlobalKeydown(e) {
    if (e.ctrlKey && (e.key === "z" || e.key === "Z")) {
      const isEditing =
        document.activeElement &&
        (document.activeElement.hasAttribute("contenteditable") ||
          document.activeElement.tagName === "INPUT");

      if (!isEditing) {
        e.preventDefault();
        if (e.shiftKey) {
          state.redo();
        } else {
          state.undo();
        }
      }
    }
    
    if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
      e.preventDefault();
      state.saveCsv();
    }

    if ((e.code === "Space" || e.key === " ") && state.audioLoaded) {
      const isEditing =
        document.activeElement &&
        (document.activeElement.hasAttribute("contenteditable") ||
          document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA");

      if (!isEditing) {
        e.preventDefault();
        state.togglePlay();
      }
    }
  }

  /**
   * @param {any} seconds
   */
  function formatTime(seconds) {
    if (!seconds) return "0:00";
    const s = parseFloat(seconds);
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }
</script>

<svelte:window onclick={handleGlobalClick} onkeydown={handleGlobalKeydown} />

<div class="app-container" style="--dynamic-scale: {state.fontScale}">
  <!-- Top Toolbar -->
  <Toolbar />

  <!-- Sticky Audio Player HUD -->
  <AudioPlayer />

  <div class="content-wrapper {state.showTablePanel ? 'show-table' : ''}">
    <!-- Left Sidebar (Data Table View) -->
    {#if state.showTablePanel && !state.isLoading && !state.errorMsg}
      <aside class="left-sidebar">
        <div class="panel-header">
          <h3>Data View</h3>
        </div>
        <div class="panel-content">
          <VirtualTable
            bind:words={state.words}
            speakers={state.speakers}
            bind:activeWordIndex={state.activeWordIndex}
            onupdate={() => {
              state.words = state.words;
              state.pushState();
            }}
          />
        </div>
      </aside>
    {/if}

    <!-- Reading/Transcript Area -->
    <TranscriptArea />

    <!-- Legend Sidebar -->
    <SpeakerLegend />
  </div>

  <!-- Context Menu for Speakers -->
  {#if state.contextMenu.show && state.contextMenu.word}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="context-menu"
      style="left: {state.contextMenu.x}px; top: {state.contextMenu.y}px;"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="menu-item custom-dropdown-wrapper">
        <strong>Speaker:</strong>

        <div class="custom-select-container">
          <button
            class="custom-select-btn"
            onclick={() =>
              (state.contextMenu.showDropdown = !state.contextMenu.showDropdown)}
          >
            <span
              class="color-dot"
              style="background-color: {state.speakerColors[
                state.contextMenu.word.speaker
              ] || '#ccc'}"
            ></span>
            {state.contextMenu.word.speaker || "Unknown"}
          </button>

          {#if state.contextMenu.showDropdown}
            <div class="custom-select-dropdown">
              {#each state.speakers as sp}
                <button
                  class="custom-option"
                  onclick={() => {
                    if (state.contextMenu.word) {
                      state.contextMenu.word.speaker = sp;
                    }
                    state.words = state.words; // trigger reactivity
                    state.contextMenu.showDropdown = false;
                    state.contextMenu.show = false;
                    state.pushState();
                  }}
                >
                  <span
                    class="color-dot"
                    style="background-color: {state.speakerColors[sp]}"
                  ></span>
                  {sp}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
      <div class="menu-item">
        <strong>Time:</strong>
        {formatTime(state.contextMenu.word.start)} - {formatTime(
          state.contextMenu.word.end,
        )}
      </div>
    </div>
  {/if}
</div>

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
    max-width: 100%; /* Take full width when table is open */
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
    height: calc(100vh - 130px); /* Height minus toolbar and audio bar */
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
    overflow: hidden; /* VirtualTable handles its own scroll */
    padding-right: 1rem;
    min-height: 0;
  }

  .context-menu {
    position: fixed;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-radius: 8px;
    padding: 0.5rem;
    z-index: 1000;
    min-width: 160px;
    font-family: var(--font-ui);
  }

  .menu-item {
    font-size: 0.85rem;
    color: var(--text-color);
    padding: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .menu-item strong {
    font-weight: 600;
    color: var(--ui-color);
  }

  .custom-dropdown-wrapper {
    align-items: flex-start;
  }

  .custom-dropdown-wrapper strong {
    margin-top: 0.35rem;
  }

  .custom-select-container {
    position: relative;
    flex: 1;
  }

  .custom-select-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    padding: 0.3rem 0.5rem;
    font-family: inherit;
    font-size: 0.85rem;
    color: var(--text-color);
    cursor: pointer;
    text-align: left;
  }

  .custom-select-btn:focus {
    border-color: var(--ui-color);
    outline: none;
  }

  .custom-select-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 1010;
    max-height: 200px;
    overflow-y: auto;
  }

  .custom-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.4rem 0.5rem;
    background: none;
    border: none;
    font-family: inherit;
    font-size: 0.85rem;
    color: var(--text-color);
    cursor: pointer;
    text-align: left;
    transition: background-color 0.1s;
  }

  .custom-option:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
</style>
