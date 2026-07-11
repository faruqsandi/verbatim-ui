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
  } from "@lucide/svelte";

  const state = getContext("TRANSCRIPT_STATE");

  /** @type {HTMLInputElement} */
  let fileInput;
  /** @type {HTMLInputElement} */
  let audioInput;

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
      state.loadCsv(file);
    }
  }

  /**
   * @param {any} event
   */
  function handleAudioUpload(event) {
    const file = event.target.files[0];
    if (file) {
      state.handleAudioUpload(file);
    }
  }

  function increaseFontSize() {
    if (state.fontScale < 2.5) state.fontScale += 0.1;
  }

  function decreaseFontSize() {
    if (state.fontScale > 0.6) state.fontScale -= 0.1;
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

<header class="toolbar">
  <div class="toolbar-title">Reader</div>
  <div class="font-controls">
    <label class="toggle-label">
      <input type="checkbox" bind:checked={state.showUnderlines} />
      Underlines
    </label>
    <div class="divider"></div>
    <label class="toggle-label">
      <input type="checkbox" bind:checked={state.showTablePanel} />
      Data Table
    </label>
    <div class="divider"></div>
    <button onclick={triggerFileInput} title="Load CSV" class="icon-btn">
      <Upload size={20} />
    </button>
    <button onclick={triggerAudioInput} title="Load Audio" class="icon-btn">
      <Music size={20} />
    </button>
    <button onclick={() => state.saveCsv()} title="Save CSV (Ctrl+S)" class="icon-btn">
      <Save size={20} />
    </button>
    <button
      onclick={() => state.undo()}
      disabled={state.currentHistoryIndex <= 0}
      title="Undo (Ctrl+Z)"
      class="icon-btn"
      class:disabled={state.currentHistoryIndex <= 0}
    >
      <Undo size={20} />
    </button>
    <button
      onclick={() => state.redo()}
      disabled={state.currentHistoryIndex >= state.history.length - 1}
      title="Redo (Ctrl+Shift+Z)"
      class="icon-btn"
      class:disabled={state.currentHistoryIndex >= state.history.length - 1}
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
    <div class="scale-indicator">{Math.round(state.fontScale * 100)}%</div>
    <button
      onclick={increaseFontSize}
      title="Increase Font Size"
      class="icon-btn"
    >
      <ZoomIn size={20} />
    </button>
  </div>
</header>

<style>
  .toolbar {
    position: sticky;
    top: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    z-index: 20;
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
</style>
