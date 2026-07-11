<script>
  import { getContext } from "svelte";
  import { Play, Pause, Square } from "@lucide/svelte";

  const transcriptState = getContext("TRANSCRIPT_STATE");

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

  /**
   * @param {any} e
   */
  function handleSeek(e) {
    transcriptState.seekAudioTo(parseFloat(e.target.value));
  }
</script>

{#if transcriptState.audioLoaded}
  <div class="audio-bar">
    <div class="audio-controls">
      <button
        class="audio-btn"
        onclick={() => transcriptState.togglePlay()}
        title="Play/Pause (Space)"
      >
        {#if transcriptState.audioPaused}
          <Play size={18} />
        {:else}
          <Pause size={18} />
        {/if}
      </button>
      <button class="audio-btn" onclick={() => transcriptState.stopAudio()} title="Stop">
        <Square size={18} />
      </button>
    </div>

    <div class="audio-seeker-container">
      <span class="audio-time">{formatTime(transcriptState.audioCurrentTime)}</span>
      <input
        type="range"
        class="audio-seeker"
        min="0"
        max={transcriptState.audioDuration || 0}
        step="0.01"
        value={transcriptState.audioCurrentTime}
        oninput={handleSeek}
      />
      <span class="audio-time">{formatTime(transcriptState.audioDuration)}</span>
    </div>
  </div>
{/if}

<style>
  .audio-bar {
    position: sticky;
    top: 70px; /* Below the toolbar */
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.75rem 2rem;
    background: rgba(248, 250, 252, 0.95);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    z-index: 15;
  }

  .audio-controls {
    display: flex;
    gap: 0.5rem;
  }

  .audio-btn {
    background: none;
    border: none;
    color: var(--text-color, #334155);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.4rem;
    border-radius: 6px;
    transition: background-color 0.2s;
  }

  .audio-btn:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .audio-seeker-container {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .audio-time {
    font-family: var(--font-ui, monospace);
    font-size: 0.8rem;
    color: #64748b;
    font-variant-numeric: tabular-nums;
    min-width: 45px;
    text-align: center;
  }

  .audio-seeker {
    flex: 1;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
  }

  .audio-seeker::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent-color, #3b82f6);
    cursor: pointer;
    transition: transform 0.1s;
  }

  .audio-seeker::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }
</style>
