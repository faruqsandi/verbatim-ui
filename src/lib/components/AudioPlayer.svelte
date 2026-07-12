<script>
  import { getContext } from "svelte";
  import { Play, Pause, Square, Volume2, VolumeX } from "@lucide/svelte";
  import WaveSurfer from "wavesurfer.js";
  import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";
  import MinimapPlugin from "wavesurfer.js/dist/plugins/minimap.esm.js";

  const transcriptState = getContext("TRANSCRIPT_STATE");

  /** @type {HTMLDivElement | undefined} */
  let waveformEl = $state();
  /** @type {HTMLDivElement | undefined} */
  let timelineEl = $state();
  /** @type {any} */
  let wavesurfer = null;

  let zoomLevel = $state(10);
  let volume = $state(1);
  let isMuted = $derived(volume === 0);

  // Sync volume to audio element
  $effect(() => {
    if (transcriptState.audio) {
      transcriptState.audio.volume = volume;
    }
  });

  // Reactively initialize and bind wavesurfer to the HTML5 Audio element
  $effect(() => {
    if (waveformEl && transcriptState.audio && transcriptState.audioLoaded) {
      if (wavesurfer) {
        wavesurfer.destroy();
        waveformEl.innerHTML = "";
        if (timelineEl) timelineEl.innerHTML = "";
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
          minPxPerSec: zoomLevel,
          plugins: [
            timelineEl ? TimelinePlugin.create({
              container: timelineEl,
              height: 16,
              timeInterval: 5,
              primaryLabelInterval: 10,
              style: {
                fontSize: '10px',
                color: '#64748b'
              }
            }) : null,
            MinimapPlugin.create({
              height: 20,
              waveColor: '#e2e8f0',
              progressColor: '#94a3b8',
              cursorWidth: 1,
              cursorColor: '#2563eb',
              overlayColor: 'rgba(59, 130, 246, 0.1)',
            })
          ].filter(Boolean)
        });

        // Make interactive
        wavesurfer.on('click', () => {
          transcriptState.audioCurrentTime = wavesurfer.getCurrentTime();
        });

      } catch (err) {
        console.error("WaveSurfer creation error:", err);
      }

      return () => {
        if (wavesurfer) {
          wavesurfer.destroy();
          wavesurfer = null;
          if (waveformEl) waveformEl.innerHTML = "";
          if (timelineEl) timelineEl.innerHTML = "";
        }
      };
    }
  });

  function handleZoom(e) {
    zoomLevel = Number(e.target.value);
    if (wavesurfer) {
      wavesurfer.zoom(zoomLevel);
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

      <div class="divider"></div>

      <div class="volume-control">
        <button class="audio-btn" onclick={() => volume = isMuted ? 1 : 0} title="Mute/Unmute">
          {#if isMuted}
            <VolumeX size={18} />
          {:else}
            <Volume2 size={18} />
          {/if}
        </button>
        <input type="range" min="0" max="1" step="0.05" bind:value={volume} class="volume-slider" title="Volume" />
      </div>

      <div class="divider"></div>

      <div class="zoom-control">
        <span style="font-size: 12px; color: #64748b;">Zoom</span>
        <input type="range" min="10" max="500" bind:value={zoomLevel} oninput={handleZoom} class="zoom-slider" title="Zoom Waveform" />
      </div>
    </div>

    <div class="audio-seeker-container">
      <span class="audio-time">{formatTime(transcriptState.audioCurrentTime)}</span>
      
      <div class="waveform-container">
        <div bind:this={waveformEl}></div>
        <div bind:this={timelineEl} class="timeline-el"></div>
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
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .timeline-el {
    width: 100%;
    opacity: 0.8;
  }

  .volume-control, .zoom-control {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .volume-slider, .zoom-slider {
    width: 60px;
    cursor: pointer;
  }
</style>
