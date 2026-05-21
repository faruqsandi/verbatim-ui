<script>
  import { state, updateState } from '../stores'
  import { get } from 'svelte/store'

  export let b

  let editing = (b.words && b.words.length===1 && b.words[0].text.trim()==='')
  let editText = ''
  let selectedWordIndex = -1
  let assignSpeaker = ''

  $: speaker = get(state).speakers.find(s => s.id === b.speakerId)

  function startEdit(){
    editing = true
    editText = b.words.map(w=>w.text).join(' ')
  }

$: if (!editing && b.words && b.words.length===1 && b.words[0].text.trim()===''){
  editing = true
}

  function saveEdit(){
    const words = editText.split(/\s+/).filter(Boolean).map((t,i)=>({text:t, ts: b.words[i]?.ts || '00:00:00'}))
    b.words = words
    editing = false
    updateState(()=>{})
  }

  function deleteBubble(){
    const s = get(state)
    s.bubbles = s.bubbles.filter(x=>x.id !== b.id)
    updateState(()=>{})
  }

  function onWordClick(i){
    selectedWordIndex = i
  }

  function assignSelected(){
    if(selectedWordIndex<0) return
    const s = get(state)
    const speakerId = assignSpeaker || s.speakers[0].id
    // remove word from this bubble
    const word = b.words[selectedWordIndex]
    b.words.splice(selectedWordIndex,1)
    // create or append to a new bubble right after
    const newId = 'b' + Date.now()
    const newBubble = { id: newId, speakerId, words: [word] }
    const idx = s.bubbles.findIndex(x=>x.id===b.id)
    s.bubbles.splice(idx+1,0,newBubble)
    selectedWordIndex = -1
    updateState(()=>{})
  }

  function reassignBubble(newSp){
    b.speakerId = newSp
    updateState(()=>{})
  }
</script>

<div class="bubble" style="background:{speaker?.color}22">
  <div style="display:flex;align-items:center;gap:8px">
    <div class="speaker-badge" style="background:{speaker?.color}"></div>
    <strong>{speaker?.name}</strong>
    <div class="controls" style="margin-left:auto">
      <button class="btn secondary" on:click={startEdit}>Edit</button>
      <button class="btn secondary" on:click={deleteBubble}>Delete</button>
      <select on:change={(e)=>reassignBubble(e.target.value)}>
        {#each $state.speakers as sp}
          <option value={sp.id} selected={sp.id===b.speakerId}>{sp.name}</option>
        {/each}
      </select>
    </div>
  </div>

  {#if editing}
    <div style="margin-top:8px">
      <textarea bind:value={editText} style="width:100%;height:80px"></textarea>
      <div style="margin-top:8px">
        <button class="btn" on:click={saveEdit}>Save</button>
        <button class="btn secondary" on:click={()=>editing=false}>Cancel</button>
      </div>
    </div>
  {:else}
    <div class="words" style="margin-top:8px">
      {#each b.words as w, i}
        <div class="word" on:click={()=>onWordClick(i)} style="border: {i===selectedWordIndex ? '1px solid #fff' : 'none'}">
          <div>{w.text}</div>
          <small>{w.ts}</small>
        </div>
      {/each}
    </div>

    <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
      <select bind:value={assignSpeaker}>
        <option value=''>-- assign speaker --</option>
        {#each $state.speakers as sp}
          <option value={sp.id}>{sp.name}</option>
        {/each}
      </select>
      <button class="btn" on:click={assignSelected}>Split selected word</button>
      <div style="margin-left:auto">Words: {b.words.length}</div>
    </div>
  {/if}
</div>
