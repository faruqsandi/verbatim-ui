<script>
  import { getContext } from "svelte";
  import { Play, Pause, Square } from "@lucide/svelte";
  import WaveSurfer from "wavesurfer.js";

  const transcriptState = getContext("TRANSCRIPT_STATE");

  /** @type {HTMLDivElement | undefined} */
  let waveformEl = $state();
  /** @type {any} */
  let wavesurfer = null;

  // Reactively initialize and bind wavesurfer to the HTML5 Audio element
  $effect(() => {
    if (waveformEl && transcriptState.audio && transcriptState.audioLoaded) {
      if (wavesurfer) {
        wavesurfer.destroy();
      }

      try {
        wavesurfer = WaveSurfer.create({
          container: waveformEl,
          waveColor: "#cbd5e1",
          progressColor: "#3b82f6",
          media: transcriptState.audio,
          height: 48,
          cursorColor: "#2563eb",
          cursorWidth: 2,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
        });
      } catch (err) {
        console.error("WaveSurfer creation error:", err);
      }

      return () => {
        if (wavesurfer) {
          wavesurfer.destroy();
          wavesurfer = null;
        }
      };
    }
  });

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
   * @param {any} event
   */
  function handleSpeedChange(event) {
    transcriptState.setPlaybackRate(parseFloat(event.target.value));
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
      
      <div class="divider"></div>

      <select
        value={transcriptState.playbackRate}
        onchange={handleSpeedChange}
        class="speed-select"
        title="Playback Speed"
      >
        <option value={0.5}>0.5x</option>
        <option value={0.75}>0.75x</option>
        <option value={1.0}>1.0x</option>
        <option value={1.25}>1.25x</option>
        <option value={1.5}>1.5x</option>
        <option value={2.0}>2.0x</option>
      </select>
    </div>

    <div class="audio-seeker-container">
      <span class="audio-time">{formatTime(transcriptState.audioCurrentTime)}</span>
      
      <div class="waveform-container">
        <div bind:this={waveformEl}></div>
      </div>
      
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
    align-items: center;
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

  .divider {
    width: 1px;
    height: 1.25rem;
    background-color: rgba(0, 0, 0, 0.1);
    margin: 0 0.5rem;
  }

  .speed-select {
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    background: white;
    font-family: var(--font-ui);
    font-size: 0.8rem;
    color: var(--ui-color);
    cursor: pointer;
    outline: none;
    transition: border-color 0.2s;
  }

  .speed-select:hover {
    border-color: rgba(0, 0, 0, 0.2);
  }

  .speed-select:focus {
    border-color: var(--accent-color);
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

  .waveform-container {
    flex: 1;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 6px;
    padding: 4px 8px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }
</style>
