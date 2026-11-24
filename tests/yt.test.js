import test from "node:test";
import assert from "node:assert/strict";
import { DRIVE } from "../src/config.js";
import * as yt from "../handler/yt.js";
import * as ytm from "../handler/ytm.js";
import * as menu from "../handler/menu.js";

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
  assert.deepEqual(uploaded[0], ["auth", video.filePath, video.fileName, video.mimeType]);
  assert.match(output.messages[0].text, /Sample video \(best\)/);
  assert.match(output.messages[0].text, /drive-file-1/);
});

test(".yt passes the --quality flag to the downloader", async () => {
  const output = capture();
  const { drive } = driveStub();
  const calls = [];

  await yt.run(
    { text: ".yt https://www.youtube.com/watch?v=abc123 --720", sendText: output.sendText },
    async (...args) => { calls.push(args); return video; },
    async () => {},
    drive,
  );

  assert.deepEqual(calls[0], ["https://www.youtube.com/watch?v=abc123", "mp4", "720"]);
  assert.match(output.messages[0].text, /\(720p\)/);
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

  assert.match(output.messages[0].text, /Failed to save the download to Google Drive/);
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

  assert.match(output.messages[0].text, /YouTube rejected the download/);
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
  assert.equal(output.messages.length, 1);
  assert.equal(output.messages[0].to, "chat@s.whatsapp.net");
  const payload = output.messages[0].message;
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

  assert.equal(output.messages.length, 1);
  assert.match(output.messages[0].text, /YouTube rejected the download/);
});

test(".ytm reports an empty download instead of sending nothing", async () => {
  const output = capture();

  await ytm.run(
    { text: ".ytm https://youtu.be/abc123", sock: output.sock, sendText: output.sendText },
    async () => ({ ...audio, buffer: Buffer.alloc(0) }),
  );

  assert.match(output.messages[0].text, /Could not download the audio/);
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
