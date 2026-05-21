<script>
  import ChatContainer from './components/ChatContainer.svelte'
  import SpeakerPanel from './components/SpeakerPanel.svelte'
</script>

<div class="app">
  <div class="header">
    <h2>Verbatim UI — Diarization Editor (Svelte + Tauri)</h2>
    <div>Mock data — localStorage persistence</div>
  </div>
  <div class="layout">
    <div class="sidebar">
      <div class="panel">
        <SpeakerPanel />
      </div>
    </div>
    <div class="chat">
      <ChatContainer />
    </div>
  </div>
</div>
