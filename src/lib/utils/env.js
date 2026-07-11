/**
 * Utility function to detect if the app is running inside Tauri desktop environment.
 * @returns {boolean}
 */
export const isTauri = () => {
  return typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
};
