import assert from "node:assert/strict";
import { test } from "node:test";
import { runStrategyPlan } from "./strategyExecution.mjs";

const plan = {
  requestedStrategy: "auto",
  attempts: [
    { strategy: "static", reason: "lightest" },
    { strategy: "browser", reason: "fallback" }
  ]
};

test("returns static result without calling browser when static succeeds", async () => {
  const calls = [];
  const result = await runStrategyPlan({
    plan,
    logDecision: (line) => calls.push(line),
    executeStatic: async () => ({ status: "ok", strategy: "static" }),
    executeBrowser: async () => {
      throw new Error("browser should not be called");
    }
  });

  assert.deepEqual(result, { status: "ok", strategy: "static" });
  assert.deepEqual(calls, [
    "Selected strategy: static (lightest)"
  ]);
});

test("auto falls back to browser when static recommends browser", async () => {
  const calls = [];
  const result = await runStrategyPlan({
    plan,
    logDecision: (line) => calls.push(line),
    executeStatic: async () => ({
      status: "needs_browser_rendering",
      strategy: "static",
      nextStrategy: "browser",
      reason: "Static HTML did not contain repository entries."
    }),
    executeBrowser: async () => ({ status: "ok", strategy: "browser" })
  });

  assert.deepEqual(result, { status: "ok", strategy: "browser" });
  assert.deepEqual(calls, [
    "Selected strategy: static (lightest)",
    "Strategy static failed: Static HTML did not contain repository entries.",
    "Suggested next strategy: browser",
    "Selected strategy: browser (fallback)"
  ]);
});

test("explicit static does not fall back to browser", async () => {
  const result = await runStrategyPlan({
    plan: {
      requestedStrategy: "static",
      attempts: [{ strategy: "static", reason: "user requested static" }]
    },
    logDecision: () => {},
    executeStatic: async () => ({
      status: "needs_browser_rendering",
      strategy: "static",
      nextStrategy: "browser",
      reason: "Static HTML did not contain repository entries."
    }),
    executeBrowser: async () => {
      throw new Error("browser should not be called");
    }
  });

  assert.equal(result.status, "needs_browser_rendering");
  assert.equal(result.nextStrategy, "browser");
});
