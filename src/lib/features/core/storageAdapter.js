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
  /** @type {any} */
  static logger = null;

  static log(level, method, msg) {
    if (StorageAdapter.logger) {
      StorageAdapter.logger.log(level, "StorageAdapter", `${method}: ${msg}`);
    } else {
      console.log(`[StorageAdapter] ${method}: ${msg}`);
    }
  }

  // -------------------------
  // Project Files (.vprj)
  // -------------------------

  static async openProject() {
    this.log("DEBUG", "openProject", "Attempting to open project dialog");
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const { readTextFile } = await import("@tauri-apps/plugin-fs");
        const path = await open({
          filters: [{ name: "Verbatim Project", extensions: ["vprj"] }],
          multiple: false,
        });
        if (path) {
          this.log("INFO", "openProject", `Tauri selected path: ${path}`);
          const content = await readTextFile(path);
          this.log("DEBUG", "openProject", `Successfully read text file from ${path}`);
          return { path, handle: null, data: JSON.parse(content) };
        } else {
          this.log("INFO", "openProject", "Tauri open project canceled");
        }
      } catch (err) {
        this.log("ERROR", "openProject", `Tauri open project error: ${err.message || err}`);
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
        this.log("INFO", "openProject", `Web File System Access opened: ${file.name}`);
        return { path: file.name, handle: fileHandle, data: JSON.parse(text) };
      } catch (err) {
        this.log("ERROR", "openProject", `Web File System Access open project error: ${err.message || err}`);
        return null;
      }
    }

    // Standard fallback (non-chromium)
    this.log("DEBUG", "openProject", "Using standard file input web fallback");
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".vprj";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          const text = await file.text();
          this.log("INFO", "openProject", `Standard web fallback opened file: ${file.name}`);
          resolve({ path: file.name, handle: null, data: JSON.parse(text) });
        } else {
          this.log("INFO", "openProject", "Standard web fallback open canceled");
          resolve(null);
        }
      };
      input.click();
    });
  }

  static async saveProject(path, handle, data, saveAs = false) {
    this.log("DEBUG", "saveProject", `Attempting to save project. Path: ${path}, hasHandle: ${!!handle}, saveAs: ${saveAs}`);
    const content = JSON.stringify(data, null, 2);

    if (isTauri()) {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        
        let savePath = path;
        if (!savePath || saveAs) {
          this.log("DEBUG", "saveProject", "Opening Tauri save dialog");
          savePath = await save({
            filters: [{ name: "Verbatim Project", extensions: ["vprj"] }],
            defaultPath: "Untitled.vprj",
          });
        }
        
        if (savePath) {
          if (!savePath.endsWith(".vprj")) {
            savePath += ".vprj";
          }
          this.log("INFO", "saveProject", `Tauri writing to path: ${savePath}`);
          await writeTextFile(savePath, content);
          this.log("INFO", "saveProject", "Tauri file write success");
          return { path: savePath, handle: null };
        } else {
          this.log("INFO", "saveProject", "Tauri save project canceled");
        }
      } catch (err) {
        this.log("ERROR", "saveProject", `Tauri save project error: ${err.message || err}`);
      }
      return null;
    }

    // Web Fallback: File System Access API
    if (window.showSaveFilePicker) {
      try {
        let fileHandle = handle;
        if (!fileHandle || saveAs) {
          this.log("DEBUG", "saveProject", "Opening Web save file picker");
          fileHandle = await window.showSaveFilePicker({
            suggestedName: path || "Untitled.vprj",
            types: [{ description: "Verbatim Project", accept: { "application/json": [".vprj"] } }],
          });
        }
        
        this.log("INFO", "saveProject", `Web saving to handle: ${fileHandle.name}`);
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        this.log("INFO", "saveProject", "Web File System Access save success");
        return { path: fileHandle.name, handle: fileHandle };
      } catch (err) {
        this.log("ERROR", "saveProject", `Web File System Access save project error: ${err.message || err}`);
        return null;
      }
    }

    // Standard fallback (download)
    this.log("DEBUG", "saveProject", "Using standard web download fallback");
    const blob = new Blob([content], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", path || "Untitled.vprj");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.log("INFO", "saveProject", "Standard web fallback download triggered");
    return { path: path || "Untitled.vprj", handle: null };
  }

  // -------------------------
  // Autosave
  // -------------------------

  static async saveAutosave(data) {
    this.log("DEBUG", "saveAutosave", "Triggering autosave");
    const content = JSON.stringify(data);
    if (isTauri()) {
      try {
        const { writeTextFile, BaseDirectory, mkdir } = await import("@tauri-apps/plugin-fs");
        // Ensure directory exists
        try { 
          await mkdir("autosaves", { baseDir: BaseDirectory.AppData, recursive: true }); 
        } catch (e) {
          // ignore directory exists error
        }
        this.log("DEBUG", "saveAutosave", "Tauri writing autosave to AppData/autosaves/latest.vprj.tmp");
        await writeTextFile("autosaves/latest.vprj.tmp", content, { baseDir: BaseDirectory.AppData });
        this.log("DEBUG", "saveAutosave", "Tauri autosave success");
      } catch (err) {
        this.log("ERROR", "saveAutosave", `Tauri autosave error: ${err.message || err}`);
      }
      return;
    }

    // Web IDB
    try {
      this.log("DEBUG", "saveAutosave", "Web writing autosave to IndexedDB");
      const db = await getDb();
      const tx = db.transaction("autosaves", "readwrite");
      tx.objectStore("autosaves").put(content, "latest");
      this.log("DEBUG", "saveAutosave", "Web IndexedDB autosave success");
    } catch (err) {
      this.log("ERROR", "saveAutosave", `Web IndexedDB autosave error: ${err.message || err}`);
    }
  }

  static async getAutosave() {
    this.log("DEBUG", "getAutosave", "Checking for autosave");
    if (isTauri()) {
      try {
        const { readTextFile, exists, BaseDirectory } = await import("@tauri-apps/plugin-fs");
        const hasAutosave = await exists("autosaves/latest.vprj.tmp", { baseDir: BaseDirectory.AppData });
        this.log("DEBUG", "getAutosave", `Tauri hasAutosave file check: ${hasAutosave}`);
        if (hasAutosave) {
          const content = await readTextFile("autosaves/latest.vprj.tmp", { baseDir: BaseDirectory.AppData });
          this.log("INFO", "getAutosave", "Tauri retrieved autosave");
          return JSON.parse(content);
        }
      } catch (err) {
        this.log("ERROR", "getAutosave", `Tauri getAutosave error: ${err.message || err}`);
      }
      return null;
    }

    // Web IDB
    try {
      this.log("DEBUG", "getAutosave", "Web checking IndexedDB for autosave");
      const db = await getDb();
      return new Promise((resolve) => {
        const tx = db.transaction("autosaves", "readonly");
        const req = tx.objectStore("autosaves").get("latest");
        req.onsuccess = () => {
          if (req.result) {
            this.log("INFO", "getAutosave", "Web IndexedDB retrieved autosave");
            resolve(JSON.parse(req.result));
          } else {
            this.log("DEBUG", "getAutosave", "Web IndexedDB has no autosave");
            resolve(null);
          }
        };
        req.onerror = () => {
          this.log("ERROR", "getAutosave", `Web IndexedDB read error: ${req.error}`);
          resolve(null);
        };
      });
    } catch (err) {
      this.log("ERROR", "getAutosave", `Web getAutosave error: ${err.message || err}`);
      return null;
    }
  }

  static async clearAutosave() {
    this.log("DEBUG", "clearAutosave", "Clearing autosave");
    if (isTauri()) {
      try {
        const { remove, exists, BaseDirectory } = await import("@tauri-apps/plugin-fs");
        const hasAutosave = await exists("autosaves/latest.vprj.tmp", { baseDir: BaseDirectory.AppData });
        if (hasAutosave) {
          await remove("autosaves/latest.vprj.tmp", { baseDir: BaseDirectory.AppData });
          this.log("DEBUG", "clearAutosave", "Tauri cleared autosave file");
        }
      } catch (err) {
        this.log("ERROR", "clearAutosave", `Tauri clearAutosave error: ${err.message || err}`);
      }
      return;
    }

    try {
      const db = await getDb();
      const tx = db.transaction("autosaves", "readwrite");
      tx.objectStore("autosaves").delete("latest");
      this.log("DEBUG", "clearAutosave", "Web IndexedDB cleared autosave");
    } catch (err) {
      this.log("ERROR", "clearAutosave", `Web clearAutosave error: ${err.message || err}`);
    }
  }

  // -------------------------
  // Imports / Exports
  // -------------------------

  static async openCsv() {
    this.log("DEBUG", "openCsv", "Opening openCsv dialog");
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const path = await open({
          filters: [{ name: "CSV Data", extensions: ["csv"] }],
          multiple: false,
        });
        this.log("INFO", "openCsv", `Tauri openCsv path selected: ${path}`);
        return path;
      } catch (err) {
        this.log("ERROR", "openCsv", `Tauri openCsv error: ${err.message || err}`);
        return null;
      }
    }
    return null;
  }

  static async readTextFile(path) {
    this.log("DEBUG", "readTextFile", `Reading file: ${path}`);
    if (isTauri()) {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      return await readTextFile(path);
    }
    throw new Error("readTextFile is only available in Tauri");
  }

  static async exportTextFile(content, filename, mimeType = "text/plain") {
    this.log("DEBUG", "exportTextFile", `Exporting file ${filename} with mime ${mimeType}`);
    if (isTauri()) {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        
        const savePath = await save({
          filters: [{ name: "Exported File", extensions: [filename.split(".").pop()] }],
          defaultPath: filename,
        });
        
        if (savePath) {
          this.log("INFO", "exportTextFile", `Tauri writing export to: ${savePath}`);
          await writeTextFile(savePath, content);
          this.log("INFO", "exportTextFile", "Tauri export success");
          return savePath;
        } else {
          this.log("INFO", "exportTextFile", "Tauri export canceled");
        }
        return null;
      } catch (err) {
        this.log("ERROR", "exportTextFile", `Tauri export error: ${err.message || err}`);
        return null;
      }
    }

    // Web browser fallback
    this.log("DEBUG", "exportTextFile", "Using standard web download fallback for export");
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.log("INFO", "exportTextFile", "Standard web export download triggered");
    return null; 
  }

  static async openAudio() {
    this.log("DEBUG", "openAudio", "Opening openAudio dialog");
    if (isTauri()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const path = await open({
          filters: [{ name: "Audio Files", extensions: ["mp3", "wav", "ogg", "m4a", "flac"] }],
          multiple: false,
        });
        this.log("INFO", "openAudio", `Tauri openAudio selected path: ${path}`);
        return path;
      } catch (err) {
        this.log("ERROR", "openAudio", `Tauri openAudio error: ${err.message || err}`);
        return null;
      }
    }
    return null;
  }

  static async convertFileSrc(nativePath) {
    this.log("DEBUG", "convertFileSrc", `Converting native path: ${nativePath}`);
    if (isTauri()) {
      try {
        const { convertFileSrc } = await import("@tauri-apps/api/core");
        const url = convertFileSrc(nativePath);
        this.log("INFO", "convertFileSrc", `Converted URL: ${url}`);
        return url;
      } catch (err) {
        this.log("ERROR", "convertFileSrc", `Tauri convertFileSrc error: ${err.message || err}`);
        return nativePath;
      }
    }
    return nativePath;
  }
}
