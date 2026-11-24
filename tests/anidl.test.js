import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DRIVE } from "../src/config.js";
import * as anidl from "../handler/anidl.js";
import * as getani from "../handler/getani.js";
import * as menu from "../handler/menu.js";
import {
  AnimeQualityUnavailableError,
  animeDownloadError,
  downloadAnimeEpisode,
  parseAnimeQualities,
  probeAnimeQualities,
  removeAnimeDownload,
} from "../src/services/anime.js";

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
  assert.deepEqual(uploaded[0], ["auth", episode.filePath, "Naruto Episode 1 (480p).mp4", episode.mimeType]);
  assert.match(output.messages[1].text, /Naruto Episode 1 \(ep 2, 480p\)/);
  assert.match(output.messages[1].text, /anime-file-1/);
  assert.deepEqual(removed, [episode.filePath]);
});

test(".anidl includes the best quality in the uploaded file name by default", async () => {
  const output = capture();
  const { uploaded, drive } = driveStub();

  await anidl.run(
    { text: ".anidl naruto", sendText: output.sendText },
    async () => episode,
    async () => {},
    drive,
  );

  assert.equal(uploaded[0][2], "Naruto Episode 1 (best).mp4");
  assert.match(output.messages.at(-1).text, /\(ep 1, best\)/);
});

test(".anidl sends a download status before the Drive link", async () => {
  const output = capture();
  const { drive } = driveStub();
  const events = [];

  await anidl.run(
    {
      text: ".anidl naruto --ep 2 --480",
      sendText: async (text) => { events.push(`text:${text}`); output.messages.push({ text }); },
    },
    async () => { events.push("download"); return episode; },
    async () => {},
    drive,
  );

  assert.match(events[0], /^text:Downloading naruto episode 2/);
  assert.equal(events[1], "download");
  assert.match(output.messages.at(-1).text, /saved to Google Drive/);
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
  assert.match(output.messages[1].text, /ani-cli is not installed/);
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
  assert.match(output.messages[0].text, /not configured/);
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

  assert.match(output.messages[1].text, /Failed to save the episode/);
  assert.deepEqual(removed, [episode.filePath]);
});

test("downloadAnimeEpisode passes non-interactive flags and picks the newest fresh video", async () => {
  const calls = [];
  const media = await downloadAnimeEpisode(
    "naruto",
    { episode: 4, quality: "720" },
    {
      run: async (...args) => { calls.push(args); return { stdout: "", stderr: "" }; },
      probeQualities: false,
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
      probeQualities: false,
      now: () => 10_000,
      downloadDir: "/tmp/anidl-test",
      listFiles: async () => [{ name: "old.mp4", mtimeMs: 1_000, isFile: () => true }],
    }),
    /produced no video/,
  );
});

test("animeDownloadError translates timeout and missing binary", () => {
  assert.match(animeDownloadError({ code: "ENOENT" }), /is not installed/);
  assert.match(animeDownloadError({ killed: true }), /timed out/);
  assert.match(animeDownloadError(new Error("boom")), /Failed to download the anime/);
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
  assert.match(sent.caption, /\.help \[command\]/);
  assert.doesNotMatch(sent.caption, /\.anime/);
});

test(".anidl accepts the --quality <q> spelling", () => {
  assert.deepEqual(anidl.parseArguments(".anidl one piece --quality 720"), {
    title: "one piece",
    episode: 1,
    quality: "720",
  });
  assert.deepEqual(anidl.parseArguments(".anidl one piece --ep 5 --quality best"), {
    title: "one piece",
    episode: 5,
    quality: "best",
  });
});

test(".anidl rejects quality values outside the known set", () => {
  assert.ok(anidl.parseArguments(".anidl naruto --999").error);
  assert.ok(anidl.parseArguments(".anidl naruto --quality 1080p").error);
  assert.ok(anidl.parseArguments(".anidl naruto --quality").error);
});

test("parseAnimeQualities extracts the offered streams from the debug output", () => {
  const output = [
    "All links:",
    "1080 >https://hls.example/1080/index.m3u8",
    "720 >https://hls.example/720/index.m3u8",
    "480 >https://hls.example/480/index.m3u8",
    "Selected link:",
    "https://hls.example/1080/index.m3u8",
  ].join("\n");
  assert.deepEqual(parseAnimeQualities(output), ["1080", "720", "480"]);
  assert.deepEqual(parseAnimeQualities("All links:\n360 >x\nSelected link:y\n360 >z"), ["360"]);
});

