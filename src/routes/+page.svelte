<script>
  import { onMount } from 'svelte';
  import Papa from 'papaparse';
  import { ZoomIn, ZoomOut } from '@lucide/svelte';

  let words = [];
  let errorMsg = '';
  let isLoading = true;

  // Font size multiplier
  let fontScale = 1.0;

  onMount(async () => {
    try {
      const response = await fetch('/result.csv');
      const csvStr = await response.text();
      Papa.parse(csvStr, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          words = results.data;
          isLoading = false;
        },
        error: (err) => {
          errorMsg = err.message;
          isLoading = false;
        }
      });
    } catch (e) {
      errorMsg = e.toString();
      isLoading = false;
    }
  });

  function increaseFontSize() {
    if (fontScale < 2.5) fontScale += 0.1;
  }

  function decreaseFontSize() {
    if (fontScale > 0.6) fontScale -= 0.1;
  }

  // Format time for tooltip
  function formatTime(seconds) {
    if (!seconds) return '0:00';
    const s = parseFloat(seconds);
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }
</script>

<div class="app-container" style="--dynamic-scale: {fontScale}">
  <!-- Top Toolbar -->
  <header class="toolbar">
    <div class="toolbar-title">Reader</div>
    <div class="font-controls">
      <button on:click={decreaseFontSize} title="Decrease Font Size" class="icon-btn">
        <ZoomOut size={20} />
      </button>
      <div class="scale-indicator">{Math.round(fontScale * 100)}%</div>
      <button on:click={increaseFontSize} title="Increase Font Size" class="icon-btn">
        <ZoomIn size={20} />
      </button>
    </div>
  </header>

  <!-- Reading Area -->
  <main class="reading-area">
    {#if isLoading}
      <div class="loading">Loading content...</div>
    {:else if errorMsg}
      <div class="error">{errorMsg}</div>
    {:else}
      <article class="paragraph">
        {#each words as wordItem, i}
          <span 
            class="word" 
            contenteditable="true"
            bind:textContent={wordItem.word}
            title="{wordItem.speaker || 'Unknown'} • {formatTime(wordItem.start)} - {formatTime(wordItem.end)} • Score: {wordItem.score}"
          ></span>
          {' '}
        {/each}
      </article>
    {/if}
  </main>
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  /* Toolbar styling - minimalist, stays out of the way */
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
    z-index: 10;
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
    transition: background-color 0.2s, transform 0.1s;
  }

  .icon-btn:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }

  .icon-btn:active {
    transform: scale(0.95);
  }

  /* Main reading area */
  .reading-area {
    flex: 1;
    max-width: 720px;
    margin: 0 auto;
    padding: 4rem 2rem;
    width: 100%;
  }

  .paragraph {
    /* Base size is 18px, dynamically scaled */
    font-size: calc(var(--base-size) * var(--dynamic-scale));
    line-height: 1.8;
    text-align: justify;
    transition: font-size 0.2s ease-out;
  }

  .word {
    display: inline-block;
    cursor: text;
    border-radius: 4px;
    padding: 0 1px;
    margin: 0 -1px;
    transition: background-color 0.2s, color 0.2s;
    outline: none;
  }

  /* Subtle hover effect to keep it distraction-free but interactive */
  .word:hover {
    background-color: rgba(74, 144, 226, 0.1);
    color: var(--accent-color);
  }

  .loading, .error {
    font-family: var(--font-ui);
    text-align: center;
    color: var(--ui-color);
    margin-top: 20vh;
  }

  .error {
    color: #e74c3c;
  }
</style>
