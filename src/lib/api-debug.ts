const DEBUG_API_TIMING = process.env.DEBUG_API_TIMING === "1";

export function createRouteLogger(scope: string) {
  const requestId = `${scope}#${Math.random().toString(36).slice(2, 8)}`;

  return {
    enabled: DEBUG_API_TIMING,
    start(label: string) {
      const timerLabel = `${requestId}:${label}`;
      if (DEBUG_API_TIMING) console.time(timerLabel);
      return timerLabel;
    },
    end(timerLabel: string) {
      if (DEBUG_API_TIMING) console.timeEnd(timerLabel);
    },
    log(message: string, details?: unknown) {
      if (!DEBUG_API_TIMING) return;
      if (details === undefined) {
        console.log(requestId, message);
        return;
      }
      console.log(requestId, message, details);
    },
  };
}
