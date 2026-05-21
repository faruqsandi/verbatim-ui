<script>
  import { state, updateState } from '../stores'
  import ChatBubble from './ChatBubble.svelte'

  let newText = ''
  let newSpeaker = ''

  $: speakers = $state.speakers

  function addBubble(){
    if(!newText) return
    const id = 'b' + Date.now()
    const words = newText.split(/\s+/).filter(Boolean).map((w,i)=>({text:w, ts: '--:--:' + (i+1)}))
    $state.bubbles.push({ id, speakerId: newSpeaker || $state.speakers[0].id, words })
    updateState(()=>{})
    newText=''
  }
</script>

<div>
  <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center">
    <input placeholder="Add bubble text" bind:value={newText} style="flex:1" />
    <select bind:value={newSpeaker}>
      {#each $state.speakers as sp}
        <option value={sp.id}>{sp.name}</option>
      {/each}
    </select>
    <button class="btn" on:click={addBubble}>Add</button>
  </div>

  {#each $state.bubbles as b (b.id)}
    <ChatBubble {b} />
  {/each}
</div>
