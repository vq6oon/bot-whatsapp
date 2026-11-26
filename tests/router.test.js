import test from "node:test";
import assert from "node:assert/strict";
import { dispatch } from "../src/router.js";

function capture() {
  const messages = [];
  return { messages, sendText: async (text) => messages.push(text) };
}

test("unknown text points users to .menu", async () => {
  const output = capture();

  const result = await dispatch({ text: "hello bot", sendText: output.sendText });

  assert.equal(result, null);
  assert.deepEqual(output.messages, ["Perintah tidak dikenal. Buka .menu untuk melihat menu."]);
});

test("removed guessing command falls back to unknown-command reply", async () => {
  const output = capture();

  const result = await dispatch({ text: ".tebak cat", sendText: output.sendText });

  assert.equal(result, null);
  assert.deepEqual(output.messages, ["Perintah tidak dikenal. Buka .menu untuk melihat menu."]);
});

test("empty messages do not trigger the unknown-command reply", async () => {
  const output = capture();

  await dispatch({ text: "   ", sendText: output.sendText });

  assert.deepEqual(output.messages, []);
});
