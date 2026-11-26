import test from "node:test";
import assert from "node:assert/strict";
import * as help from "../handler/help.js";
import * as menu from "../handler/menu.js";

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

test(".help lists every command in the same sections as the menu", async () => {
  const output = capture();
  await help.run({ text: ".help", sendText: output.sendText });
  const text = output.messages[0];
  assert.ok(text.startsWith("Kamui-Bot · v3.0.0\n\n"));
  assert.match(text, /Type `\.help <command>` for usage and flags\./);
  for (const section of ["Info", "Download", "Drive", "Search", "Tools"]) {
    assert.ok(text.includes(`› ${section}`), `missing section ${section}`);
  }
  for (const command of [
    ".help [command]", ".info", ".rules", ".checkdrive", ".list [type]",
    ".upload [name]", ".yt <url>", ".ytm <url>", ".anime <title>",
    ".anime <title> --info", ".tiktok <url>", ".tts <text>", ".scan <url>",
    ".hitung <expression>", ".shorturl <url>", ".morse", ".encode64",
    ".biner", ".sticker",
  ]) {
    assert.ok(text.includes(command), `missing ${command}`);
  }
  assert.doesNotMatch(text, /\.tebak/);
  assert.doesNotMatch(text, /\.deviceinfo/);
});

test("the menu and .help share one catalog", async () => {
  const menuOutput = capture();
  await menu.run({
    sock: { sendMessage: async (_from, message) => { menuOutput.messages.push(message); } },
    from: "chat@s.whatsapp.net",
  });
  const caption = menuOutput.messages[0].caption;

  const helpOutput = capture();
  await help.run({ text: ".help", sendText: helpOutput.sendText });
  const helpTextOutput = helpOutput.messages[0];

  for (const line of help.catalogLines()) {
    assert.ok(caption.includes(line), `menu missing: ${line}`);
    assert.ok(helpTextOutput.includes(line), `.help missing: ${line}`);
  }
  for (const section of help.SECTIONS) {
    for (const row of section.rows) {
      assert.ok(help.HELP[row.help], `${row.short} points at a missing help entry`);
    }
  }
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

test("help covers anime --quality with the format-list behavior", async () => {
  const output = capture();
  await help.run({ text: ".help anime", sendText: output.sendText });
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
  assert.ok(help.match({ text: ".anime -h" }));
  assert.ok(help.match({ text: ".help yt" }));
  assert.equal(help.match({ text: ".yt https://youtu.be/abc123" }), false);

  const output = capture();
  await help.run({ text: ".yt --help", sendText: output.sendText });
  assert.match(output.messages[0], /^\.yt <url> \[--<360\|480\|720\|1080\|best>\] · Download a YouTube video to Google Drive/);
});

test("help text uses no emoji", async () => {
  const output = capture();
  await help.run({ text: ".help", sendText: output.sendText });
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
  assert.doesNotMatch(output.messages[0], emoji);

  const animeHelp = capture();
  await help.run({ text: ".help anime", sendText: animeHelp.sendText });
  assert.doesNotMatch(animeHelp.messages[0], emoji);
});

test("every HELP entry has format, description, and menu-style heading", () => {
  for (const [key, entry] of Object.entries(help.HELP)) {
    assert.ok(entry.format, `${key} missing format`);
    assert.ok(entry.about, `${key} missing about`);
    assert.equal(help.helpText(key).split("\n", 1)[0], `${entry.format} · ${entry.about}`);
  }
});