<script>
  import { getContext } from "svelte";

  const uiStore = getContext("UI_STORE");
  const transcriptStore = getContext("TRANSCRIPT_STORE");
</script>

{#if uiStore.contextMenu.show && uiStore.contextMenu.word}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="context-menu"
    style="left: {uiStore.contextMenu.x}px; top: {uiStore.contextMenu.y}px;"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="menu-item custom-dropdown-wrapper">
      <strong>Speaker:</strong>

      <div class="custom-select-container">
        <button
          class="custom-select-btn"
          onclick={() =>
            (uiStore.contextMenu.showDropdown = !uiStore.contextMenu.showDropdown)}
        >
          <span
            class="color-dot"
            style="background-color: {transcriptStore.speakerColors[
              uiStore.contextMenu.word.speaker
            ] || '#ccc'}"
          ></span>
          {uiStore.contextMenu.word.speaker || "Unknown"}
        </button>

        {#if uiStore.contextMenu.showDropdown}
          <div class="custom-select-dropdown">
            {#each transcriptStore.speakers as sp}
              <button
                class="custom-option"
                onclick={() => {
                  if (uiStore.contextMenu.word) {
                    uiStore.contextMenu.word.speaker = sp;
                  }
                  transcriptStore.words = transcriptStore.words; // trigger reactivity
                  uiStore.contextMenu.showDropdown = false;
                  uiStore.hideContextMenu();
                  transcriptStore.pushState();
                }}
              >
                <span
                  class="color-dot"
                  style="background-color: {transcriptStore.speakerColors[sp]}"
                ></span>
                {sp}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    
    <div class="menu-item">
      <strong>Split segment:</strong>
      <select
        onchange={(e) => {
          const target = /** @type {HTMLSelectElement} */ (e.target);
          if (target && target.value && transcriptStore.activeWordIndex !== null) {
            if (target.value === "NEW_SPEAKER") {
              let newSp = prompt("Enter new speaker name:");
              if (newSp) {
                newSp = newSp.trim();
                if (newSp) {
                  transcriptStore.splitSegmentAt(transcriptStore.activeWordIndex, newSp);
                }
              }
            } else {
              transcriptStore.splitSegmentAt(transcriptStore.activeWordIndex, target.value);
            }
            uiStore.hideContextMenu();
          }
        }}
        value=""
        class="speaker-select"
      >
        <option value="" disabled>Select speaker...</option>
        {#each transcriptStore.speakers as sp}
          <option value={sp}>{sp}</option>
        {/each}
        <option value="NEW_SPEAKER">+ New Speaker...</option>
      </select>
    </div>

    <div class="menu-item custom-dropdown-wrapper">
      <strong>Time:</strong>
      <div class="time-edit-row">
        <input 
          type="text" 
          class="time-input" 
          bind:value={uiStore.contextMenu.word.start}
        />
        - 
        <input 
          type="text" 
          class="time-input" 
          bind:value={uiStore.contextMenu.word.end}
        />
        <button class="save-time-btn" onclick={() => {
          if (transcriptStore.activeWordIndex !== null) {
            transcriptStore.updateTimestamp(
              transcriptStore.activeWordIndex, 
              uiStore.contextMenu.word.start, 
              uiStore.contextMenu.word.end
            );
          }
          uiStore.hideContextMenu();
        }}>Save</button>
      </div>
    </div>

    <div class="menu-item segment-actions">
      <button class="segment-btn" onclick={() => {
        if (transcriptStore.activeWordIndex !== null) {
          transcriptStore.splitWord(transcriptStore.activeWordIndex);
        }
        uiStore.hideContextMenu();
      }}>Split Word</button>
      <button class="segment-btn" onclick={() => {
        if (transcriptStore.activeWordIndex !== null) {
          transcriptStore.mergeWord(transcriptStore.activeWordIndex);
        }
        uiStore.hideContextMenu();
      }}>Merge with Next</button>
    </div>
  </div>
{/if}

<style>
  .context-menu {
    position: fixed;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-radius: 8px;
    padding: 0.5rem;
    z-index: 1000;
    min-width: 180px;
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

  .speaker-select {
    font-family: inherit;
    font-size: 0.85rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    background: white;
    color: var(--text-color);
    outline: none;
    cursor: pointer;
    flex: 1;
    max-width: 120px;
  }

  .speaker-select:focus {
    border-color: var(--ui-color);
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

  .time-edit-row {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .time-input {
    width: 50px;
    font-family: inherit;
    font-size: 0.8rem;
    padding: 0.2rem;
    border: 1px solid rgba(0,0,0,0.2);
    border-radius: 4px;
    text-align: center;
    color: var(--text-color);
    background: white;
  }

  .save-time-btn {
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.2rem 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
    margin-left: 0.25rem;
  }

  .save-time-btn:hover {
    opacity: 0.9;
  }

  .segment-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    border-top: 1px solid rgba(0,0,0,0.05);
    padding-top: 0.75rem;
    margin-top: 0.25rem;
  }

  .segment-btn {
    background: rgba(0,0,0,0.05);
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 4px;
    padding: 0.3rem 0.6rem;
    font-family: inherit;
    font-size: 0.8rem;
    color: var(--text-color);
    cursor: pointer;
    flex: 1;
  }

  .segment-btn:hover {
    background: rgba(0,0,0,0.1);
  }
</style>
