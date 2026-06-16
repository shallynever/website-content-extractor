const VALID_STRATEGIES = ["auto", "static", "browser", "cdp"];

const STRATEGY_LABELS = {
  static: "static extraction",
  browser: "persistent Chrome profile strategy",
  cdp: "existing Chrome CDP strategy"
};

function fallbackFor(siteProfile) {
  return siteProfile.strategies.includes("browser") ? "browser" : "";
}

function unavailableResult(strategy, siteProfile) {
  const nextStrategy = fallbackFor(siteProfile);
  return {
    status: `${strategy}_unavailable`,
    strategy,
    ...(nextStrategy ? { nextStrategy } : {}),
    reason: `${siteProfile.displayName} does not support ${STRATEGY_LABELS[strategy] || strategy}.`
  };
}

export function parseStrategy(value = "auto") {
  const strategy = value || "auto";
  if (!VALID_STRATEGIES.includes(strategy)) {
    throw new Error(`--strategy must be one of ${VALID_STRATEGIES.join(", ")}.`);
  }
  return strategy;
}

export function buildStrategyPlan({ requestedStrategy = "auto", siteProfile, cdpUrl = "" }) {
  if (requestedStrategy === "auto") {
    const attempts = siteProfile.strategyPriority.map((strategy, index) => ({
      strategy,
      reason: index === 0
        ? `${siteProfile.displayName} supports ${STRATEGY_LABELS[strategy]} as its lightest available strategy.`
        : "Fallback to persistent Chrome profile if lighter extraction cannot read the page."
    }));
    return { requestedStrategy, attempts };
  }

  if (!siteProfile.strategies.includes(requestedStrategy)) {
    return {
      requestedStrategy,
      attempts: [],
      terminalResult: unavailableResult(requestedStrategy, siteProfile)
    };
  }

  if (requestedStrategy === "cdp" && !cdpUrl) {
    throw new Error("--strategy cdp requires --cdp-url.");
  }

  return {
    requestedStrategy,
    attempts: [
      {
        strategy: requestedStrategy,
        reason: `User requested the ${STRATEGY_LABELS[requestedStrategy]}.`
      }
    ]
  };
}
