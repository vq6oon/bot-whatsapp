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
  searchAnimeTitles,
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
    episodes: [1],
    quality: "best",
  });
});

test(".anidl parses -e and -q flags plus long aliases", () => {
  assert.deepEqual(anidl.parseArguments(".anidl one piece -e 3 -q 720"), {
    title: "one piece",
    episodes: [3],
    quality: "720",
  });
  assert.deepEqual(anidl.parseArguments(".anidl one piece --episode 5 --quality best"), {
    title: "one piece",
    episodes: [5],
    quality: "best",
  });
  assert.deepEqual(anidl.parseArguments(".anidl one piece --ep 3 --720"), {
    title: "one piece",
    episodes: [3],
    quality: "720",
  });
});

test(".anidl parses quoted titles and episode ranges", () => {
  assert.deepEqual(anidl.parseArguments('.anidl "yani neko" --ep 1-3 --quality 1080'), {
    title: "yani neko",
    episodes: [1, 2, 3],
    quality: "1080",
  });
  assert.deepEqual(anidl.parseArguments(".anidl 'yani neko' --ep 2-2"), {
    title: "yani neko",
    episodes: [2],
    quality: "best",
  });
});

test(".anidl parses --format-list", () => {
  assert.deepEqual(anidl.parseArguments(".anidl naruto --format-list"), {
    title: "naruto",
    episodes: [1],
    quality: "best",
    formatList: true,
  });
  assert.deepEqual(anidl.parseArguments('.anidl "yani neko" --ep 2 --format-list --quality 720'), {
    title: "yani neko",
    episodes: [2],
    quality: "720",
    formatList: true,
  });
});

test(".anidl parses --search and lists matching titles", () => {
  assert.deepEqual(anidl.parseArguments(".anidl --search dandadan"), {
    title: "dandadan",
    episodes: [1],
    quality: "best",
    search: true,
  });
  assert.deepEqual(anidl.parseArguments('.anidl --search "dandadan s2"'), {
    title: "dandadan s2",
    episodes: [1],
    quality: "best",
    search: true,
  });
  assert.ok(anidl.parseArguments(".anidl --search").error);
});

test(".anidl rejects malformed or oversized episode ranges", () => {
  for (const ep of ["0-2", "3-1", "1-21", "1-2-3", "abc"]) {
    assert.ok(anidl.parseArguments(`.anidl naruto --ep ${ep}`).error, ep);
  }
});

test(".anidl requires a title", async () => {
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
  assert.equal(output.messages[1].text, "· Uploading episode 2 to Google Drive...");
  assert.match(output.messages.at(-1).text, /Naruto Episode 1 \(ep 2\) \(480p\)/);
  assert.match(output.messages.at(-1).text, /anime-file-1/);
  assert.deepEqual(removed, [episode.filePath]);
});

test(".anidl avoids duplicating the episode number in the Drive status", async () => {
  const output = capture();
  const { uploaded, drive } = driveStub();

  await anidl.run(
    { text: ".anidl dandadan --ep 1 --1080", sendText: output.sendText },
    async () => ({
      ...episode,
      title: "Dandadan Episode 1",
      fileName: "Dandadan Episode 1.mp4",
      filePath: "/downloads/anidl/Dandadan Episode 1.mp4",
    }),
    async () => {},
    drive,
  );

  assert.equal(uploaded[0][2], "Dandadan Episode 1 (1080p).mp4");
  assert.match(output.messages.at(-1).text, /✓ Dandadan Episode 1 \(1080p\) saved to Google Drive/);
  assert.doesNotMatch(output.messages.at(-1).text, /\(ep 1, 1080p\)/);
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
  assert.match(output.messages.at(-1).text, /Naruto Episode 1 \(best\)/);
});

test(".anidl links the existing file when Drive already has that name", async () => {
  const output = capture();
  const drive = {
    authorize: async () => "auth",
    uploadToDrive: async () => ({
      id: "old-anime-id",
      name: "Naruto Episode 1 (best).mp4",
      webViewLink: "https://drive.google.com/file/d/old-anime-id/view",
      reused: true,
    }),
  };

  await anidl.run(
    { text: ".anidl naruto", sendText: output.sendText },
    async () => episode,
    async () => {},
    drive,
  );

  assert.match(output.messages.at(-1).text, /already in Google Drive/);
  assert.match(output.messages.at(-1).text, /old-anime-id/);
});

