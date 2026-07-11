<script>
  import { getContext } from "svelte";

  const transcriptState = getContext("TRANSCRIPT_STATE");
</script>

{#if !transcriptState.isLoading && !transcriptState.errorMsg && transcriptState.speakers.length > 0}
  <aside class="right-sidebar">
    <div class="legend-box">
      <h3 class="legend-title">Speakers</h3>
      <ul class="legend-list">
        {#each transcriptState.speakers as sp (sp)}
          <li class="legend-item">
            <span
              class="color-dot"
              style="background-color: {transcriptState.speakerColors[sp]}"
            ></span>
            <input
              class="speaker-name-input"
              value={sp}
              onblur={(e) => {
                const target = /** @type {HTMLInputElement} */ (e.target);
                if (target) transcriptState.renameSpeaker(sp, target.value);
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
  </aside>
{/if}

<style>
  .right-sidebar {
    width: 250px;
    padding: 4rem 1rem;
    position: sticky;
    top: 130px; /* offset by toolbar + audio bar height */
    align-self: flex-start;
    max-height: calc(100vh - 130px);
    overflow-y: auto;
  }

  @media (max-width: 1000px) {
    .right-sidebar {
      display: none; /* Hide on smaller screens to maintain reading focus */
    }
  }

  .legend-box {
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
  }

  .legend-title {
    font-family: var(--font-ui);
    font-size: 0.85rem;
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

  .color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .speaker-name-input {
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 2px 6px;
    font-family: inherit;
    font-size: 0.9rem;
    color: var(--text-color);
    width: 100%;
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }

  .speaker-name-input:hover {
    background-color: rgba(255, 255, 255, 0.5);
    border-color: rgba(0, 0, 0, 0.1);
  }

  .speaker-name-input:focus {
    background-color: white;
    border-color: var(--ui-color, #4a90e2);
    outline: none;
  }
</style>
