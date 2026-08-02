let lastCapturedError: Error | null = null;

if (typeof process !== "undefined") {
  process.on("uncaughtException", (error) => {
    lastCapturedError = error instanceof Error ? error : new Error(String(error));
  });

  process.on("unhandledRejection", (reason) => {
    lastCapturedError = reason instanceof Error ? reason : new Error(String(reason));
  });
}

export function consumeLastCapturedError(): Error | null {
  const error = lastCapturedError;
  lastCapturedError = null;
  return error;
}
