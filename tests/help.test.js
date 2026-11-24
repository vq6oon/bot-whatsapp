import test from "node:test";
import assert from "node:assert/strict";
import * as help from "../handler/help.js";

function capture() {
  const messages = [];
  return { messages, sendText: async (text) => messages.push(text) };
}

test(".help lists every command", async () => {
  const output = capture();
  await help.run({ text: ".help", sendText: output.sendText });
  const text = output.messages[0];
  for (const command of [
    ".menu", ".checkdrive", ".list", ".upload", ".yt", ".ytm", ".anidl",
    ".getani", ".tiktok", ".tts", ".scan", ".hitung", ".shorturl",
    ".deviceinfo", ".morse", ".encode64", ".biner", ".tebakhewan", ".sticker",
  ]) {
    assert.ok(text.includes(command), `missing ${command}`);
  }
});

test(".help <command> resolves aliases to one owner", async () => {
  const output = capture();
  await help.run({ text: ".help decode64", sendText: output.sendText });
  assert.match(output.messages[0], /\.encode64/);

  const output2 = capture();
  await help.run({ text: ".help s", sendText: output2.sendText });
  assert.match(output2.messages[0], /\.sticker/);
});

test("help covers anidl --quality with the format-list behavior", async () => {
  const output = capture();
  await help.run({ text: ".help anidl", sendText: output.sendText });
  const text = output.messages[0];
  assert.match(text, /--quality/);
  assert.match(text, /Available qualities/);
});

test("<command> --help replies instead of running the command", async () => {
  assert.ok(help.match({ text: ".yt --help" }));
  assert.ok(help.match({ text: ".anidl -h" }));
  assert.ok(help.match({ text: ".help yt" }));
  assert.equal(help.match({ text: ".yt https://youtu.be/abc123" }), false);

  const output = capture();
  await help.run({ text: ".yt --help", sendText: output.sendText });
  assert.match(output.messages[0], /\.yt <url>/);
});

test("every HELP entry has format and about", () => {
  for (const [key, entry] of Object.entries(help.HELP)) {
    assert.ok(entry.format, `${key} missing format`);
    assert.ok(entry.about, `${key} missing about`);
  }
});
