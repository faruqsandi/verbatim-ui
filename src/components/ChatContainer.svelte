<script>
  import { state, updateState } from '../stores'
  import ChatBubble from './ChatBubble.svelte'

  $: speakers = $state.speakers

  function addBubbleAt(index){
    const id = 'b' + Date.now()
    const speakerId = $state.speakers[0]?.id || 'sp1'
    const words = [{ text: '', ts: '00:00:00' }]
    $state.bubbles.splice(index, 0, { id, speakerId, words })
    updateState(()=>{})
  }
</script>

<div>
  {#each $state.bubbles as b, i (b.id)}
    <div class="gap-wrapper">
      <div class="gap" on:click={() => addBubbleAt(i)}>
        <span class="gap-text">+ add bubble</span>
      </div>
      <ChatBubble {b} />
    </div>
  {/each}

  <div class="gap" style="margin-top:8px;text-align:center" on:click={() => addBubbleAt($state.bubbles.length)}>
    <span class="gap-text">+ add bubble</span>
  </div>
</div>
