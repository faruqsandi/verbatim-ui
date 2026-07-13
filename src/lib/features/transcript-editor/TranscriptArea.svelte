<script>
  import { getContext, tick } from "svelte";
  import WordBubble from "./WordBubble.svelte";

  const transcriptStore = getContext("TRANSCRIPT_STORE");
  const audioStore = getContext("AUDIO_STORE");
  const uiStore = getContext("UI_STORE");

  function formatTime(seconds) {
    if (!seconds) return "0:00";
    const s = parseFloat(seconds);
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  $effect(() => {
    const time = audioStore.audioCurrentTime;
    if (audioStore.audioLoaded && transcriptStore.words.length > 0) {
      let foundIndex = null;
      for (let i = 0; i < transcriptStore.words.length; i++) {
        const w = transcriptStore.words[i];
        if (
          time >= parseFloat(w.start) &&
          time <= parseFloat(w.end)
        ) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex !== transcriptStore.activeWordIndex) {
        transcriptStore.activeWordIndex = foundIndex;
        if (foundIndex !== null) {
          tick().then(() => {
            const wordEl = document.querySelector(`[data-index="${foundIndex}"]`);
            if (wordEl) {
              const rect = wordEl.getBoundingClientRect();
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
    ${transcriptStore.speakers
      .map(
        (sp, idx) => `
      .speaker-sp-${idx} {
        text-decoration: ${transcriptStore.showUnderlines ? "underline" : "none"};
        text-decoration-color: ${transcriptStore.speakerColors[sp] || "transparent"};
        text-decoration-thickness: 1.5px;
        text-underline-offset: 4px;
      }
    `,
      )
      .join("\n")}
  </style>`}
</svelte:head>

<main class="reading-area">
  {#if uiStore.showPanelLabels}
    <div class="panel-label">TranscriptArea</div>
  {/if}

  {#if transcriptStore.isLoading}
    <div class="loading">Loading content...</div>
  {:else if transcriptStore.errorMsg}
    <div class="error">{transcriptStore.errorMsg}</div>
  {:else if transcriptStore.words.length === 0}
    <div class="empty-state">
      <h2>Welcome to Verbatim UI</h2>
      <p>Load a CSV transcript and its corresponding audio file to begin editing.</p>
      <div class="empty-actions">
        <button onclick={() => transcriptStore.loadDemoData(audioStore)} class="primary-btn">
          Load Demo Data
        </button>
      </div>
    </div>
  {:else}
    <div class="chat-container">
      {#each transcriptStore.sentenceGroups as group (group.id)}
        <div class="chat-message">
          <div class="message-meta">
            <div
              class="speaker-avatar"
              style="background-color: {transcriptStore.speakerColors[group.speaker] || '#ccc'}"
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
                ? `speaker-sp-${transcriptStore.speakers.indexOf(group.speaker)}`
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
    position: relative;
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

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    margin-top: 15vh;
    font-family: var(--font-ui);
    color: var(--ui-color);
  }

  .empty-state h2 {
    color: var(--text-color);
    margin-bottom: 0.5rem;
  }

  .empty-actions {
    margin-top: 2rem;
  }

  .primary-btn {
    background-color: var(--accent-color);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .primary-btn:hover {
    opacity: 0.9;
  }
  
  .panel-label {
    position: absolute;
    top: 4px;
    right: 8px;
    font-size: 0.7rem;
    color: #94a3b8;
    font-family: var(--font-ui);
    pointer-events: none;
  }
</style>
