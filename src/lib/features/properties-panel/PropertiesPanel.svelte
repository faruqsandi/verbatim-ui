<script>
  import { getContext } from "svelte";

  const transcriptStore = getContext("TRANSCRIPT_STORE");
  const uiStore = getContext("UI_STORE");
</script>

<aside class="right-sidebar">
  {#if uiStore.showPanelLabels}
    <div class="panel-label">PropertiesPanel</div>
  {/if}
  <div class="panel-header">
    <h3>Properties</h3>
  </div>
  <div class="panel-content">
    {#if !transcriptStore.isLoading && !transcriptStore.errorMsg && transcriptStore.speakers.length > 0}
      <div class="property-group">
        <h4 class="group-title">Speakers</h4>
        <ul class="legend-list">
          {#each transcriptStore.speakers as sp (sp)}
            <li class="legend-item">
              <input
                type="color"
                class="color-picker-dot"
                value={transcriptStore.speakerColors[sp] || "#cccccc"}
                oninput={(e) => {
                  const target = /** @type {HTMLInputElement} */ (e.target);
                  if (target) {
                    transcriptStore.speakerColors[sp] = target.value;
                    transcriptStore.speakerColors = { ...transcriptStore.speakerColors }; // trigger reactivity
                  }
                }}
              />
              <input
                class="speaker-name-input"
                value={sp}
                onblur={(e) => {
                  const target = /** @type {HTMLInputElement} */ (e.target);
                  if (target) transcriptStore.renameSpeaker(sp, target.value);
                }}
                onkeydown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const target = /** @type {HTMLInputElement} */ (e.target);
                    if (target) target.blur();
                  }
                }}
              />
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</aside>

<style>
  .right-sidebar {
    width: 280px;
    display: flex;
    flex-direction: column;
    padding: 2rem 0;
    align-self: flex-start;
    flex-shrink: 0;
    border-left: 1px solid rgba(0, 0, 0, 0.05);
    margin-left: 1rem;
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
    overflow-y: auto;
    padding: 0 1rem;
    min-height: 0;
  }

  /* Custom scrollbar for webkit */
  .panel-content::-webkit-scrollbar {
    width: 6px;
  }
  .panel-content::-webkit-scrollbar-track {
    background: transparent;
  }
  .panel-content::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 10px;
  }
  .panel-content::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.25);
  }

  .property-group {
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    padding: 1.25rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
    margin-bottom: 1rem;
  }

  .group-title {
    font-family: var(--font-ui);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--ui-color);
    margin: 0 0 1rem 0;
    font-weight: 600;
  }

  .legend-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-family: var(--font-ui);
    font-size: 0.9rem;
    color: var(--text-color);
  }

  .color-picker-dot {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    background: none;
    padding: 0;
    flex-shrink: 0;
  }

  .color-picker-dot::-webkit-color-swatch-wrapper {
    padding: 0;
  }

  .color-picker-dot::-webkit-color-swatch {
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 50%;
  }

  .speaker-name-input {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 2px 6px;
    font-family: inherit;
    font-size: 0.85rem;
    color: var(--text-color);
    width: 100%;
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }

  .speaker-name-input:hover {
    background: rgba(255, 255, 255, 0.5);
    border-color: rgba(0, 0, 0, 0.1);
  }

  .speaker-name-input:focus {
    background: white;
    border-color: var(--ui-color, #4a90e2);
    outline: none;
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