test(".anidl downloads and uploads every episode in a range", async () => {
  const output = capture();
  const { uploaded, drive } = driveStub();
  const calls = [];
  const removed = [];

  await anidl.run(
    { text: '.anidl "yani neko" --ep 1-3 --quality 1080', sendText: output.sendText },
    async (title, options) => {
      calls.push([title, options]);
      const name = `Yani Neko Episode ${options.episode}.mp4`;
      return {
        ...episode,
        title: `Yani Neko Episode ${options.episode}`,
        fileName: name,
        filePath: `/downloads/anidl/${name}`,
      };
    },
    async (filePath) => { removed.push(filePath); },
    drive,
  );

  assert.deepEqual(calls, [
    ["yani neko", { episode: 1, quality: "1080" }],
    ["yani neko", { episode: 2, quality: "1080" }],
    ["yani neko", { episode: 3, quality: "1080" }],
  ]);
  assert.deepEqual(uploaded.map((args) => args[2]), [
    "Yani Neko Episode 1 (1080p).mp4",
    "Yani Neko Episode 2 (1080p).mp4",
    "Yani Neko Episode 3 (1080p).mp4",
  ]);
  assert.match(output.messages[0].text, /Downloading yani neko episodes 1-3/);
  assert.equal(output.messages.filter((message) => /saved to Google Drive/.test(message.text)).length, 3);
  assert.equal(removed.length, 3);
});

test(".anidl --format-list lists qualities without downloading", async () => {
  const output = capture();
  const { uploaded, drive } = driveStub();
  const probed = [];
  let downloads = 0;

  await anidl.run(
    { text: ".anidl yani neko --ep 2 --format-list", sendText: output.sendText },
    async () => { downloads += 1; return episode; },
    async () => {},
    drive,
    async (title, options) => {
      probed.push([title, options.episode]);
      return ["1080", "720", "360"];
    },
  );

  assert.deepEqual(probed, [["yani neko", 2]]);
  assert.equal(downloads, 0);
  assert.equal(uploaded.length, 0);
  assert.match(output.messages[0].text, /Checking formats for yani neko episode 2/);
  assert.match(output.messages[1].text, /Available formats for yani neko episode 2/);
  assert.match(output.messages[1].text, /· 1080p/);
  assert.match(output.messages[1].text, /· 720p/);
  assert.match(output.messages[1].text, /\.anidl "yani neko" -e 2 -q 1080/);
});

test(".anidl --search lists anime titles without downloading", async () => {
  const output = capture();
  const searched = [];
  const downloaded = [];

  await anidl.run(
    { text: ".anidl --search dandadan s2", sendText: output.sendText },
    async (...args) => { downloaded.push(args); return episode; },
    async () => {},
    undefined,
    async () => { throw new Error("probe should not run"); },
    async (query) => {
      searched.push(query);
      return [{ title: "Dandadan" }, { title: "Dandadan 2nd Season" }];
    },
  );

  assert.deepEqual(searched, ["dandadan s2"]);
  assert.equal(downloaded.length, 0);
  assert.match(output.messages[0].text, /Searching anime for dandadan s2/);
  assert.match(output.messages[1].text, /Available titles for dandadan s2/);
  assert.match(output.messages[1].text, /· Dandadan/);
  assert.match(output.messages[1].text, /· "Dandadan 2nd Season"/);
  assert.match(output.messages[1].text, /Pick one and run/);
});

test(".anidl --search reports when no anime titles are found", async () => {
  const output = capture();

  await anidl.run(
    { text: ".anidl --search unknown anime", sendText: output.sendText },
    async () => {},
    async () => {},
    undefined,
    async () => [],
    async () => [],
  );

  assert.match(output.messages[0].text, /Searching anime for unknown anime/);
  assert.match(output.messages[1].text, /No anime titles found for unknown anime/);
});

test(".anidl --format-list handles empty and failed probes", async () => {
  const empty = capture();
  await anidl.run(
    { text: ".anidl naruto --format-list", sendText: empty.sendText },
    async () => episode,
    async () => {},
    undefined,
    async () => [],
  );
  assert.match(empty.messages.at(-1).text, /No formats found for naruto episode 1/);

  const failed = capture();
  await anidl.run(
    { text: ".anidl naruto --format-list", sendText: failed.sendText },
    async () => episode,
    async () => {},
    undefined,
    async () => { throw new Error("ani-cli exploded"); },
  );
  assert.match(failed.messages.at(-1).text, /Could not read available formats/);
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

  assert.match(events[0], /^text:· Downloading naruto episode 2/);
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
  assert.match(output.messages.at(-1).text, /ani-cli is not installed/);
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

  assert.match(output.messages.at(-1).text, /Failed to save the episode/);
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

test("searchAnimeTitles queries the anime API with a limit and returns titles", async () => {
  const calls = [];
  const results = await searchAnimeTitles("dandadan s2", async (url) => {
    calls.push(url.toString());
    return { ok: true, json: async () => ({ data: [{ title: "Dandadan" }] }) };
  });

  assert.equal(calls[0], "https://api.tenrai.org/v1/anime?q=dandadan+s2&limit=10");
  assert.deepEqual(results, [{ title: "Dandadan" }]);
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
    episodes: [1],
    quality: "720",
  });
  assert.deepEqual(anidl.parseArguments(".anidl one piece --ep 5 --quality best"), {
    title: "one piece",
    episodes: [5],
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
      assert.match(error.message, /Try: \.anidl "one piece" -e 1 -q 1080/);
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
  assert.match(output.messages[1].text, /Try: \.anidl "one piece" -e 1 -q 1080/);
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
