import { isTauri } from "../../utils/env.js";

export class StorageAdapter {
  static async openCsv() {
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const path = await open({
          filters: [{ name: "CSV Data", extensions: ["csv"] }],
          multiple: false,
        });
        return path;
      } catch (err) {
        console.error("Tauri open CSV error:", err);
        return null;
      }
    }
    // Web fallback uses <input type="file"> in components.
    return null;
  }

  static async readTextFile(path) {
    if (isTauri()) {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      return await readTextFile(path);
    }
    throw new Error("readTextFile is only available in Tauri");
  }

  static async saveTextFile(path, content, filename, mimeType = "text/csv") {
    if (isTauri()) {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        
        let savePath = path;
        if (!savePath) {
          savePath = await save({
            filters: [{ name: filename.split(".").pop().toUpperCase() + " File", extensions: [filename.split(".").pop()] }],
            defaultPath: filename,
          });
        }
        
        if (savePath) {
          await writeTextFile(savePath, content);
          return savePath; // Return new path to update state
        }
        return null;
      } catch (err) {
        console.error("Tauri save error:", err);
        return null;
      }
    }

    // Web browser fallback
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return null; 
  }

  static async openAudio() {
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const path = await open({
          filters: [{ name: "Audio Files", extensions: ["mp3", "wav", "ogg", "m4a", "flac"] }],
          multiple: false,
        });
        return path;
      } catch (err) {
        console.error("Tauri open audio error:", err);
        return null;
      }
    }
    return null;
  }

  static async convertFileSrc(nativePath) {
    if (isTauri()) {
      const { convertFileSrc } = await import("@tauri-apps/api/core");
      return convertFileSrc(nativePath);
    }
    return nativePath;
  }
}
