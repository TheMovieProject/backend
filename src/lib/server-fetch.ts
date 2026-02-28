type FetchWithTimeoutInit = RequestInit & {
  timeoutMs?: number;
};

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit = {}
) {
  const { timeoutMs = 8000, ...requestInit } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...requestInit,
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      throw new Error(`Upstream request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