test("probeAnimeQualities runs ani-cli in debug mode and parses the links", async () => {
  const calls = [];
  const qualities = await probeAnimeQualities("naruto", { episode: 2 }, {
    run: async (...args) => {
      calls.push(args);
      return { stdout: "All links:\n1080 >https://hls.example/1080/index.m3u8\nSelected link:\nhttps://hls.example/1080/index.m3u8\n", stderr: "" };
    },
  });
  assert.equal(calls[0][0], "ani-cli");
  assert.deepEqual(calls[0][1], ["-S", "1", "-e", "2", "-q", "best", "naruto"]);
  assert.equal(calls[0][2].env.ANI_CLI_PLAYER, "debug");
  assert.deepEqual(qualities, ["1080"]);
});

test("downloadAnimeEpisode fails with the quality list when the requested format is absent", async () => {
  await assert.rejects(
    downloadAnimeEpisode("one piece", { episode: 1, quality: "720" }, {
      availableQualities: ["1080"],
      probeQualities: false,
    }),
    (error) => {
      assert.ok(error instanceof AnimeQualityUnavailableError);
      assert.match(error.message, /720 is not available/);
      assert.match(error.message, /Available qualities: 1080p/);
      assert.match(error.message, /\.anidl one piece --quality 1080/);
      return true;
    },
  );
});

test("downloadAnimeEpisode treats best and worst as valid against a numeric format list", async () => {
  for (const quality of ["best", "worst"]) {
    const media = await downloadAnimeEpisode(
      "dandadan",
      { episode: 1, quality },
      {
        availableQualities: ["1080", "720", "360"],
        probeQualities: false,
        run: async (...args) => {
          assert.equal(args[1][args[1].length - 3], "-q");
          assert.equal(args[1][args[1].length - 2], quality);
          return {};
        },
        now: () => 10_000,
        downloadDir: "/tmp/anidl-test",
        listFiles: async () => [{ name: "Dandadan Episode 1.mp4", mtimeMs: 9_500, isFile: () => true }],
        stat: async () => ({ size: 2048 }),
      },
    );
    assert.equal(media.title, "Dandadan Episode 1");
  }
});

test("anidl.run surfaces the format list without downloading", async () => {
  const output = capture();
  const drive = driveStub().drive;
  await anidl.run(
    { text: ".anidl one piece --quality 720", sendText: output.sendText },
    async () => {
      throw new AnimeQualityUnavailableError("one piece", 1, "720", ["1080"]);
    },
    async () => {},
    drive,
  );
  assert.match(output.messages[1].text, /Available qualities: 1080p/);
  assert.match(output.messages[1].text, /\.anidl one piece --quality 1080/);
});

test("animeDownloadError unwraps the quality-unavailable message", () => {
  const error = new AnimeQualityUnavailableError("naruto", 2, "480", ["1080"]);
  assert.match(animeDownloadError(error), /480 is not available/);
  assert.match(animeDownloadError(error), /Available qualities: 1080p/);
});

test("downloadAnimeEpisode isolates each invocation in a fresh directory", async () => {
  const calls = [];
  const madeDirs = [];
  await downloadAnimeEpisode("dandadan", { episode: 1, quality: "1080" }, {
    run: async (...args) => { calls.push(args); return {}; },
    probeQualities: false,
    mkdir: async (dir) => { madeDirs.push(dir); },
    now: () => 10_000,
    listFiles: async () => [{ name: "Dandadan Episode 1.mp4", mtimeMs: 9_500, isFile: () => true }],
    stat: async () => ({ size: 2048 }),
  });

  assert.equal(madeDirs.length, 1);
  assert.equal(path.dirname(madeDirs[0]), path.join("data", "downloads", "anidl"));
  assert.notEqual(madeDirs[0], path.join("data", "downloads", "anidl"));
  assert.equal(calls[0][2].env.ANI_CLI_DOWNLOAD_DIR, madeDirs[0]);
});

test("downloadAnimeEpisode accepts a real video listed from the filesystem", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "anidl-real-"));
  const filePath = path.join(dir, "Dandadan Episode 1.mp4");
  await fs.writeFile(filePath, "video");
  try {
    const media = await downloadAnimeEpisode("dandadan", { episode: 1, quality: "best" }, {
      run: async () => ({}),
      probeQualities: false,
      downloadDir: dir,
    });
    assert.equal(media.filePath, filePath);
    assert.equal(media.title, "Dandadan Episode 1");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("removeAnimeDownload removes the per-invocation directory", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "anidl-"));
  const filePath = path.join(dir, "Dandadan Episode 1.mp4");
  await fs.writeFile(filePath, "video");
  await fs.writeFile(path.join(dir, "Dandadan Episode 1.vtt"), "subtitle");

  await removeAnimeDownload(filePath);

  await assert.rejects(fs.stat(filePath), { code: "ENOENT" });
  await assert.rejects(fs.stat(dir), { code: "ENOENT" });
});
