<script>
  import { getContext, tick } from "svelte";
  import WordBubble from "./WordBubble.svelte";

  const transcriptState = getContext("TRANSCRIPT_STATE");

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

  // Svelte 5: $effect monitors state changes reactively
  $effect(() => {
    const time = transcriptState.audioCurrentTime;
    if (transcriptState.audioLoaded && transcriptState.words.length > 0) {
      let foundIndex = null;
      for (let i = 0; i < transcriptState.words.length; i++) {
        const w = transcriptState.words[i];
        if (
          time >= parseFloat(w.start) &&
          time <= parseFloat(w.end)
        ) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex !== transcriptState.activeWordIndex) {
        transcriptState.activeWordIndex = foundIndex;
        if (foundIndex !== null) {
          tick().then(() => {
            const wordEl = transcriptState.wordElements[foundIndex];
            if (wordEl) {
              const rect = wordEl.getBoundingClientRect();
              // Scroll if the element is out of viewport scroll boundaries
              if (rect.top < 150 || rect.bottom > window.innerHeight - 150) {
                window.scrollBy({
                  top: rect.top - window.innerHeight / 2,
                  behavior: "smooth",
                });
              }
            }
          });
        }
      }
    }
  });
</script>

<svelte:head>
  {@html `<style>
    ${transcriptState.speakers
      .map(
        (sp, idx) => `
      .speaker-sp-${idx} {
        text-decoration: ${transcriptState.showUnderlines ? "underline" : "none"};
        text-decoration-color: ${transcriptState.speakerColors[sp] || "transparent"};
        text-decoration-thickness: 1.5px;
        text-underline-offset: 4px;
      }
    `,
      )
      .join("\n")}
  </style>`}
</svelte:head>

<main class="reading-area">
  {#if transcriptState.isLoading}
    <div class="loading">Loading content...</div>
  {:else if transcriptState.errorMsg}
    <div class="error">{transcriptState.errorMsg}</div>
  {:else}
    <div class="chat-container">
      {#each transcriptState.sentenceGroups as group (group.id)}
        <div class="chat-message">
          <div class="message-meta">
            <div
              class="speaker-avatar"
              style="background-color: {transcriptState.speakerColors[group.speaker] || '#ccc'}"
              title={group.speaker || "Unknown"}
            ></div>
            <div class="message-time">
              {formatTime(group.words[0].word.start)} - {formatTime(
                group.words[group.words.length - 1].word.end,
              )}
            </div>
            <div class="message-duration">
              {(
                (parseFloat(group.words[group.words.length - 1].word.end) || 0) -
                (parseFloat(group.words[0].word.start) || 0)
              ).toFixed(1)}s
            </div>
          </div>
          <div class="message-content paragraph">
            <span
              class="sentence {group.speaker
                ? `speaker-sp-${transcriptState.speakers.indexOf(group.speaker)}`
                : ''}"
            >
              {#each group.words as item, wIdx (item.word.id)}
                <WordBubble wordData={item.word} index={item.index} />{#if wIdx < group.words.length - 1}{" "}{/if}
              {/each}
            </span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</main>

<style>
  .reading-area {
    flex: 1;
    max-width: 800px;
    padding: 2rem;
    width: 100%;
  }

  .paragraph {
    font-size: calc(var(--base-size) * var(--dynamic-scale));
    line-height: 1.8;
    text-align: left;
    transition: font-size 0.2s ease-out;
  }

  .chat-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding-bottom: 2rem;
  }

  .chat-message {
    display: flex;
    gap: 1.25rem;
    align-items: flex-start;
  }

  .message-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
    flex-shrink: 0;
    margin-top: 0.25rem;
  }

  .speaker-avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    margin-bottom: 0.5rem;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }

  .message-time {
    font-family: var(--font-ui);
    font-size: 0.75rem;
    color: #666;
    text-align: center;
    line-height: 1.4;
    white-space: nowrap;
  }

  .message-duration {
    font-family: var(--font-ui);
    font-size: 0.7rem;
    color: #999;
    text-align: center;
    line-height: 1.4;
  }

  .loading,
  .error {
    font-family: var(--font-ui);
    text-align: center;
    color: var(--ui-color);
    margin-top: 20vh;
  }

  .error {
    color: #e74c3c;
  }
</style>
