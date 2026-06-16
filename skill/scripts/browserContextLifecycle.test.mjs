import assert from "node:assert/strict";
import { test } from "node:test";
import { closeContextOnError } from "./browserContextLifecycle.mjs";

test("closes browser context when browser extraction throws", async () => {
  const calls = [];
  const context = {
    close: async () => calls.push("close")
  };

  await assert.rejects(
    closeContextOnError(context, async () => {
      throw new Error("navigation failed");
    }),
    /navigation failed/
  );

  assert.deepEqual(calls, ["close"]);
});

test("does not close browser context when browser extraction returns normally", async () => {
  const calls = [];
  const context = {
    close: async () => calls.push("close")
  };

  const result = await closeContextOnError(context, async () => ({ status: "needs_verification" }));

  assert.deepEqual(result, { status: "needs_verification" });
  assert.deepEqual(calls, []);
});
