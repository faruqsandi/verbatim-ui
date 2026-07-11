<script>
  import { getContext, tick } from "svelte";

  // Svelte 5 syntax: props are passed via destructuring of $props()
  let { wordData, index } = $props();

  const state = getContext("TRANSCRIPT_STATE");

  /**
   * @param {any} seconds
   */
  function formatTime(seconds) {
    if (!seconds) return "0:00";
    const s = parseFloat(seconds);
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  /**
   * @param {any} e
   */
  async function handleKeydown(e) {
    const selection = window.getSelection();
    if (!selection || !selection.isCollapsed) return;

    const caretPos = selection.anchorOffset;
    const textLen = e.target.textContent ? e.target.textContent.length : 0;

    if (e.key === "Backspace" && caretPos === 0) {
      if (index > 0) {
        e.preventDefault();
        const prevWord = state.words[index - 1];
        const currWord = state.words[index];
        const prevLength = prevWord.word.length;

        state.words[index - 1].word = prevWord.word + currWord.word;
        if (currWord.end) {
          state.words[index - 1].end = currWord.end;
        }

        state.words.splice(index, 1);
        state.words = state.words;
        state.pushState();

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
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
    } else if (e.key === "Delete" && caretPos === textLen) {
      if (index < state.words.length - 1) {
        e.preventDefault();
        const currWord = state.words[index];
        const nextWord = state.words[index + 1];
        const currLength = currWord.word.length;

        state.words[index].word = currWord.word + nextWord.word;
        if (nextWord.end) {
          state.words[index].end = nextWord.end;
        }

        state.words.splice(index + 1, 1);
        state.words = state.words;
        state.pushState();

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
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
    } else if (e.key === "ArrowLeft" && caretPos === 0) {
      if (index > 0) {
        e.preventDefault();
        const prevEl = document.getElementById(`word-${index - 1}`);
        if (prevEl) {
          prevEl.focus();
          const range = document.createRange();
          const sel = window.getSelection();
          if (prevEl.firstChild) {
            range.setStart(prevEl.firstChild, prevEl.textContent ? prevEl.textContent.length : 0);
          } else {
            range.setStart(prevEl, 0);
          }
          range.collapse(true);
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
    } else if (e.key === "ArrowRight" && caretPos === textLen) {
      if (index < state.words.length - 1) {
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
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
    }
  }

  /**
   * @param {any} e
   */
  function handleContextMenu(e) {
    e.preventDefault();
    state.activeWordIndex = index;
    state.contextMenu = {
      show: true,
      x: e.clientX,
      y: e.clientY,
      word: wordData,
      showDropdown: false,
    };
  }
</script>

<span
  role="textbox"
  tabindex="0"
  id="word-{index}"
  class="word"
  class:active={state.activeWordIndex === index}
  contenteditable="true"
  bind:textContent={state.words[index].word}
  onfocus={() => {
    state.activeWordIndex = index;
    if (state.words[index] && state.words[index].start) {
      state.seekAudioTo(parseFloat(state.words[index].start));
    }
  }}
  onblur={() => state.pushState()}
  onclick={() => {
    state.activeWordIndex = index;
    if (state.words[index] && state.words[index].start) {
      state.seekAudioTo(parseFloat(state.words[index].start));
    }
  }}
  onkeydown={handleKeydown}
  oncontextmenu={handleContextMenu}
  title="{wordData.speaker || 'Unknown'} • {formatTime(wordData.start)} - {formatTime(wordData.end)} • Score: {wordData.score}"
></span>

<style>
  .word {
    cursor: text;
    border-radius: 4px;
    transition:
      background-color 0.2s,
      color 0.2s;
    outline: none;
  }

  .word:hover,
  .word.active {
    background-color: rgba(74, 144, 226, 0.15);
    color: var(--accent-color);
  }
</style>
