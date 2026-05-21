<script>
  let words = ["Hello", "world", "this", "is", "a", "test"];
  let editingIdx = null;

  function edit(idx, e) {
    editingIdx = idx;
    // We need to wait for DOM update to focus and set caret
    setTimeout(() => {
      const el = e.target;
      el.focus();
    }, 0);
  }
</script>

<div style="padding: 50px;">
  {#each words as w, i}
    <span
      class="word"
      contenteditable={editingIdx === i}
      on:mousedown={(e) => {
        if (editingIdx !== i) {
            edit(i, e);
        }
      }}
      on:blur={() => editingIdx = null}
    >{w}</span>{' '}
  {/each}
</div>

<style>
  .word {
    padding: 2px;
  }
  .word:hover {
    background: #eee;
  }
</style>
