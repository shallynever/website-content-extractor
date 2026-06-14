export async function pollUntilOk({
  extract,
  sleep,
  maxWaitMs,
  pollMs,
  onAttempt = () => {},
  now = () => Date.now()
}) {
  const startedAt = now();
  let lastResult;
  let attempt = 0;

  while (true) {
    attempt += 1;
    lastResult = await extract();
    onAttempt({ attempt, result: lastResult });

    if (lastResult?.status === "ok") {
      return lastResult;
    }

    const elapsedMs = now() - startedAt;
    if (elapsedMs >= maxWaitMs) {
      return {
        ...lastResult,
        status: "needs_verification_timeout",
        reason: lastResult?.reason || "Manual verification did not complete before the timeout.",
        elapsedMs
      };
    }

    await sleep(Math.min(pollMs, maxWaitMs - elapsedMs));
  }
}
