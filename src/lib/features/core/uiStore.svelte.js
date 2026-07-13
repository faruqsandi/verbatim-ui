export class UiStore {
  showTablePanel = $state(false);
  fontScale = $state(1.0);
  isDarkMode = $state(false);
  showPanelLabels = $state(true);
  showPropertiesPanel = $state(true);

  /** @type {any} */
  webFileHandle = $state(null);
  
  contextMenu = $state({
    show: false,
    x: 0,
    y: 0,
    word: null,
    showDropdown: false,
  });

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    if (typeof document !== 'undefined') {
      if (this.isDarkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }

  toggleTablePanel() {
    this.showTablePanel = !this.showTablePanel;
  }
  
  togglePanelLabels() {
    this.showPanelLabels = !this.showPanelLabels;
  }

  togglePropertiesPanel() {
    this.showPropertiesPanel = !this.showPropertiesPanel;
  }

  hideContextMenu() {
    if (this.contextMenu.show) {
      this.contextMenu.show = false;
    }
  }

  showContextMenu(x, y, word) {
    this.contextMenu = {
      show: true,
      x,
      y,
      word,
      showDropdown: false
    };
  }
}
