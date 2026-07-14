import { invoke } from '@tauri-apps/api/core';

export class NativeMediaElement extends EventTarget {
  constructor() {
    super();
    this.src = "";
    this._currentTime = 0;
    this.duration = 0;
    this.paused = true;
    this.playbackRate = 1.0;
    this.volume = 1.0;
    this.muted = false;
    this.readyState = 0; // HAVE_NOTHING
    
    // Poll the native backend for accurate playhead time
    this.pollInterval = setInterval(async () => {
      if (!this.paused) {
        try {
          const time = await invoke('get_audio_time');
          this._currentTime = time;
          this.dispatchEvent(new Event('timeupdate'));
        } catch (e) {
          console.error("Failed to poll native audio time:", e);
        }
      }
    }, 1000 / 60); // 60fps polling for smooth WaveSurfer rendering
  }

  get currentTime() {
    return this._currentTime;
  }

  set currentTime(time) {
    this._currentTime = time;
    invoke('seek_audio', { timeSecs: time })
      .then(() => {
        this.dispatchEvent(new Event('seeking'));
        this.dispatchEvent(new Event('timeupdate'));
        this.dispatchEvent(new Event('seeked'));
      })
      .catch(console.error);
  }

  async play() {
    try {
      await invoke('play_audio');
      this.paused = false;
      this.dispatchEvent(new Event('play'));
      this.dispatchEvent(new Event('playing'));
    } catch (e) {
      console.error("Native play failed:", e);
      throw e;
    }
  }

  pause() {
    invoke('pause_audio').then(() => {
      this.paused = true;
      this.dispatchEvent(new Event('pause'));
    }).catch(console.error);
  }

  load() {
    // We handle file loading manually via `invoke('load_audio')` in audioStore.
    // This is just a stub for WaveSurfer's internal calls.
    this.dispatchEvent(new Event('emptied'));
  }
  
  destroy() {
    clearInterval(this.pollInterval);
  }
}
