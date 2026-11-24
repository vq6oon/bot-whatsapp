import test from "node:test";
import assert from "node:assert/strict";
import { DRIVE } from "../src/config.js";
import * as yt from "../handler/yt.js";
import * as ytm from "../handler/ytm.js";
import * as menu from "../handler/menu.js";
import { probeVideoQuality } from "../src/services/youtube.js";
import { qualityLabelFromSize } from "../src/utils/filenames.js";

function capture() {
  const messages = [];
  return {
    messages,
    sock: { sendMessage: async (to, message) => messages.push({ to, message }) },
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
        return { id: "drive-file-1", webViewLink: "https://drive.google.com/file/d/drive-file-1/view" };
      },
    },
  };
}

const video = {
  title: "Sample video",
  fileName: "Sample video.mp4",
  mimeType: "video/mp4",
  size: 12 * 1024 * 1024,
  filePath: "/downloads/youtube-sample.mp4",
};

const audio = {
  title: "Sample track",
  fileName: "Sample track.mp3",
  mimeType: "audio/mpeg",
  size: 4 * 1024 * 1024,
  buffer: Buffer.from("mp3-bytes"),
  filePath: "/downloads/youtube-sample.mp3",
};

test(".yt uploads the best available video to Drive by default", async () => {
  const output = capture();
  const { uploaded, drive } = driveStub();
  const calls = [];

  await yt.run(
    { text: ".yt https://youtu.be/abc123", sendText: output.sendText },
    async (...args) => { calls.push(args); return video; },
    async () => {},
    drive,
  );

  assert.deepEqual(calls[0], ["https://youtu.be/abc123", "mp4", "best"]);
  assert.deepEqual(uploaded[0], ["auth", video.filePath, "Sample video (best).mp4", video.mimeType]);
  assert.equal(output.messages[0].text, "· Downloading video...");
  assert.equal(output.messages[1].text, "· Uploading to Google Drive...");
  assert.match(output.messages.at(-1).text, /Sample video \(best\)/);
  assert.match(output.messages.at(-1).text, /drive-file-1/);
});

test("qualityLabelFromSize maps the short edge to a known label", () => {
  assert.equal(qualityLabelFromSize(360), "360");
  assert.equal(qualityLabelFromSize(480), "480");
  assert.equal(qualityLabelFromSize(720), "720");
  assert.equal(qualityLabelFromSize(1080), "1080");
  assert.equal(qualityLabelFromSize(1920), "1080");
  assert.equal(qualityLabelFromSize(0), null);
});

test("probeVideoQuality reads the real resolution with ffprobe", async () => {
  const calls = [];
  const runner = async (binary, args) => {
    calls.push([binary, args]);
    return { stdout: "1920,360\n" };
  };

  assert.equal(await probeVideoQuality("/downloads/clip.mp4", runner), "360");
  assert.equal(calls[0][0], "ffprobe");
  assert.ok(calls[0][1].includes("-show_entries"));
});

test(".yt labels an explicit quality with the downloaded resolution when it is lower", async () => {
  const output = capture();
  const { uploaded, drive } = driveStub();

  await yt.run(
    { text: ".yt https://youtu.be/abc123 --1080", sendText: output.sendText },
    async () => ({ ...video, quality: "360" }),
    async () => {},
    drive,
  );

  assert.equal(uploaded[0][2], "Sample video (360p).mp4");
  assert.match(output.messages.at(-1).text, /Sample video \(360p\)/);
  assert.doesNotMatch(output.messages.at(-1).text, /1080p/);
});

test(".yt passes the --quality flag to the downloader", async () => {
  const output = capture();
  const { uploaded, drive } = driveStub();
  const calls = [];

  await yt.run(
    { text: ".yt https://www.youtube.com/watch?v=abc123 --720", sendText: output.sendText },
    async (...args) => { calls.push(args); return video; },
    async () => {},
    drive,
  );

  assert.deepEqual(calls[0], ["https://www.youtube.com/watch?v=abc123", "mp4", "720"]);
  assert.equal(uploaded[0][2], "Sample video (720p).mp4");
  assert.match(output.messages.at(-1).text, /\(720p\)/);
});

test(".yt accepts the mid-range --480 flag", async () => {
  const output = capture();
  const { drive } = driveStub();
  const calls = [];

  await yt.run(
    { text: ".yt https://youtu.be/abc123 --480", sendText: output.sendText },
    async (...args) => { calls.push(args); return video; },
    async () => {},
    drive,
  );

  assert.equal(calls[0][2], "480");
});

test(".yt requires the -- prefix and a known quality", async () => {
  const output = capture();
  let downloads = 0;
  const download = async () => { downloads += 1; return video; };

  for (const text of [
    ".yt https://youtu.be/abc123 720",
    ".yt https://youtu.be/abc123 --999",
    ".yt https://youtu.be/abc123 --720 extra",
    ".yt",
  ]) {
    await yt.run({ text, sendText: output.sendText }, download);
  }

  assert.equal(downloads, 0);
  assert.equal(output.messages.length, 4);
  assert.match(output.messages[0].text, /--<360\|480\|720\|1080\|best>/);
});

test(".yt rejects non-YouTube hosts and lookalike domains", async () => {
  const output = capture();
  const download = async () => video;

  await yt.run({ text: ".yt https://example.com/video --720", sendText: output.sendText }, download);
  await yt.run({ text: ".yt https://youtube.com.evil.example/watch?v=abc --720", sendText: output.sendText }, download);

  assert.match(output.messages[0].text, /Send a YouTube link/);
  assert.match(output.messages[1].text, /Send a YouTube link/);
});

