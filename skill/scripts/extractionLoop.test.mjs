import assert from "node:assert/strict";
import { test } from "node:test";
import { pollUntilOk } from "./extractionLoop.mjs";

test("polls until extraction reports ok", async () => {
  const results = [
    { status: "needs_verification", reason: "WeChat is showing a verification page." },
    { status: "ok", title: "文章标题", content: "正文" }
  ];
  const attempts = [];
  let index = 0;
  let currentTime = 0;

  const result = await pollUntilOk({
    maxWaitMs: 10_000,
    pollMs: 3_000,
    now: () => currentTime,
    sleep: async (ms) => {
      currentTime += ms;
    },
    extract: async () => results[index++],
    onAttempt: ({ attempt, result: attemptResult }) => {
      attempts.push({ attempt, status: attemptResult.status });
    }
  });

  assert.deepEqual(result, { status: "ok", title: "文章标题", content: "正文" });
  assert.deepEqual(attempts, [
    { attempt: 1, status: "needs_verification" },
    { attempt: 2, status: "ok" }
  ]);
});

test("returns needs_verification_timeout when extraction never becomes ok", async () => {
  let currentTime = 0;

  const result = await pollUntilOk({
    maxWaitMs: 5_000,
    pollMs: 3_000,
    now: () => currentTime,
    sleep: async (ms) => {
      currentTime += ms;
    },
    extract: async () => ({
      status: "needs_verification",
      reason: "WeChat is showing a verification page.",
      title: "验证"
    })
  });

  assert.deepEqual(result, {
    status: "needs_verification_timeout",
    reason: "WeChat is showing a verification page.",
    title: "验证",
    elapsedMs: 5_000
  });
});
