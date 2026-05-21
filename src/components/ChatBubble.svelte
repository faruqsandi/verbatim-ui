<script>
  import { state, updateState } from '../stores'
  import { get } from 'svelte/store'

  export let b

  let editing = (b.words && b.words.length===1 && b.words[0].text.trim()==='')
  let editText = ''
  
  // Context Menu State
  let showMenu = false;
  let menuX = 0;
  let menuY = 0;
  let menuTarget = null; // 'bubble' or 'word'
  let targetWordIndex = -1;

  // Track single word editing state
  let editMode = null; // 'bubble' or 'word'
  let editingWordIndex = -1;

  $: speaker = get(state).speakers.find(s => s.id === b.speakerId)

  // Listen to window clicks to close context menu
  function handleWindowClick() {
    if (showMenu) showMenu = false;
  }

  function handleBubbleContextMenu(e) {
    e.preventDefault();
    showMenu = true;
    menuX = e.clientX;
    menuY = e.clientY;
    menuTarget = 'bubble';
    targetWordIndex = -1;
  }

  function handleWordContextMenu(e, idx) {
    e.preventDefault();
    e.stopPropagation();
    showMenu = true;
    menuX = e.clientX;
    menuY = e.clientY;
    menuTarget = 'word';
    targetWordIndex = idx;
  }

  function startEditBubble() {
    showMenu = false;
    editMode = 'bubble';
    editing = true;
    editText = b.words.map(w => `${w.ts || '00:00:00'} ${w.text}`).join('\n');
  }

  function startEditWord() {
    showMenu = false;
    editMode = 'word';
    editingWordIndex = targetWordIndex;
    editing = true;
    const w = b.words[targetWordIndex];
    editText = `${w.ts || '00:00:00'} ${w.text}`;
  }

  $: if (!editing && b.words && b.words.length===1 && b.words[0].text.trim()===''){
    editMode = 'bubble';
    editing = true;
  }

  function saveEdit() {
    // Parse subtitles format
    const lines = editText.split('\n').filter(l => l.trim() !== '');
    const newWords = [];
    
    for (let line of lines) {
      const match = line.trim().match(/^(\d{2}:\d{2}:\d{2})\s+(.*)$/);
      if (match) {
        newWords.push({ ts: match[1], text: match[2].trim() });
      } else {
        // Fallback if user messes up timestamp format
        const parts = line.trim().split(/\s+/);
        const possibleTs = parts[0];
        const rest = parts.slice(1).join(' ');
        if (/^\d{2}:\d{2}:\d{2}$/.test(possibleTs)) {
           newWords.push({ ts: possibleTs, text: rest });
        } else {
           // Default fallback timestamp (just keep previous if available or 00:00:00)
           newWords.push({ ts: '00:00:00', text: line.trim() });
        }
      }
    }

    if (editMode === 'bubble') {
      b.words = newWords;
      b.words.sort((a,b) => a.ts.localeCompare(b.ts));
    } else if (editMode === 'word') {
      b.words.splice(editingWordIndex, 1, ...newWords);
      b.words.sort((a,b) => a.ts.localeCompare(b.ts));
    }
    
    editing = false;
    editMode = null;
    editingWordIndex = -1;
    updateState(()=>{})
  }

  function deleteBubble() {
    showMenu = false;
    const s = get(state)
    s.bubbles = s.bubbles.filter(x => x.id !== b.id)
    updateState(()=>{})
  }

  function deleteWord() {
    showMenu = false;
    b.words.splice(targetWordIndex, 1);
    if (b.words.length === 0) {
      deleteBubble();
    } else {
      updateState(()=>{});
    }
  }

  function changeBubbleSpeaker(e) {
    showMenu = false;
    const newSp = e.target.value;
    if (!newSp) return;
    b.speakerId = newSp;
    updateState(()=>{});
  }

  function changeWordSpeaker(e) {
    showMenu = false;
    const newSp = e.target.value;
    if (!newSp) return;
    if (newSp === b.speakerId) return; // No change

    const s = get(state);
    const beforeWords = b.words.slice(0, targetWordIndex);
    const word = b.words[targetWordIndex];
    const afterWords = b.words.slice(targetWordIndex + 1);
    
    b.words = beforeWords;
    
    const idx = s.bubbles.findIndex(x => x.id === b.id);
    let insertIndex = idx + 1;
    
    const newBubble = { id: 'b' + Date.now() + '_1', speakerId: newSp, words: [word] };
    s.bubbles.splice(insertIndex, 0, newBubble);
    insertIndex++;

    if (afterWords.length > 0) {
      const afterBubble = { id: 'b' + Date.now() + '_2', speakerId: b.speakerId, words: afterWords };
      s.bubbles.splice(insertIndex, 0, afterBubble);
    }

    if (b.words.length === 0) {
      s.bubbles = s.bubbles.filter(x => x.id !== b.id);
    }

    updateState(()=>{});
  }

</script>

<svelte:window on:click={handleWindowClick} />

<div class="bubble" style="background:{speaker?.color}22" on:contextmenu={handleBubbleContextMenu}>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
    <div class="speaker-badge" style="background:{speaker?.color}"></div>
    <strong>{speaker?.name}</strong>
  </div>

  {#if editing}
    <div class="editor-wrapper">
      <textarea class="editor-textarea" bind:value={editText} placeholder="00:00:00 Word"></textarea>
      <div class="editor-actions">
        <button class="btn secondary" on:click={() => editing=false}>Cancel</button>
        <button class="btn" on:click={saveEdit}>Save</button>
      </div>
    </div>
  {:else}
    <div class="words">
      {#each b.words as w, i}
        <div class="word" on:contextmenu={(e) => handleWordContextMenu(e, i)}>
          <div>{w.text}</div>
          <small>{w.ts}</small>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if showMenu}
  <div class="context-menu" style="left: {menuX}px; top: {menuY}px;" on:click|stopPropagation>
    {#if menuTarget === 'bubble'}
      <button class="context-menu-item" on:click={startEditBubble}>
        Edit Bubble
      </button>
      <div class="context-menu-item">
        Speaker
        <select class="context-menu-select" value={b.speakerId} on:change={changeBubbleSpeaker}>
          <option value="" disabled>Select...</option>
          {#each $state.speakers as sp}
            <option value={sp.id}>{sp.name}</option>
          {/each}
        </select>
      </div>
      <div class="context-menu-divider"></div>
      <button class="context-menu-item danger" on:click={deleteBubble}>
        Delete Bubble
      </button>
    {:else if menuTarget === 'word'}
      <button class="context-menu-item" on:click={startEditWord}>
        Edit Word
      </button>
      <div class="context-menu-item">
        Speaker
        <select class="context-menu-select" value={b.speakerId} on:change={changeWordSpeaker}>
          <option value="" disabled>Select...</option>
          {#each $state.speakers as sp}
            <option value={sp.id}>{sp.name}</option>
          {/each}
        </select>
      </div>
      <div class="context-menu-divider"></div>
      <button class="context-menu-item danger" on:click={deleteWord}>
        Delete Word
      </button>
    {/if}
  </div>
{/if}
