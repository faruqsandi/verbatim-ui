<script>
  import { getContext } from "svelte";
  import {
    ZoomIn,
    ZoomOut,
    Upload,
    Save,
    Undo,
    Redo,
    Music,
    Search,
    Sun,
    Moon
  } from "@lucide/svelte";

  const transcriptState = getContext("TRANSCRIPT_STATE");

  /** @type {HTMLInputElement} */
  let fileInput;
  /** @type {HTMLInputElement} */
  let audioInput;

  // Search & Replace Panel State
  let showSearchPanel = $state(false);
  let findQuery = $state("");
  let replaceQuery = $state("");
  let caseSensitive = $state(false);
  let replaceStatus = $state("");

  function triggerFileInput() {
    if (fileInput) fileInput.click();
  }

  function triggerAudioInput() {
    if (audioInput) audioInput.click();
  }

  /**
   * @param {any} event
   */
  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      transcriptState.loadCsv(file);
    }
  }

  /**
   * @param {any} event
   */
  function handleAudioUpload(event) {
    const file = event.target.files[0];
    if (file) {
      transcriptState.handleAudioUpload(file);
    }
  }

  function handleLoadCsvClick() {
    const isTauri = typeof window !== "undefined" && /** @type {any} */ (window).__TAURI_INTERNALS__;
    if (isTauri) {
      transcriptState.selectAndLoadCsv();
    } else {
      triggerFileInput();
    }
  }

  function handleLoadAudioClick() {
    const isTauri = typeof window !== "undefined" && /** @type {any} */ (window).__TAURI_INTERNALS__;
    if (isTauri) {
      transcriptState.selectAndLoadAudio();
    } else {
      triggerAudioInput();
    }
  }

  /**
   * @param {any} event
   */
  function handleExportChange(event) {
    const val = event.target.value;
    if (val === "srt") {
      transcriptState.exportToSrt();
    } else if (val === "vtt") {
      transcriptState.exportToVtt();
    } else if (val === "txt") {
      transcriptState.exportToTxt();
    }
    event.target.value = ""; // Reset
  }

  function toggleSearchPanel() {
    showSearchPanel = !showSearchPanel;
    replaceStatus = "";
  }

  function executeReplace() {
    if (!findQuery) {
      replaceStatus = "Enter query";
      return;
    }
    const count = transcriptState.findAndReplace(findQuery, replaceQuery, caseSensitive);
    replaceStatus = `Replaced ${count} items`;
  }

  function increaseFontSize() {
    if (transcriptState.fontScale < 2.5) transcriptState.fontScale += 0.1;
  }

  function decreaseFontSize() {
    if (transcriptState.fontScale > 0.6) transcriptState.fontScale -= 0.1;
  }
</script>

<input
  type="file"
  accept=".csv"
  style="display: none;"
  bind:this={fileInput}
  onchange={handleFileUpload}
/>
<input
  type="file"
  accept="audio/*"
  style="display: none;"
  bind:this={audioInput}
  onchange={handleAudioUpload}
/>

