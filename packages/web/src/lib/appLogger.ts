type RemoteLogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

function writeRemote(
  level: RemoteLogLevel,
  source: string,
  message: string,
  details?: unknown,
  location?: string
): void {
  window.api?.app?.writeLog?.(level, source, message, details, location);
}

export function installRendererLogging(): void {
  window.addEventListener("error", (event) => {
    writeRemote(
      "ERROR",
      "renderer",
      event.message || "Uncaught error",
      event.error ?? { filename: event.filename, lineno: event.lineno, colno: event.colno },
      event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    writeRemote("ERROR", "renderer", "Unhandled promise rejection", event.reason);
  });

  writeRemote("INFO", "renderer", "Renderer started");
}

export const appLogger = {
  debug: (source: string, message: string, details?: unknown) =>
    writeRemote("DEBUG", source, message, details),
  info: (source: string, message: string, details?: unknown) =>
    writeRemote("INFO", source, message, details),
  warn: (source: string, message: string, details?: unknown) =>
    writeRemote("WARN", source, message, details),
  error: (source: string, message: string, details?: unknown, location?: string) =>
    writeRemote("ERROR", source, message, details, location),
};
