<script>
  import { onMount, tick } from 'svelte';
  import Papa from 'papaparse';
  import { ZoomIn, ZoomOut } from '@lucide/svelte';

  let words = [];
  let errorMsg = '';
  let isLoading = true;
  let speakers = [];
  let speakerColors = {};

  let dynamicStyleElement;

  let showUnderlines = true;
  let separateSentences = false;

  let contextMenu = {
    show: false,
    x: 0,
    y: 0,
    word: null
  };

  const palette = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#f97316'  // orange-500
  ];

  // Font size multiplier
  let fontScale = 1.0;

  $: sentenceGroups = words.length > 0 ? words.reduce((groups, word, index) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.speaker === word.speaker) {
      lastGroup.words.push({ word, index });
    } else {
      groups.push({
        id: word.id, // Stable ID based on the first word
        speaker: word.speaker,
        words: [{ word, index }]
      });
    }
    return groups;
  }, []) : [];

  // Reactively update the dynamic style element when speakers or colors change
  $: if (dynamicStyleElement && speakers.length > 0 && (showUnderlines || !showUnderlines)) {
    const rules = speakers.map((sp, idx) => {
      return `
        .speaker-sp-${idx} {
          ${showUnderlines ? `text-decoration: ${speakerColors[sp]} underline 1.5px; text-underline-offset: 4px;` : ''}
        }
      `;
    }).join('\n');
    dynamicStyleElement.textContent = rules;
  }

  onMount(async () => {
    // Create a style element for dynamic speaker classes
    dynamicStyleElement = document.createElement('style');
    document.head.appendChild(dynamicStyleElement);

    try {
      const response = await fetch('/result.csv');
      const csvStr = await response.text();
      Papa.parse(csvStr, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          words = results.data.map(w => ({ ...w, id: Math.random().toString(36).substring(2, 10) }));
          
          const uniqueSpeakers = [...new Set(words.map(w => w.speaker).filter(Boolean))];
          speakers = uniqueSpeakers;
          uniqueSpeakers.forEach((sp, idx) => {
            speakerColors[sp] = palette[idx % palette.length];
          });
          
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

  async function handleKeydown(e, index) {
    const selection = window.getSelection();
    if (!selection.isCollapsed) return;

    const caretPos = selection.anchorOffset;
    const textLen = e.target.textContent.length;

    if (e.key === 'Backspace' && caretPos === 0) {
      if (index > 0) {
        e.preventDefault();
        const prevWord = words[index - 1];
        const currWord = words[index];
        
        const prevLength = prevWord.word.length;
        
        words[index - 1].word = prevWord.word + currWord.word;
        if (currWord.end) {
          words[index - 1].end = currWord.end;
        }
        
        words.splice(index, 1);
        words = words;
        
        await tick();
        
        const prevEl = document.getElementById(`word-${index - 1}`);
        if (prevEl) {
          prevEl.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          if (prevEl.firstChild) {
            range.setStart(prevEl.firstChild, prevLength);
          } else {
            range.setStart(prevEl, 0);
          }
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    } else if (e.key === 'Delete' && caretPos === textLen) {
      if (index < words.length - 1) {
        e.preventDefault();
        const currWord = words[index];
        const nextWord = words[index + 1];
        
        const currLength = currWord.word.length;
        
        words[index].word = currWord.word + nextWord.word;
        if (nextWord.end) {
          words[index].end = nextWord.end;
        }
        
        words.splice(index + 1, 1);
        words = words;
        
        await tick();
        
        const currEl = document.getElementById(`word-${index}`);
        if (currEl) {
          currEl.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          if (currEl.firstChild) {
            range.setStart(currEl.firstChild, currLength);
          } else {
            range.setStart(currEl, 0);
          }
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    } else if (e.key === 'ArrowLeft' && caretPos === 0) {
      if (index > 0) {
        e.preventDefault();
        const prevEl = document.getElementById(`word-${index - 1}`);
        if (prevEl) {
          prevEl.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          if (prevEl.firstChild) {
            range.setStart(prevEl.firstChild, prevEl.textContent.length);
          } else {
            range.setStart(prevEl, 0);
          }
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    } else if (e.key === 'ArrowRight' && caretPos === textLen) {
      if (index < words.length - 1) {
        e.preventDefault();
        const nextEl = document.getElementById(`word-${index + 1}`);
        if (nextEl) {
          nextEl.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          if (nextEl.firstChild) {
            range.setStart(nextEl.firstChild, 0);
          } else {
            range.setStart(nextEl, 0);
          }
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }
  }

  function handleContextMenu(e, wordData) {
    e.preventDefault();
    contextMenu = {
      show: true,
      x: e.clientX,
      y: e.clientY,
      word: wordData
    };
  }

  function handleGlobalClick() {
    if (contextMenu.show) {
      contextMenu.show = false;
    }
  }
</script>

<svelte:window on:click={handleGlobalClick} />

<div class="app-container" style="--dynamic-scale: {fontScale}">
  <!-- Top Toolbar -->
  <header class="toolbar">
    <div class="toolbar-title">Reader</div>
    <div class="font-controls">
      <label class="toggle-label">
        <input type="checkbox" bind:checked={showUnderlines}>
        Underlines
      </label>
      <label class="toggle-label">
        <input type="checkbox" bind:checked={separateSentences}>
        Newlines
      </label>
      <div class="divider"></div>
      <button on:click={decreaseFontSize} title="Decrease Font Size" class="icon-btn">
        <ZoomOut size={20} />
      </button>
      <div class="scale-indicator">{Math.round(fontScale * 100)}%</div>
      <button on:click={increaseFontSize} title="Increase Font Size" class="icon-btn">
        <ZoomIn size={20} />
      </button>
    </div>
  </header>

  <div class="content-wrapper">
    <!-- Reading Area -->
    <main class="reading-area">
      {#if isLoading}
        <div class="loading">Loading content...</div>
      {:else if errorMsg}
        <div class="error">{errorMsg}</div>
      {:else}
        <article class="paragraph {separateSentences ? 'separate-sentences' : ''}">
          {#each sentenceGroups as group (group.id)}
            <span class="sentence {group.speaker ? `speaker-sp-${speakers.indexOf(group.speaker)}` : ''}">
              {#each group.words as item, wIdx (item.word.id)}
                <span 
                  id="word-{item.index}"
                  class="word"
                  contenteditable="true"
                  bind:textContent={words[item.index].word}
                  on:keydown={(e) => handleKeydown(e, item.index)}
                  on:contextmenu={(e) => handleContextMenu(e, item.word)}
                  title="{item.word.speaker || 'Unknown'} • {formatTime(item.word.start)} - {formatTime(item.word.end)} • Score: {item.word.score}"
                ></span>{#if wIdx < group.words.length - 1}{' '}{/if}
              {/each}
            </span>{#if group !== sentenceGroups[sentenceGroups.length - 1]}{' '}{/if}
          {/each}
        </article>
      {/if}
    </main>

    <!-- Legend Sidebar -->
    {#if !isLoading && !errorMsg && speakers.length > 0}
      <aside class="right-sidebar">
        <div class="legend-box">
          <h3 class="legend-title">Speakers</h3>
          <ul class="legend-list">
            {#each speakers as sp}
              <li class="legend-item">
                <span class="color-dot" style="background-color: {speakerColors[sp]}"></span>
                <span class="speaker-name">{sp}</span>
              </li>
            {/each}
          </ul>
        </div>
      </aside>
    {/if}
  </div>

  {#if contextMenu.show && contextMenu.word}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div 
      class="context-menu" 
      style="left: {contextMenu.x}px; top: {contextMenu.y}px;"
      on:click|stopPropagation
    >
      <div class="menu-item">
        <strong>Speaker:</strong>
        <select 
          class="speaker-select" 
          bind:value={contextMenu.word.speaker} 
          on:change={() => { words = words; contextMenu.show = false; }}
        >
          {#each speakers as sp}
            <option value={sp}>{sp}</option>
          {/each}
        </select>
      </div>
      <div class="menu-item">
        <strong>Time:</strong> {formatTime(contextMenu.word.start)} - {formatTime(contextMenu.word.end)}
      </div>
    </div>
  {/if}
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
    transition: background-color 0.2s, transform 0.1s;
  }

  .icon-btn:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }

  .icon-btn:active {
    transform: scale(0.95);
  }

  .content-wrapper {
    display: flex;
    flex: 1;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    position: relative;
  }

  /* Main reading area */
  .reading-area {
    flex: 1;
    max-width: 800px;
    padding: 4rem 2rem;
    width: 100%;
  }

  /* Right Sidebar */
  .right-sidebar {
    width: 250px;
    padding: 4rem 1rem;
    position: sticky;
    top: 70px; /* offset by toolbar height */
    align-self: flex-start;
    max-height: calc(100vh - 70px);
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

  .paragraph {
    /* Base size is 18px, dynamically scaled */
    font-size: calc(var(--base-size) * var(--dynamic-scale));
    line-height: 1.8;
    text-align: justify;
    transition: font-size 0.2s ease-out;
  }

  .paragraph.separate-sentences .sentence {
    display: block;
    margin-bottom: 0.75rem;
  }

  .word {
    cursor: text;
    border-radius: 4px;
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

  .context-menu {
    position: fixed;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-radius: 8px;
    padding: 0.5rem;
    z-index: 1000;
    min-width: 160px;
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
  }

  .speaker-select:focus {
    border-color: var(--ui-color);
  }
</style>
