import { isTauri } from "../../utils/env.js";

// Basic IndexedDB wrapper for Web Autosave
function getDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("VerbatimUI", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("autosaves")) {
        db.createObjectStore("autosaves");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class StorageAdapter {
  // -------------------------
  // Project Files (.vprj)
  // -------------------------

  static async openProject() {
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const { readTextFile } = await import("@tauri-apps/plugin-fs");
        const path = await open({
          filters: [{ name: "Verbatim Project", extensions: ["vprj"] }],
          multiple: false,
        });
        if (path) {
          const content = await readTextFile(path);
          return { path, handle: null, data: JSON.parse(content) };
        }
      } catch (err) {
        console.error("Tauri open project error:", err);
      }
      return null;
    }

    // Web Fallback: File System Access API
    if (window.showOpenFilePicker) {
      try {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{ description: "Verbatim Project", accept: { "application/json": [".vprj"] } }],
        });
        const file = await fileHandle.getFile();
        const text = await file.text();
        return { path: file.name, handle: fileHandle, data: JSON.parse(text) };
      } catch (err) {
        console.error("Web open project error:", err);
        return null;
      }
    }

    // Standard fallback (non-chromium)
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".vprj";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const text = await file.text();
          resolve({ path: file.name, handle: null, data: JSON.parse(text) });
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }

  static async saveProject(path, handle, data, saveAs = false) {
    const content = JSON.stringify(data, null, 2);

    if (isTauri()) {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        
        let savePath = path;
        if (!savePath || saveAs) {
          savePath = await save({
            filters: [{ name: "Verbatim Project", extensions: ["vprj"] }],
            defaultPath: "Untitled.vprj",
          });
        }
        
        if (savePath) {
          if (!savePath.endsWith(".vprj")) {
            savePath += ".vprj";
          }
          await writeTextFile(savePath, content);
          return { path: savePath, handle: null };
        }
      } catch (err) {
        console.error("Tauri save project error:", err);
      }
      return null;
    }

    // Web Fallback: File System Access API
    if (window.showSaveFilePicker) {
      try {
        let fileHandle = handle;
        if (!fileHandle || saveAs) {
          fileHandle = await window.showSaveFilePicker({
            suggestedName: path || "Untitled.vprj",
            types: [{ description: "Verbatim Project", accept: { "application/json": [".vprj"] } }],
          });
        }
        
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        return { path: fileHandle.name, handle: fileHandle };
      } catch (err) {
        console.error("Web save project error:", err);
        return null;
      }
    }

    // Standard fallback (download)
    const blob = new Blob([content], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", path || "Untitled.vprj");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { path: path || "Untitled.vprj", handle: null };
  }

  // -------------------------
  // Autosave
  // -------------------------

  static async saveAutosave(data) {
    const content = JSON.stringify(data);
    if (isTauri()) {
      try {
        const { writeTextFile, BaseDirectory, mkdir } = await import("@tauri-apps/plugin-fs");
        // Ensure directory exists
        try { await mkdir("autosaves", { baseDir: BaseDirectory.AppData, recursive: true }); } catch (e) {}
        await writeTextFile("autosaves/latest.vprj.tmp", content, { baseDir: BaseDirectory.AppData });
      } catch (err) {
        console.error("Tauri autosave error:", err);
      }
      return;
    }

    // Web IDB
    try {
      const db = await getDb();
      const tx = db.transaction("autosaves", "readwrite");
      tx.objectStore("autosaves").put(content, "latest");
    } catch (err) {
      console.error("Web autosave error:", err);
    }
  }

  static async getAutosave() {
    if (isTauri()) {
      try {
        const { readTextFile, exists, BaseDirectory } = await import("@tauri-apps/plugin-fs");
        const hasAutosave = await exists("autosaves/latest.vprj.tmp", { baseDir: BaseDirectory.AppData });
        if (hasAutosave) {
          const content = await readTextFile("autosaves/latest.vprj.tmp", { baseDir: BaseDirectory.AppData });
          return JSON.parse(content);
        }
      } catch (err) {}
      return null;
    }

    // Web IDB
    try {
      const db = await getDb();
      return new Promise((resolve) => {
        const tx = db.transaction("autosaves", "readonly");
        const req = tx.objectStore("autosaves").get("latest");
        req.onsuccess = () => resolve(req.result ? JSON.parse(req.result) : null);
        req.onerror = () => resolve(null);
      });
    } catch (err) {
      return null;
    }
  }

  static async clearAutosave() {
    if (isTauri()) {
      try {
        const { remove, exists, BaseDirectory } = await import("@tauri-apps/plugin-fs");
        const hasAutosave = await exists("autosaves/latest.vprj.tmp", { baseDir: BaseDirectory.AppData });
        if (hasAutosave) {
          await remove("autosaves/latest.vprj.tmp", { baseDir: BaseDirectory.AppData });
        }
      } catch (err) {}
      return;
    }

    try {
      const db = await getDb();
      const tx = db.transaction("autosaves", "readwrite");
      tx.objectStore("autosaves").delete("latest");
    } catch (err) {}
  }

  // -------------------------
  // Imports / Exports
  // -------------------------

  static async openCsv() {
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        return await open({
          filters: [{ name: "CSV Data", extensions: ["csv"] }],
          multiple: false,
        });
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  static async readTextFile(path) {
    if (isTauri()) {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      return await readTextFile(path);
    }
    throw new Error("readTextFile is only available in Tauri");
  }

  static async exportTextFile(content, filename, mimeType = "text/plain") {
    if (isTauri()) {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        
        const savePath = await save({
          filters: [{ name: "Exported File", extensions: [filename.split(".").pop()] }],
          defaultPath: filename,
        });
        
        if (savePath) {
          await writeTextFile(savePath, content);
          return savePath;
        }
        return null;
      } catch (err) {
        console.error("Tauri export error:", err);
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
        return await open({
          filters: [{ name: "Audio Files", extensions: ["mp3", "wav", "ogg", "m4a", "flac"] }],
          multiple: false,
        });
      } catch (err) {
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
