export class Logger {
  logs = $state([]);

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("error", (e) => {
        this.error("GlobalError", e.message || String(e));
      });
      window.addEventListener("unhandledrejection", (e) => {
        const reason = e.reason;
        this.error("UnhandledRejection", reason?.message || String(reason));
      });
    }
  }

  log(level, source, message) {
    const entry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      source,
      message: typeof message === "object" ? JSON.stringify(message) : String(message)
    };
    // Svelte 5 state arrays are reactive when modified via push/shift
    this.logs.push(entry);
    if (this.logs.length > 500) {
      this.logs.shift();
    }
  }

  debug(source, message) { this.log("DEBUG", source, message); }
  info(source, message) { this.log("INFO", source, message); }
  warn(source, message) { this.log("WARN", source, message); }
  error(source, message) { this.log("ERROR", source, message); }

  clear() {
    this.logs = [];
  }
}