<div class="toolbar-container">
  <header class="toolbar">
    <div class="toolbar-title">Reader</div>
    <div class="font-controls">
      <label class="toggle-label">
        <input type="checkbox" bind:checked={transcriptState.showUnderlines} />
        Underlines
      </label>
      <div class="divider"></div>
      <label class="toggle-label">
        <input type="checkbox" bind:checked={transcriptState.showTablePanel} />
        Data Table
      </label>
      <div class="divider"></div>
      <button onclick={handleLoadCsvClick} title="Load CSV" class="icon-btn">
        <Upload size={20} />
      </button>
      <button onclick={handleLoadAudioClick} title="Load Audio" class="icon-btn">
        <Music size={20} />
      </button>
      <button onclick={() => transcriptState.saveCsv()} title="Save CSV (Ctrl+S)" class="icon-btn">
        <Save size={20} />
      </button>
      <select onchange={handleExportChange} class="export-select" value="">
        <option value="" disabled>Export As...</option>
        <option value="srt">SRT Subtitles</option>
        <option value="vtt">WebVTT Subtitles</option>
        <option value="txt">TXT Transcript</option>
      </select>
      <button onclick={toggleSearchPanel} title="Find & Replace" class="icon-btn" class:active-panel={showSearchPanel}>
        <Search size={20} />
      </button>
      <button
        onclick={() => transcriptState.undo()}
        disabled={transcriptState.currentHistoryIndex <= 0}
        title="Undo (Ctrl+Z)"
        class="icon-btn"
        class:disabled={transcriptState.currentHistoryIndex <= 0}
      >
        <Undo size={20} />
      </button>
      <button
        onclick={() => transcriptState.redo()}
        disabled={transcriptState.currentHistoryIndex >= transcriptState.history.length - 1}
        title="Redo (Ctrl+Shift+Z)"
        class="icon-btn"
        class:disabled={transcriptState.currentHistoryIndex >= transcriptState.history.length - 1}
      >
        <Redo size={20} />
      </button>
      <div class="divider"></div>
      <button
        onclick={decreaseFontSize}
        title="Decrease Font Size"
        class="icon-btn"
      >
        <ZoomOut size={20} />
      </button>
      <div class="scale-indicator">{Math.round(transcriptState.fontScale * 100)}%</div>
      <button
        onclick={increaseFontSize}
        title="Increase Font Size"
        class="icon-btn"
      >
        <ZoomIn size={20} />
      </button>
      <div class="divider"></div>
      <button
        onclick={() => transcriptState.toggleDarkMode()}
        title="Toggle Theme"
        class="icon-btn"
      >
        {#if transcriptState.isDarkMode}
          <Sun size={20} />
        {:else}
          <Moon size={20} />
        {/if}
      </button>
    </div>
  </header>

  {#if showSearchPanel}
    <div class="search-panel">
      <input
        type="text"
        placeholder="Find word..."
        bind:value={findQuery}
        class="search-input"
      />
      <input
        type="text"
        placeholder="Replace with..."
        bind:value={replaceQuery}
        class="search-input"
      />
      <label class="search-label">
        <input type="checkbox" bind:checked={caseSensitive} /> Match case
      </label>
      <button onclick={executeReplace} class="replace-btn">Replace All</button>
      {#if replaceStatus}
        <span class="status-text">{replaceStatus}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .toolbar-container {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }

  .toolbar-title {
    font-family: var(--font-ui);
    font-weight: 500;
    color: var(--ui-color);
    letter-spacing: 0.5px;
    font-size: 0.9rem;
  }

  .font-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-family: var(--font-ui);
    font-size: 0.85rem;
    color: var(--ui-color);
    cursor: pointer;
    user-select: none;
  }

  .toggle-label input[type="checkbox"] {
    cursor: pointer;
  }

  .divider {
    width: 1px;
    height: 1.25rem;
    background-color: rgba(0, 0, 0, 0.1);
    margin: 0 0.5rem;
  }

  .scale-indicator {
    font-family: var(--font-ui);
    font-size: 0.85rem;
    color: var(--ui-color);
    width: 40px;
    text-align: center;
  }

  .icon-btn {
    background: none;
    border: none;
    color: var(--text-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    border-radius: 6px;
    transition:
      background-color 0.2s,
      transform 0.1s;
  }

  .icon-btn:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }

  .icon-btn:active {
    transform: scale(0.95);
  }

  .icon-btn.disabled {
    opacity: 0.3;
    cursor: not-allowed;
    transform: none;
  }

  .active-panel {
    background-color: rgba(59, 130, 246, 0.15) !important;
    color: var(--accent-color) !important;
  }

  .export-select {
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: white;
    font-family: var(--font-ui);
    font-size: 0.85rem;
    color: var(--ui-color);
    cursor: pointer;
    outline: none;
    transition: border-color 0.2s;
  }

  .export-select:hover {
    border-color: rgba(0, 0, 0, 0.2);
  }

  .export-select:focus {
    border-color: var(--accent-color);
  }

  .search-panel {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 2rem;
    background: rgba(248, 250, 252, 0.95);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    font-family: var(--font-ui);
    font-size: 0.85rem;
    backdrop-filter: blur(8px);
  }

  .search-input {
    padding: 0.35rem 0.6rem;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 4px;
    outline: none;
    font-family: inherit;
    font-size: inherit;
    width: 180px;
    transition: border-color 0.2s;
  }

  .search-input:focus {
    border-color: var(--accent-color);
  }

  .search-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--ui-color);
    cursor: pointer;
    user-select: none;
  }

  .replace-btn {
    padding: 0.35rem 0.75rem;
    background: var(--accent-color, #3b82f6);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    font-family: var(--font-ui);
    transition: opacity 0.2s;
  }

  .replace-btn:hover {
    opacity: 0.9;
  }

  .status-text {
    color: #10b981;
    font-weight: 500;
    margin-left: 0.5rem;
  }
</style>
