<script>
  import { getContext, tick } from "svelte";

  let { wordData, index } = $props();

  const transcriptStore = getContext("TRANSCRIPT_STORE");
  const audioStore = getContext("AUDIO_STORE");
  const uiStore = getContext("UI_STORE");

  /** @type {HTMLElement | undefined} */
  let element = $state();

  $effect(() => {
    if (element && transcriptStore.words[index]) {
      const stateWord = transcriptStore.words[index].word;
      if (element.textContent !== stateWord) {
        element.textContent = stateWord;
      }
    }
  });

  function handleInput(e) {
    if (transcriptStore.words[index]) {
      transcriptStore.words[index].word = e.target.textContent;
    }
  }

  function formatTime(seconds) {
    if (!seconds) return "0:00";
    const s = parseFloat(seconds);
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  async function handleKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      audioStore.togglePlay();
      return;
    }
    if (e.key === "ArrowLeft" && e.ctrlKey) {
      e.preventDefault();
      audioStore.seekAudioTo(audioStore.audioCurrentTime - 3);
      return;
    }
    if (e.key === "ArrowRight" && e.ctrlKey) {
      e.preventDefault();
      audioStore.seekAudioTo(audioStore.audioCurrentTime + 3);
      return;
    }

    const selection = window.getSelection();
    if (!selection || !selection.isCollapsed) return;

    const caretPos = selection.anchorOffset;
    const textLen = e.target.textContent ? e.target.textContent.length : 0;

    if (e.key === "Backspace" && caretPos === 0) {
      if (index > 0) {
        e.preventDefault();
        const prevWord = transcriptStore.words[index - 1];
        const currWord = transcriptStore.words[index];
        const prevLength = prevWord.word.length;

        transcriptStore.words[index - 1].word = prevWord.word + currWord.word;
        if (currWord.end) {
          transcriptStore.words[index - 1].end = currWord.end;
        }

        transcriptStore.words.splice(index, 1);
        transcriptStore.words = transcriptStore.words;
        transcriptStore.pushState();

        await tick();

        const prevEl = document.querySelector(`[data-index="${index - 1}"]`);
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
      if (index < transcriptStore.words.length - 1) {
        e.preventDefault();
        const currWord = transcriptStore.words[index];
        const nextWord = transcriptStore.words[index + 1];
        const currLength = currWord.word.length;

        transcriptStore.words[index].word = currWord.word + nextWord.word;
        if (nextWord.end) {
          transcriptStore.words[index].end = nextWord.end;
        }

        transcriptStore.words.splice(index + 1, 1);
        transcriptStore.words = transcriptStore.words;
        transcriptStore.pushState();

        await tick();

        const currEl = document.querySelector(`[data-index="${index}"]`);
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
        const prevEl = document.querySelector(`[data-index="${index - 1}"]`);
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
      if (index < transcriptStore.words.length - 1) {
        e.preventDefault();
        const nextEl = document.querySelector(`[data-index="${index + 1}"]`);
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

  function handleContextMenu(e) {
    e.preventDefault();
    transcriptStore.activeWordIndex = index;
    uiStore.showContextMenu(e.clientX, e.clientY, wordData);
  }
</script>

<span
  bind:this={element}
  role="textbox"
  tabindex="0"
  id="word-{index}"
  data-index={index}
  class="word"
  class:active={transcriptStore.activeWordIndex === index}
  class:low-confidence={wordData.score !== undefined && wordData.score < 0.8}
  contenteditable="true"
  oninput={handleInput}
  onfocus={() => {
    transcriptStore.activeWordIndex = index;
    if (transcriptStore.words[index] && transcriptStore.words[index].start) {
      audioStore.seekAudioTo(parseFloat(transcriptStore.words[index].start));
    }
  }}
  onblur={() => transcriptStore.pushState()}
  onclick={() => {
    transcriptStore.activeWordIndex = index;
    if (transcriptStore.words[index] && transcriptStore.words[index].start) {
      audioStore.seekAudioTo(parseFloat(transcriptStore.words[index].start));
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

  .word.low-confidence {
    text-decoration: underline dotted #f87171;
    text-underline-offset: 4px;
  }
</style>
