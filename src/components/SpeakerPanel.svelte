<script>
  import { state, updateState } from '../stores'
  import { get } from 'svelte/store'

  let newName = ''

  function addSpeaker(){
    const s = get(state)
    const id = 'sp' + (Date.now())
    s.speakers.push({ id, name: newName || 'New', color: '#10b981' })
    updateState(()=>{})
    newName = ''
  }
</script>

<div>
  <h4>Speakers</h4>
  {#each $state.speakers as sp}
    <div style="display:flex;align-items:center;gap:8px;margin:6px 0">
      <div class="speaker-badge" style="background:{sp.color}"></div>
      <div>{sp.name}</div>
    </div>
  {/each}

  <div style="margin-top:8px;display:flex;gap:8px">
    <input placeholder="New speaker" bind:value={newName} />
    <button class="btn" on:click={addSpeaker}>Add</button>
  </div>
</div>
