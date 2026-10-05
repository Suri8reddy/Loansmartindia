import { isRequestCancellation } from "./request-errors";

// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => {
    const error = (event as ErrorEvent).error ?? event;
    if (isRequestCancellation(error)) {
      record(error);
      event.preventDefault();
      return;
    }
    record(error);
  });
  globalThis.addEventListener("unhandledrejection", (event) => {
    const error = (event as PromiseRejectionEvent).reason;
    if (isRequestCancellation(error)) {
      record(error);
      event.preventDefault();
      return;
    }
    record(error);
  });
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}
