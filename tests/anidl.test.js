import test from "node:test";
import assert from "node:assert/strict";
import { DRIVE } from "../src/config.js";
import * as anidl from "../handler/anidl.js";
import * as getani from "../handler/getani.js";
import * as menu from "../handler/menu.js";
import { animeDownloadError, downloadAnimeEpisode } from "../src/services/anime.js";

function capture() {
  const messages = [];
  return {
    messages,
    sendText: async (text) => messages.push({ text }),
  };
}

function driveStub() {
  const uploaded = [];
  return {
    uploaded,
    drive: {
      authorize: async () => "auth",
      uploadToDrive: async (...args) => {
        uploaded.push(args);
        return { id: "anime-file-1", webViewLink: "https://drive.google.com/file/d/anime-file-1/view" };
      },
    },
  };
}

const episode = {
  title: "Naruto Episode 1",
  fileName: "Naruto Episode 1.mp4",
  mimeType: "video/mp4",
  size: 152 * 1024 * 1024,
  filePath: "/downloads/anidl/Naruto Episode 1.mp4",
};

test(".anidl defaults to episode 1 and best quality", () => {
  assert.deepEqual(anidl.parseArguments(".anidl naruto"), {
    title: "naruto",
    episode: 1,
    quality: "best",
  });
});

test(".anidl parses --ep and a --quality flag", () => {
  assert.deepEqual(anidl.parseArguments(".anidl one piece --ep 3 --720"), {
    title: "one piece",
    episode: 3,
    quality: "720",
  });
});

test(".anidl requires a title", () => {
  assert.ok(anidl.parseArguments(".anidl").error);
  assert.ok(anidl.parseArguments(".anidl --ep 2").error);
});

test(".anidl rejects a bare quality and a missing episode value", () => {
  assert.ok(anidl.parseArguments(".anidl naruto 720").error);
  assert.ok(anidl.parseArguments(".anidl naruto --ep").error);
  assert.ok(anidl.parseArguments(".anidl naruto --ep 0").error);
  assert.ok(anidl.parseArguments(".anidl naruto --999").error);
});

test(".anidl uploads the episode to Drive and cleans up the temporary file", async () => {
  const output = capture();
  const { uploaded, drive } = driveStub();
  const calls = [];
  const removed = [];

  await anidl.run(
    { text: ".anidl naruto --ep 2 --480", sendText: output.sendText },
    async (...args) => { calls.push(args); return episode; },
    async (path) => { removed.push(path); },
    drive,
  );

  assert.deepEqual(calls[0], ["naruto", { episode: 2, quality: "480" }]);
  assert.deepEqual(uploaded[0], ["auth", episode.filePath, episode.fileName, episode.mimeType]);
  assert.match(output.messages[0].text, /Naruto Episode 1 \(ep 2, 480p\)/);
  assert.match(output.messages[0].text, /anime-file-1/);
  assert.deepEqual(removed, [episode.filePath]);
});

test(".anidl reports a missing ani-cli install without calling Drive", async () => {
  const output = capture();
  const { uploaded, drive } = driveStub();

  await anidl.run(
    { text: ".anidl naruto", sendText: output.sendText },
    async () => { const error = new Error("spawn ani-cli ENOENT"); error.code = "ENOENT"; throw error; },
    async () => {},
    drive,
  );

  assert.equal(uploaded.length, 0);
  assert.match(output.messages[0].text, /ani-cli belum terpasang/);
});

test(".anidl refuses to download when no Drive folder is configured", async () => {
  const originalFolderId = DRIVE.folderId;
  DRIVE.folderId = "";
  const output = capture();
  let downloads = 0;
  try {
    await anidl.run(
      { text: ".anidl naruto", sendText: output.sendText },
      async () => { downloads += 1; return episode; },
    );
  } finally {
    DRIVE.folderId = originalFolderId;
  }

  assert.equal(downloads, 0);
  assert.match(output.messages[0].text, /belum dikonfigurasi/);
});

test(".anidl reports Drive upload failures", async () => {
  const output = capture();
  const removed = [];
  const drive = {
    authorize: async () => "auth",
    uploadToDrive: async () => { throw new Error("quota exceeded"); },
  };

  await anidl.run(
    { text: ".anidl naruto", sendText: output.sendText },
    async () => episode,
    async (path) => { removed.push(path); },
    drive,
  );

  assert.match(output.messages[0].text, /Gagal menyimpan episode/);
  assert.deepEqual(removed, [episode.filePath]);
});

test("downloadAnimeEpisode passes non-interactive flags and picks the newest fresh video", async () => {
  const calls = [];
  const media = await downloadAnimeEpisode(
    "naruto",
    { episode: 4, quality: "720" },
    {
      run: async (...args) => { calls.push(args); return { stdout: "", stderr: "" }; },
      now: () => 10_000,
      downloadDir: "/tmp/anidl-test",
      listFiles: async () => [
        { name: "Naruto Episode 4.mp4", mtimeMs: 9_500, isFile: () => true },
        { name: "Naruto Episode 3.mp4", mtimeMs: 5_000, isFile: () => true },
        { name: "Naruto Episode 4.vtt", mtimeMs: 9_600, isFile: () => true },
      ],
      stat: async () => ({ size: 1024 }),
    },
  );

  assert.equal(calls[0][0], "ani-cli");
  assert.deepEqual(calls[0][1], ["-d", "-S", "1", "-e", "4", "-q", "720", "naruto"]);
  assert.equal(calls[0][2].env.ANI_CLI_DOWNLOAD_DIR, "/tmp/anidl-test");
  assert.equal(calls[0][2].env.ANI_CLI_MENU, "/usr/local/bin/ani-pick-first");
  assert.deepEqual(
    [media.title, media.fileName, media.mimeType, media.size],
    ["Naruto Episode 4", "Naruto Episode 4.mp4", "video/mp4", 1024],
  );
});

test("downloadAnimeEpisode fails when ani-cli produces no fresh video", async () => {
  await assert.rejects(
    downloadAnimeEpisode("naruto", {}, {
      run: async () => ({}),
      now: () => 10_000,
      downloadDir: "/tmp/anidl-test",
      listFiles: async () => [{ name: "old.mp4", mtimeMs: 1_000, isFile: () => true }],
    }),
    /produced no video/,
  );
});

test("animeDownloadError translates timeout and missing binary", () => {
  assert.match(animeDownloadError({ code: "ENOENT" }), /belum terpasang/);
  assert.match(animeDownloadError({ killed: true }), /timeout/);
  assert.match(animeDownloadError(new Error("boom")), /Gagal mengunduh anime/);
});

test(".getani replaces .anime and both new commands are advertised in the menu", async () => {
  assert.equal(getani.name, "getani");
  assert.ok(getani.match({ text: ".getani Naruto" }));
  assert.equal(getani.match({ text: ".anime Naruto" }), false);
  assert.ok(anidl.match({ text: ".anidl naruto" }));
  assert.equal(anidl.match({ text: ".anidll naruto" }), false);

  let sent = null;
  await menu.run({
    sock: { sendMessage: async (_to, message) => { sent = message; } },
    from: "chat@s.whatsapp.net",
  });
  assert.match(sent.caption, /\.getani <title>/);
  assert.match(sent.caption, /\.anidl <title>/);
  assert.doesNotMatch(sent.caption, /\.anime/);
});
