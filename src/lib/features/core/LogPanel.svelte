<script>
  import { getContext, onMount } from "svelte";

  const logger = getContext("LOGGER");
  const uiStore = getContext("UI_STORE");

  let logContainer = $state();
  let selectedLevel = $state("ALL");

  function clearLogs() {
    if (logger) logger.clear();
  }

  function toggleLogPanel() {
    uiStore.showLogPanel = !uiStore.showLogPanel;
  }

  let filteredLogs = $derived.by(() => {
    if (!logger) return [];
    if (selectedLevel === "ALL") return logger.logs;
    return logger.logs.filter((log) => log.level === selectedLevel);
  });

  // Auto-scroll to the bottom when new logs arrive
  $effect(() => {
    filteredLogs;
    if (logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  });
</script>

{#if uiStore.showLogPanel}
  <div class="log-panel-container">
    <div class="log-panel-header">
      <div class="header-left">
        <span class="panel-title">System Debug Log Console</span>
      </div>
      <div class="header-right">
        <select bind:value={selectedLevel} class="filter-select">
          <option value="ALL">All Levels</option>
          <option value="DEBUG">Debug Only</option>
          <option value="INFO">Info Only</option>
          <option value="WARN">Warnings Only</option>
          <option value="ERROR">Errors Only</option>
        </select>
        <button onclick={clearLogs} class="header-btn">Clear Logs</button>
        <button onclick={toggleLogPanel} class="header-btn close-btn">&times;</button>
      </div>
    </div>
    
    <div bind:this={logContainer} class="log-entries">
      {#if filteredLogs.length === 0}
        <div class="no-logs">No log entries found.</div>
      {:else}
        {#each filteredLogs as entry}
          <div class="log-entry {entry.level.toLowerCase()}">
            <span class="log-time">[{entry.timestamp}]</span>
            <span class="log-level-badge">{entry.level}</span>
            <span class="log-source">[{entry.source}]</span>
            <span class="log-msg">{entry.message}</span>
          </div>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<style>
  .log-panel-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 250px;
    background: #1e1e24;
    color: #e2e8f0;
    border-top: 2px solid #334155;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    font-family: Consolas, "Courier New", Courier, monospace;
    font-size: 0.85rem;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
  }

  .log-panel-header {
    background: #0f172a;
    padding: 0.5rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #1e293b;
    user-select: none;
  }

  .panel-title {
    font-weight: bold;
    color: #38bdf8;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.5px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .filter-select {
    background: #1e293b;
    color: #f1f5f9;
    border: 1px solid #475569;
    border-radius: 4px;
    padding: 0.2rem 0.5rem;
    font-family: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .header-btn {
    background: #334155;
    color: #f1f5f9;
    border: none;
    border-radius: 4px;
    padding: 0.25rem 0.6rem;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.75rem;
    transition: background 0.15s;
  }

  .header-btn:hover {
    background: #475569;
  }

  .close-btn {
    background: #ef4444;
    font-weight: bold;
    font-size: 0.95rem;
    padding: 0.1rem 0.5rem;
  }

  .close-btn:hover {
    background: #f87171;
  }

  .log-entries {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .no-logs {
    color: #64748b;
    text-align: center;
    margin-top: 2rem;
  }

  .log-entry {
    display: flex;
    gap: 0.5rem;
    line-height: 1.35;
    word-break: break-all;
    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    padding-bottom: 0.15rem;
  }

  .log-time {
    color: #64748b;
    flex-shrink: 0;
  }

  .log-level-badge {
    font-weight: bold;
    min-width: 50px;
    text-align: center;
    border-radius: 2px;
    font-size: 0.7rem;
    padding: 0 0.25rem;
    flex-shrink: 0;
    align-self: center;
  }

  .log-source {
    color: #a855f7;
    font-weight: 500;
    flex-shrink: 0;
  }

  .log-msg {
    color: #f1f5f9;
  }

  /* Levels styling */
  .log-entry.debug .log-level-badge {
    background: rgba(148, 163, 184, 0.2);
    color: #94a3b8;
  }
  .log-entry.debug .log-msg {
    color: #94a3b8;
  }

  .log-entry.info .log-level-badge {
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
  }
  .log-entry.info .log-msg {
    color: #e2e8f0;
  }

  .log-entry.warn .log-level-badge {
    background: rgba(234, 179, 8, 0.2);
    color: #facc15;
  }
  .log-entry.warn .log-msg {
    color: #fef08a;
  }

  .log-entry.error .log-level-badge {
    background: rgba(239, 68, 68, 0.2);
    color: #f87171;
  }
  .log-entry.error .log-msg {
    color: #fca5a5;
    font-weight: bold;
  }
</style>
