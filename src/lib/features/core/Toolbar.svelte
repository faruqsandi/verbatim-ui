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
    Moon,
    Tags,
    FilePlus,
    FolderOpen,
    Download,
    Terminal,
    Underline,
    Table,
    Sidebar
  } from "@lucide/svelte";
  import { StorageAdapter } from "./storageAdapter.js";

  const uiStore = getContext("UI_STORE");
  const audioStore = getContext("AUDIO_STORE");
  const transcriptStore = getContext("TRANSCRIPT_STORE");

  /** @type {HTMLInputElement} */
  let fileInput;
  /** @type {HTMLInputElement} */
  let audioInput;

  // Search & Replace Panel State
  let showSearchPanel = $state(false);
  let findQuery = $state("");
  let replaceQuery = $state("");
  let caseSensitive = $state(false);
  let useRegex = $state(false);
  let wholeWord = $state(false);
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
  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      transcriptStore.loadCsv(file, audioStore);
    }
  }

  /**
   * @param {any} event
   */
  function handleAudioUpload(event) {
    const file = event.target.files[0];
    if (file) {
      audioStore.handleAudioUpload(file);
    }
  }

  async function handleLoadCsvClick() {
    const path = await StorageAdapter.openCsv();
    if (path) {
      const csvStr = await StorageAdapter.readTextFile(path);
      await transcriptStore.loadCsvFromString(csvStr, path);
    } else if (typeof window !== "undefined" && !window.__TAURI_INTERNALS__) {
      triggerFileInput();
    }
  }

  async function handleLoadAudioClick() {
    const path = await StorageAdapter.openAudio();
    if (path) {
      transcriptStore.audioPath = path;
      if (typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
        audioStore.loadAudioFromPath(path);
      } else {
        const audioUrl = await StorageAdapter.convertFileSrc(path);
        audioStore.loadAudioFromUrl(audioUrl);
      }
      transcriptStore.pushState(); // trigger autosave
    } else if (typeof window !== "undefined" && !window.__TAURI_INTERNALS__) {
      triggerAudioInput();
    }
  }

  async function handleSaveProjectClick() {
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
      await StorageAdapter.clearAutosave();
    }
  }

  async function handleNewProject() {
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
      audioStore.destroy(); // Clear audio
    }
  }

  async function handleOpenProject() {
    const result = await StorageAdapter.openProject();
    if (result && result.data) {
      transcriptStore.currentFilePath = result.path;
      uiStore.webFileHandle = result.handle;
      await transcriptStore.loadProject(result.data, audioStore);

      if (result.data.audioPath) {
        if (typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
          audioStore.loadAudioFromPath(result.data.audioPath);
        } else {
          alert("Please select the audio file for this project: " + result.data.audioPath.split(/[/\\]/).pop());
          triggerAudioInput();
        }
      }
    }
  }

  /**
   * @param {any} event
   */
  async function handleExportChange(event) {
    const val = event.target.value;
    if (!val) return;
    
    let ext = val;
    let mimeType = "text/plain";
    let content = "";
    
    if (val === "csv") {
      mimeType = "text/csv";
      content = transcriptStore.getCsvString();
    } else if (val === "srt") {
      mimeType = "text/srt";
      content = generateSrt();
    } else if (val === "vtt") {
      mimeType = "text/vtt";
      content = generateVtt();
    } else if (val === "txt") {
      content = generateTxt();
    }
    
    await StorageAdapter.exportTextFile(content, `export.${ext}`, mimeType);
    event.target.value = ""; // Reset
  }

  function formatTimeSub(seconds, isSrt = false) {
    const s = parseFloat(seconds) || 0;
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 1000);
    const pad = (num, len = 2) => String(num).padStart(len, "0");
    const msDelim = isSrt ? "," : ".";
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}${msDelim}${pad(ms, 3)}`;
  }

  function generateSrt() {
    return transcriptStore.sentenceGroups.map((group, idx) => {
      const start = formatTimeSub(group.words[0].word.start, true);
      const end = formatTimeSub(group.words[group.words.length - 1].word.end, true);
      const text = group.words.map((w) => w.word.word).join(" ");
      return `${idx + 1}\n${start} --> ${end}\n${group.speaker || "Unknown"}: ${text}\n`;
    }).join("\n");
  }

  function generateVtt() {
    const header = "WEBVTT\n\n";
    const lines = transcriptStore.sentenceGroups.map((group, idx) => {
      const start = formatTimeSub(group.words[0].word.start, false);
      const end = formatTimeSub(group.words[group.words.length - 1].word.end, false);
      const text = group.words.map((w) => w.word.word).join(" ");
      return `${idx + 1}\n${start} --> ${end}\n<v ${group.speaker || "Unknown"}>${text}\n`;
    }).join("\n");
    return header + lines;
  }

  function generateTxt() {
    return transcriptStore.sentenceGroups.map((group) => {
      const text = group.words.map((w) => w.word.word).join(" ");
      return `${group.speaker || "Unknown"}: ${text}`;
    }).join("\n\n");
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
    const count = transcriptStore.findAndReplace(findQuery, replaceQuery, { caseSensitive, useRegex, wholeWord });
    replaceStatus = `Replaced ${count} items`;
  }

  function increaseFontSize() {
    if (uiStore.fontScale < 2.5) uiStore.fontScale += 0.1;
  }

  function decreaseFontSize() {
    if (uiStore.fontScale > 0.6) uiStore.fontScale -= 0.1;
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
  {#if uiStore.showPanelLabels}
    <div class="panel-label">Toolbar</div>
  {/if}
  <header class="toolbar">
    <div class="toolbar-group">
      <div class="toolbar-title">Reader</div>
      <div class="divider"></div>
      
      <!-- Group 1: File Operations -->
      <button onclick={handleNewProject} title="New Project" class="icon-btn">
        <FilePlus size={18} />
      </button>
      <button onclick={handleOpenProject} title="Open Project" class="icon-btn">
        <FolderOpen size={18} />
      </button>
      <button onclick={handleSaveProjectClick} title="Save Project (Ctrl+S)" class="icon-btn">
        <Save size={18} />
      </button>
      <div class="divider-subtle"></div>
      <button onclick={handleLoadCsvClick} title="Import CSV Data" class="icon-btn">
        <Upload size={18} />
      </button>
      <button onclick={handleLoadAudioClick} title="Import Audio" class="icon-btn">
        <Music size={18} />
      </button>
      <select onchange={handleExportChange} class="export-select" value="">
        <option value="" disabled>Export As...</option>
        <option value="csv">CSV Data</option>
        <option value="srt">SRT Subtitles</option>
        <option value="vtt">WebVTT Subtitles</option>
        <option value="txt">TXT Transcript</option>
      </select>
    </div>

    <!-- Group 2: View Toggles -->
    <div class="toolbar-group view-toggles">
      <button 
        onclick={() => transcriptStore.showUnderlines = !transcriptStore.showUnderlines} 
        title="Toggle Underlines" 
        class="icon-btn toggle-btn" 
        class:active-panel={transcriptStore.showUnderlines}
      >
        <Underline size={18} />
      </button>
      <button 
        onclick={() => uiStore.showTablePanel = !uiStore.showTablePanel} 
        title="Toggle Data Table" 
        class="icon-btn toggle-btn" 
        class:active-panel={uiStore.showTablePanel}
      >
        <Table size={18} />
      </button>
      <button 
        onclick={() => uiStore.showPropertiesPanel = !uiStore.showPropertiesPanel} 
        title="Toggle Properties Panel" 
        class="icon-btn toggle-btn" 
        class:active-panel={uiStore.showPropertiesPanel}
      >
        <Sidebar size={18} />
      </button>
    </div>

    <!-- Group 3: App Controls -->
    <div class="toolbar-group">
      <button
        onclick={() => transcriptStore.undo()}
        disabled={transcriptStore.currentHistoryIndex <= 0}
        title="Undo (Ctrl+Z)"
        class="icon-btn"
        class:disabled={transcriptStore.currentHistoryIndex <= 0}
      >
        <Undo size={18} />
      </button>
      <button
        onclick={() => transcriptStore.redo()}
        disabled={transcriptStore.currentHistoryIndex >= transcriptStore.history.length - 1}
        title="Redo (Ctrl+Shift+Z)"
        class="icon-btn"
        class:disabled={transcriptStore.currentHistoryIndex >= transcriptStore.history.length - 1}
      >
        <Redo size={18} />
      </button>
      <div class="divider-subtle"></div>
      <button onclick={toggleSearchPanel} title="Find & Replace" class="icon-btn" class:active-panel={showSearchPanel}>
        <Search size={18} />
      </button>
      <div class="divider-subtle"></div>
      <button
        onclick={decreaseFontSize}
        title="Decrease Font Size"
        class="icon-btn"
      >
        <ZoomOut size={18} />
      </button>
      <div class="scale-indicator">{Math.round(uiStore.fontScale * 100)}%</div>
      <button
        onclick={increaseFontSize}
        title="Increase Font Size"
        class="icon-btn"
      >
        <ZoomIn size={18} />
      </button>
      <div class="divider-subtle"></div>
      <button
        onclick={() => uiStore.toggleDarkMode()}
        title="Toggle Theme"
        class="icon-btn"
      >
        {#if uiStore.isDarkMode}
          <Sun size={18} />
        {:else}
          <Moon size={18} />
        {/if}
      </button>
      <button
        onclick={() => uiStore.togglePanelLabels()}
        title="Toggle Panel Labels"
        class="icon-btn"
        class:active-panel={uiStore.showPanelLabels}
      >
        <Tags size={18} />
      </button>
      <button
        onclick={() => uiStore.showLogPanel = !uiStore.showLogPanel}
        title="Toggle Debug Console (F12)"
        class="icon-btn"
        class:active-panel={uiStore.showLogPanel}
      >
        <Terminal size={18} />
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
      <label class="search-label">
        <input type="checkbox" bind:checked={wholeWord} /> Whole word
      </label>
      <label class="search-label">
        <input type="checkbox" bind:checked={useRegex} /> Regex
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
    padding: 0.75rem 2rem;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .view-toggles {
    background: rgba(0, 0, 0, 0.03);
    padding: 0.2rem;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  .toolbar-title {
    font-family: var(--font-ui);
    font-weight: 600;
    color: var(--text-color);
    letter-spacing: 0.5px;
    font-size: 1rem;
    margin-right: 0.5rem;
  }

  .divider {
    width: 1px;
    height: 1.5rem;
    background-color: rgba(0, 0, 0, 0.15);
    margin: 0 0.5rem;
  }
  
  .divider-subtle {
    width: 1px;
    height: 1.25rem;
    background-color: rgba(0, 0, 0, 0.08);
    margin: 0 0.25rem;
  }

  .scale-indicator {
    font-family: var(--font-ui);
    font-size: 0.85rem;
    color: var(--ui-color);
    width: 40px;
    text-align: center;
  }

  .icon-btn {
    background: transparent;
    border: none;
    color: var(--ui-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    border-radius: 6px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .icon-btn:hover {
    background-color: rgba(0, 0, 0, 0.06);
    color: var(--text-color);
  }

  .icon-btn:active {
    transform: scale(0.92);
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
  
  .panel-label {
    position: absolute;
    top: 4px;
    left: 8px;
    font-size: 0.7rem;
    color: #94a3b8;
    font-family: var(--font-ui);
    pointer-events: none;
    z-index: 10;
  }
</style>
