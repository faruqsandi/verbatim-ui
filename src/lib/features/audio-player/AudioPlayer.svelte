<script>
  import { getContext } from "svelte";
  import { Play, Pause, Square, Volume2, VolumeX } from "@lucide/svelte";
  import WaveSurfer from "wavesurfer.js";
  import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";
  import MinimapPlugin from "wavesurfer.js/dist/plugins/minimap.esm.js";

  const audioStore = getContext("AUDIO_STORE");
  const transcriptStore = getContext("TRANSCRIPT_STORE");
  const uiStore = getContext("UI_STORE");

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
    if (audioStore.audio) {
      audioStore.audio.volume = volume;
    }
  });

  // Reactively initialize and bind wavesurfer to the HTML5 Audio element
  $effect(() => {
    if (waveformEl && audioStore.audio && audioStore.audioLoaded) {
      if (wavesurfer) {
        wavesurfer.destroy();
        waveformEl.innerHTML = "";
        if (timelineEl) timelineEl.innerHTML = "";
      }

      try {
        console.log("Creating WaveSurfer with:", {
          hasMedia: !!audioStore.audio,
          peaksLength: audioStore.peaks ? audioStore.peaks.length : 0,
          duration: audioStore.audioDuration
        });
        
        wavesurfer = WaveSurfer.create({
          container: waveformEl,
          waveColor: "#cbd5e1",
          progressColor: "#3b82f6",
          media: audioStore.audio,
          peaks: audioStore.peaks ? [audioStore.peaks] : undefined,
          duration: audioStore.audioDuration || undefined,
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

        wavesurfer.on('error', (err) => {
          console.error("WaveSurfer Error:", err);
        });

        // Make interactive
        wavesurfer.on('click', () => {
          audioStore.audioCurrentTime = wavesurfer.getCurrentTime();
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
    audioStore.setPlaybackRate(parseFloat(event.target.value));
  }
</script>

{#if audioStore.audioLoaded}
  <div class="audio-bar">
    {#if uiStore.showPanelLabels}
      <div class="panel-label">AudioPlayer</div>
    {/if}
    
    <div class="audio-controls">
      <button
        class="play-btn"
        onclick={() => audioStore.togglePlay()}
        title="Play/Pause (Space)"
      >
        {#if audioStore.audioPaused}
          <Play fill="currentColor" size={20} />
        {:else}
          <Pause fill="currentColor" size={20} />
        {/if}
      </button>
      <button class="audio-btn" onclick={() => audioStore.stopAudio()} title="Stop">
        <Square size={18} />
      </button>
      
      <div class="divider"></div>

      <select
        value={audioStore.playbackRate}
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

      <div class="divider-subtle"></div>

      <div class="control-group">
        <button class="audio-btn" onclick={() => volume = isMuted ? 1 : 0} title="Mute/Unmute">
          {#if isMuted}
            <VolumeX size={16} />
          {:else}
            <Volume2 size={16} />
          {/if}
        </button>
        <input type="range" min="0" max="1" step="0.05" bind:value={volume} class="volume-slider" title="Volume" />
      </div>

      <div class="divider-subtle"></div>

      <div class="zoom-control">
        <span style="font-size: 12px; color: #64748b;">Zoom</span>
        <input type="range" min="10" max="500" bind:value={zoomLevel} oninput={handleZoom} class="zoom-slider" title="Zoom Waveform" />
      </div>
    </div>

    <div class="audio-seeker-container">
      <span class="audio-time">{formatTime(audioStore.audioCurrentTime)}</span>
      
      <div class="waveform-container">
        <div bind:this={waveformEl} style="width: 100%;"></div>
        <div bind:this={timelineEl} class="timeline-el"></div>
      </div>
      
      <span class="audio-time">{formatTime(audioStore.audioDuration)}</span>
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
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01);
    z-index: 15;
  }

  .audio-controls {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: white;
    padding: 0.35rem 0.5rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.04);
  }

  .play-btn {
    background: var(--accent-color, #3b82f6);
    color: white;
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .play-btn:hover {
    transform: scale(1.05);
    background: #2563eb;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
  }

  .play-btn:active {
    transform: scale(0.95);
  }

  .audio-btn {
    background: transparent;
    border: none;
    color: var(--ui-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.4rem;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .audio-btn:hover {
    background-color: rgba(0, 0, 0, 0.06);
    color: var(--text-color);
  }

  .divider-subtle {
    width: 1px;
    height: 1.25rem;
    background-color: rgba(0, 0, 0, 0.08);
    margin: 0 0.25rem;
  }

  .speed-select {
    padding: 0.25rem 0.4rem;
    border-radius: 6px;
    border: none;
    background: transparent;
    font-family: var(--font-ui);
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--ui-color);
    cursor: pointer;
    outline: none;
    transition: color 0.2s;
  }

  .speed-select:hover {
    color: var(--text-color);
    background: rgba(0, 0, 0, 0.04);
  }

  .speed-select:focus {
    border-color: var(--accent-color);
  }

  .audio-seeker-container {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 0;
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
    background: white;
    border-radius: 12px;
    padding: 4px 12px;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(0, 0, 0, 0.05);
    overflow: hidden;
    min-width: 0;
  }

  .timeline-el {
    width: 100%;
    opacity: 0.8;
  }

  .control-group, .zoom-control {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .volume-slider, .zoom-slider {
    width: 60px;
    cursor: pointer;
  }
  
  .panel-label {
    position: absolute;
    top: 4px;
    right: 8px;
    font-size: 0.7rem;
    color: #94a3b8;
    font-family: var(--font-ui);
    pointer-events: none;
  }
</style>
