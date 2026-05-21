<script>
  import { createEventDispatcher } from 'svelte';
  
  export let words = [];
  export let speakers = [];
  export let activeWordIndex = null;

  const dispatch = createEventDispatcher();

  let viewport;
  let scrollTop = 0;
  const itemHeight = 36; // Height of each row in px

  let viewportHeight = 600;

  // We add a buffer of items outside the viewport to prevent flickering when scrolling
  const buffer = 10; 

  $: startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  $: visibleCount = Math.ceil(viewportHeight / itemHeight) + (buffer * 2);
  $: endIndex = Math.min(words.length, startIndex + visibleCount);

  $: visibleWords = words.slice(startIndex, endIndex).map((word, i) => ({
    ...word,
    originalIndex: startIndex + i
  }));

  $: topPadding = startIndex * itemHeight;
  $: bottomPadding = Math.max(0, (words.length - endIndex) * itemHeight);

  function handleScroll() {
    scrollTop = viewport.scrollTop;
  }

  function handleUpdate() {
    // Notify parent to trigger reactivity if needed
    dispatch('update');
  }

  // Format time for table
  function formatTime(seconds) {
    if (!seconds) return '0:00';
    const s = parseFloat(seconds);
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(2); // Two decimal places for table
    return `${m}:${sec.padStart(5, '0')}`;
  }

  // Auto-scroll when activeWordIndex changes externally
  let prevActiveWordIndex = null;
  $: if (activeWordIndex !== prevActiveWordIndex) {
    prevActiveWordIndex = activeWordIndex;
    if (activeWordIndex !== null && activeWordIndex !== undefined && viewport) {
      // Check if the row is outside the current viewport
      const currentScroll = viewport.scrollTop;
      const currentHeight = viewport.clientHeight;
      const rowTop = activeWordIndex * itemHeight;
      const rowBottom = rowTop + itemHeight;
      const isVisible = rowTop >= currentScroll && rowBottom <= (currentScroll + currentHeight);
      
      if (!isVisible) {
        // Center the row in the viewport
        const targetScroll = Math.max(0, rowTop - (currentHeight / 2) + (itemHeight / 2));
        viewport.scrollTo({ top: targetScroll, behavior: 'auto' });
      }
    }
  }
</script>

<div class="table-viewport" bind:this={viewport} on:scroll={handleScroll} bind:clientHeight={viewportHeight}>
  <table class="virtual-table">
    <thead>
      <tr>
        <th class="w-id">ID</th>
        <th class="w-word">Word</th>
        <th class="w-speaker">Speaker</th>
        <th class="w-time">Start</th>
        <th class="w-time">End</th>
      </tr>
    </thead>
    <tbody>
      {#if topPadding > 0}
        <tr style="height: {topPadding}px" class="padding-row">
          <td colspan="5"></td>
        </tr>
      {/if}

      {#each visibleWords as item (item.id)}
        <tr 
          style="height: {itemHeight}px" 
          class:active-row={activeWordIndex === item.originalIndex}
        >
          <td class="cell-id" title={item.id}>{item.id.slice(0, 4)}</td>
          <td class="cell-word">
            <input 
              type="text" 
              class="inline-input" 
              bind:value={words[item.originalIndex].word} 
              on:blur={handleUpdate} 
            />
          </td>
          <td class="cell-speaker">
            <select 
              class="inline-select" 
              bind:value={words[item.originalIndex].speaker} 
              on:change={handleUpdate}
            >
              {#each speakers as sp}
                <option value={sp}>{sp}</option>
              {/each}
            </select>
          </td>
          <td class="cell-time">{formatTime(item.start)}</td>
          <td class="cell-time">{formatTime(item.end)}</td>
        </tr>
      {/each}

      {#if bottomPadding > 0}
        <tr style="height: {bottomPadding}px" class="padding-row">
          <td colspan="5"></td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>

<style>
  .table-viewport {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    background: rgba(255, 255, 255, 0.4);
    border-radius: 8px;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
  }

  /* Custom scrollbar for webkit */
  .table-viewport::-webkit-scrollbar {
    width: 6px;
  }
  .table-viewport::-webkit-scrollbar-track {
    background: transparent;
  }
  .table-viewport::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 10px;
  }
  .table-viewport::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.25);
  }

  .virtual-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-ui, system-ui, -apple-system, sans-serif);
    font-size: 0.85rem;
    table-layout: fixed; /* Necessary for stable column widths */
  }

  thead {
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(248, 250, 252, 0.95);
    backdrop-filter: blur(8px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  th {
    text-align: left;
    padding: 0.5rem 0.75rem;
    color: var(--ui-color, #475569);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 0.75rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    white-space: nowrap;
  }

  /* Column widths */
  .w-id { width: 12%; }
  .w-word { width: 40%; }
  .w-speaker { width: 22%; }
  .w-time { width: 13%; }

  tr:not(.padding-row) {
    border-bottom: 1px solid rgba(0, 0, 0, 0.03);
    transition: background-color 0.2s;
  }
  
  tr:not(.padding-row):hover {
    background-color: rgba(255, 255, 255, 0.8);
  }

  tr.active-row {
    background-color: rgba(59, 130, 246, 0.1) !important;
  }
  
  tr.active-row td:first-child {
    box-shadow: inset 3px 0 0 #3b82f6;
  }

  td {
    padding: 0 0.5rem;
    color: var(--text-color, #334155);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cell-id {
    font-family: monospace;
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .cell-time {
    font-variant-numeric: tabular-nums;
    font-size: 0.8rem;
    color: #64748b;
  }

  /* Inputs and selects */
  .inline-input, .inline-select {
    width: 100%;
    box-sizing: border-box;
    padding: 0.25rem 0.5rem;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
    transition: all 0.2s;
  }

  .inline-input:hover, .inline-select:hover {
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(0, 0, 0, 0.1);
  }

  .inline-input:focus, .inline-select:focus {
    outline: none;
    background: #fff;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
</style>
