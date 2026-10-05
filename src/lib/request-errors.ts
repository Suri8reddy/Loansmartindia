type ErrorWithCause = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  cause?: unknown;
};

export function isRequestCancellation(error: unknown): boolean {
  let current = error;
  const seen = new Set<unknown>();

  while (current != null && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const candidate = current as ErrorWithCause;
    const name = typeof candidate.name === "string" ? candidate.name.toLowerCase() : "";
    const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
    const code = typeof candidate.code === "string" ? candidate.code.toUpperCase() : "";

    if (
      name === "aborterror" ||
      code === "ECONNRESET" ||
      message === "aborted" ||
      message.includes("request aborted") ||
      message.includes("the operation was aborted")
    ) {
      return true;
    }

    current = candidate.cause;
  }

  return false;
}