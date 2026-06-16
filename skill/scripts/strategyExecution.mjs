function logFailure(result, logDecision) {
  logDecision(`Strategy ${result.strategy} failed: ${result.reason || result.status}`);
  if (result.nextStrategy) {
    logDecision(`Suggested next strategy: ${result.nextStrategy}`);
  }
}

export async function runStrategyPlan({
  plan,
  logDecision,
  executeStatic,
  executeBrowser,
  executeCdp
}) {
  if (plan.terminalResult) return plan.terminalResult;

  let lastResult;
  for (const attempt of plan.attempts) {
    logDecision(`Selected strategy: ${attempt.strategy} (${attempt.reason})`);

    if (attempt.strategy === "static") {
      lastResult = await executeStatic();
    } else if (attempt.strategy === "browser") {
      lastResult = await executeBrowser();
    } else if (attempt.strategy === "cdp") {
      lastResult = await executeCdp();
    } else {
      lastResult = {
        status: `${attempt.strategy}_unavailable`,
        strategy: attempt.strategy,
        reason: `No executor is registered for strategy ${attempt.strategy}.`
      };
    }

    if (lastResult?.status === "ok") return lastResult;
    if (plan.requestedStrategy !== "auto") return lastResult;

    logFailure(lastResult, logDecision);

    const nextAttempt = plan.attempts.find((candidate) => candidate.strategy === lastResult.nextStrategy);
    if (!nextAttempt) return lastResult;
  }

  return lastResult || {
    status: "strategy_unavailable",
    reason: "No extraction strategy was available."
  };
}