test(".yt refuses to download when no Drive folder is configured", async () => {
  const originalFolderId = DRIVE.folderId;
  DRIVE.folderId = "";
  const output = capture();
  let downloads = 0;
  try {
    await yt.run(
      { text: ".yt https://youtu.be/abc123", sendText: output.sendText },
      async () => { downloads += 1; return video; },
    );
  } finally {
    DRIVE.folderId = originalFolderId;
  }

  assert.equal(downloads, 0);
  assert.match(output.messages[0].text, /not configured/);
});

test(".yt reports Drive upload failures", async () => {
  const output = capture();
  const drive = {
    authorize: async () => "auth",
    uploadToDrive: async () => { throw new Error("quota"); },
  };

  await yt.run(
    { text: ".yt https://youtu.be/abc123", sendText: output.sendText },
    async () => video,
    async () => {},
    drive,
  );

  assert.match(output.messages.at(-1).text, /Failed to save the download to Google Drive/);
});

test(".yt translates extractor rejections into a readable reply", async () => {
  const output = capture();
  const { drive } = driveStub();
  const rejected = Object.assign(new Error("rejected"), { code: 1 });

  await yt.run(
    { text: ".yt https://youtu.be/abc123", sendText: output.sendText },
    async () => { throw rejected; },
    async () => {},
    drive,
  );

  assert.match(output.messages.at(-1).text, /YouTube rejected the download/);
});

test(".yt removes the temporary file after upload", async () => {
  const output = capture();
  const { drive } = driveStub();
  const removed = [];

  await yt.run(
    { text: ".yt https://youtu.be/abc123", sendText: output.sendText },
    async () => video,
    async (filePath) => removed.push(filePath),
    drive,
  );

  assert.deepEqual(removed, [video.filePath]);
});

test(".ytm downloads audio as MP3 and sends it to the chat", async () => {
  const output = capture();
  const calls = [];
  const removed = [];

  await ytm.run(
    { text: ".ytm https://music.youtube.com/watch?v=abc123", sock: output.sock, from: "chat@s.whatsapp.net", sendText: output.sendText },
    async (...args) => { calls.push(args); return audio; },
    async (filePath) => removed.push(filePath),
  );

  assert.deepEqual(calls[0], ["https://music.youtube.com/watch?v=abc123", "mp3", "best"]);
  assert.equal(output.messages[0].text, "· Downloading audio...");
  assert.equal(output.messages[1].text, "· Sending audio...");
  const sent = output.messages.find((message) => message.message);
  assert.ok(sent);
  assert.equal(sent.to, "chat@s.whatsapp.net");
  const payload = sent.message;
  assert.equal(payload.mimetype, "audio/mpeg");
  assert.equal(payload.fileName, "Sample track.mp3");
  assert.equal(payload.ptt, false);
  assert.deepEqual(payload.audio, audio.buffer);
  assert.deepEqual(removed, [audio.filePath]);
});

test(".ytm rejects extra arguments and non-YouTube links", async () => {
  const output = capture();
  let downloads = 0;
  const download = async () => { downloads += 1; return audio; };

  await ytm.run({ text: ".ytm https://youtu.be/abc123 --720", sock: output.sock, sendText: output.sendText }, download);
  await ytm.run({ text: ".ytm https://example.com/track", sock: output.sock, sendText: output.sendText }, download);

  assert.equal(downloads, 0);
  assert.match(output.messages[0].text, /Format: \.ytm <url>/);
  assert.match(output.messages[1].text, /Send a YouTube link/);
});

test(".ytm reports download failures without sending audio", async () => {
  const output = capture();
  const rejected = Object.assign(new Error("rejected"), { code: 1 });

  await ytm.run(
    { text: ".ytm https://youtu.be/abc123", sock: output.sock, sendText: output.sendText },
    async () => { throw rejected; },
  );

  assert.match(output.messages.at(-1).text, /YouTube rejected the download/);
});

test(".ytm reports an empty download instead of sending nothing", async () => {
  const output = capture();

  await ytm.run(
    { text: ".ytm https://youtu.be/abc123", sock: output.sock, sendText: output.sendText },
    async () => ({ ...audio, buffer: Buffer.alloc(0) }),
  );

  assert.match(output.messages.at(-1).text, /Could not download the audio/);
});

test(".yt and .ytm match only their own command prefix", () => {
  assert.equal(yt.match({ text: ".yt https://youtu.be/abc123" }), true);
  assert.equal(yt.match({ text: ".yt" }), true);
  assert.equal(yt.match({ text: ".ytm https://youtu.be/abc123" }), false);
  assert.equal(yt.match({ text: ".ytdl https://youtu.be/abc123" }), false);
  assert.equal(yt.match({ text: ".ytfoo" }), false);

  assert.equal(ytm.match({ text: ".ytm https://youtu.be/abc123" }), true);
  assert.equal(ytm.match({ text: ".ytm" }), true);
  assert.equal(ytm.match({ text: ".yt https://youtu.be/abc123" }), false);
});

test("menu advertises .yt, .ytm and points to per-command help", async () => {
  let sent = null;
  const sock = { sendMessage: async (_from, message) => { sent = message; } };

  await menu.run({ sock, from: "chat@s.whatsapp.net" });

  assert.match(sent.caption, /\.yt <url>/);
  assert.match(sent.caption, /\.ytm <url>/);
  assert.match(sent.caption, /\.tiktok <url>/);
  assert.match(sent.caption, /\.help yt/);
  assert.match(sent.caption, /\.help anidl/);
  assert.doesNotMatch(sent.caption, /\.ytdl/);
  assert.doesNotMatch(sent.caption, /mp3/);
});
