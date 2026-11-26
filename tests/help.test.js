import test from "node:test";
import assert from "node:assert/strict";
import * as help from "../handler/help.js";

function capture() {
  const messages = [];
  return { messages, sendText: async (text) => messages.push(text) };
}

test(".help yt uses menu-style command heading and concise details", async () => {
  const output = capture();

  await help.run({ text: ".help yt", sendText: output.sendText });

  assert.match(output.messages[0], /^\.yt <url> \[--<360\|480\|720\|1080\|best>\] · Download a YouTube video to Google Drive\n\n/);
  assert.match(output.messages[0], /Example: \.yt https:\/\/youtu\.be\/abc123 --720/);
  assert.match(output.messages[0], /Without a flag, the bot selects the best available quality\./);
  assert.match(output.messages[0], /Accepted URLs: youtube\.com or youtu\.be\./);
  assert.equal((output.messages[0].match(/\.yt <url>/g) || []).length, 1);
});

test(".help list uses menu-style command heading", async () => {
  const output = capture();

  await help.run({ text: ".help list", sendText: output.sendText });

  assert.equal(output.messages[0], ".list [audio|video|document|photo] · List Drive files with an optional type filter");
});

test(".help lists every command", async () => {
  const output = capture();
  await help.run({ text: ".help", sendText: output.sendText });
  const text = output.messages[0];
  assert.ok(text.startsWith("Commands for Kamui-Bot\n\n"));
  assert.match(text, /\.menu · Show the command menu/);
  assert.match(text, /Type `\.help <command>` for more details\./);
  for (const command of [
    ".menu", ".checkdrive", ".list", ".upload", ".yt", ".ytm", ".anidl",
    ".getani", ".tiktok", ".tts", ".scan", ".hitung", ".shorturl",
    ".morse", ".encode64", ".biner", ".sticker",
  ]) {
    assert.ok(text.includes(command), `missing ${command}`);
  }
  assert.ok(!text.includes(".tebakhewan"));
  assert.ok(!text.includes(".tebak"));
  assert.ok(!text.includes(".deviceinfo"));
});

test(".help <command> resolves aliases to one owner", async () => {
  const output = capture();
  await help.run({ text: ".help decode64", sendText: output.sendText });
  assert.ok(output.messages[0].startsWith(".encode64 <text> / .decode64 <code> ·"));

  const output2 = capture();
  await help.run({ text: ".help s", sendText: output2.sendText });
  assert.ok(output2.messages[0].startsWith(".sticker / .s ·"));
});

test(".help tebak no longer exposes removed guessing game", async () => {
  const output = capture();

  await help.run({ text: ".help tebak", sendText: output.sendText });

  assert.match(output.messages[0], /No help/);
});

test(".help deviceinfo no longer exposes removed command", async () => {
  const output = capture();

  await help.run({ text: ".help deviceinfo", sendText: output.sendText });

  assert.match(output.messages[0], /No help/);
});

test("help covers anidl --quality with the format-list behavior", async () => {
  const output = capture();
  await help.run({ text: ".help anidl", sendText: output.sendText });
  const text = output.messages[0];
  assert.match(text, /--quality/);
  assert.match(text, /--format-list/);
  assert.match(text, /--search/);
  assert.match(text, /-e <episode>/);
  assert.match(text, /-q <quality>/);
  assert.match(text, /one piece/);
  assert.match(text, /If a quality is unavailable/);
  assert.match(text, /Always quote anime titles/);
});

test("<command> --help replies instead of running the command", async () => {
  assert.ok(help.match({ text: ".yt --help" }));
  assert.ok(help.match({ text: ".anidl -h" }));
  assert.ok(help.match({ text: ".help yt" }));
  assert.equal(help.match({ text: ".yt https://youtu.be/abc123" }), false);

  const output = capture();
  await help.run({ text: ".yt --help", sendText: output.sendText });
  assert.match(output.messages[0], /^\.yt <url> \[--<360\|480\|720\|1080\|best>\] · Download a YouTube video to Google Drive/);
});

test("every HELP entry has format, description, and menu-style heading", () => {
  for (const [key, entry] of Object.entries(help.HELP)) {
    assert.ok(entry.format, `${key} missing format`);
    assert.ok(entry.about, `${key} missing about`);
    assert.equal(help.helpText(key).split("\n", 1)[0], `${entry.format} · ${entry.about}`);
  }
});
