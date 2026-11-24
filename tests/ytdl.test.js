import test from "node:test";
import assert from "node:assert/strict";
import * as ytdl from "../handler/ytdl.js";
import * as menu from "../handler/menu.js";

function capture() {
  const messages = [];
  return {
    messages,
    sock: { sendMessage: async (to, message) => messages.push({ to, message }) },
    sendText: async (text) => messages.push({ text }),
  };
}

test(".ytdl streams video larger than 50 MB to Drive and replies with link", async () => {
  const output = capture();
  const media = {
    title: "Long sample video",
    fileName: "Long sample video.mp4",
    mimeType: "video/mp4",
    size: 70 * 1024 * 1024,
    filePath: "/downloads/long-sample.mp4",
  };
  const uploaded = [];
  const drive = {
    authorize: async () => "auth",
    uploadToDrive: async (...args) => {
      uploaded.push(args);
      return { id: "long-drive-file", webViewLink: "https://drive.google.com/file/d/long-drive-file/view" };
    },
  };

  await ytdl.run({
    text: ".ytdl https://youtu.be/abc123 1080",
    sock: output.sock,
    from: "chat@s.whatsapp.net",
    sendText: output.sendText,
  }, async () => media, async () => {}, drive);

  assert.equal(uploaded.length, 1);
  assert.deepEqual(uploaded[0], ["auth", media.filePath, media.fileName, media.mimeType]);
  assert.match(output.messages[0].text, /long-drive-file/);
  assert.equal(output.messages.some((message) => message.message?.document), false);
});

test(".ytdl uploads media smaller than 50 MB to Drive instead of WhatsApp", async () => {
  const output = capture();
  const media = {
    title: "Small video",
    fileName: "Small video.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("small video"),
  };
  const uploaded = [];
  const drive = {
    authorize: async () => "auth",
    uploadToDrive: async (...args) => {
      uploaded.push(args);
      return { id: "drive-file", name: args[2], webViewLink: "https://drive.google.com/file/d/drive-file/view" };
    },
  };

  await ytdl.run({
    text: ".ytdl https://youtu.be/abc123",
    sock: output.sock,
    from: "chat@s.whatsapp.net",
    sendText: output.sendText,
  }, async () => media, undefined, drive);

  assert.equal(output.messages.length, 1);
  assert.match(output.messages[0].text, /tersimpan di Google Drive/);
  assert.match(output.messages[0].text, /drive-file/);
  assert.equal(uploaded[0][0], "auth");
  assert.equal(uploaded[0][1], media.buffer);
  assert.equal(output.messages.some((message) => message.message?.document), false);
});

test(".ytdl passes requested resolution to YouTube downloader", async () => {
  for (const quality of ["360", "720", "1080"]) {
    const output = capture();
    const calls = [];
    const drive = {
      authorize: async () => "auth",
      uploadToDrive: async () => ({ id: "uploaded" }),
    };

    await ytdl.run({
      text: `.ytdl https://youtu.be/abc123 ${quality}`,
      sock: output.sock,
      from: "chat@s.whatsapp.net",
      sendText: output.sendText,
    }, async (...args) => {
      calls.push(args);
      return { title: "Video", fileName: "video.mp4", mimeType: "video/mp4", buffer: Buffer.from("video") };
    }, undefined, drive);

    assert.deepEqual(calls[0], ["https://youtu.be/abc123", "mp4", quality]);
    assert.match(output.messages[0].text, /Google Drive/);
  }
});

test(".ytdl uploads MP4 files of exactly 50 MB to Drive and replies with link", async () => {
  const output = capture();
  const media = {
    title: "Large video",
    fileName: "Large video.mp4",
    mimeType: "video/mp4",
    size: 50 * 1024 * 1024,
    filePath: "/downloads/large-video.mp4",
  };
  const uploaded = [];
  const drive = {
    authorize: async () => "auth",
    uploadToDrive: async (...args) => {
      uploaded.push(args);
      return { id: "exact-limit-file", webViewLink: "https://drive.google.com/file/d/exact-limit-file/view" };
    },
  };

  await ytdl.run({
    text: ".ytdl https://youtu.be/abc123",
    sock: output.sock,
    from: "chat@s.whatsapp.net",
    sendText: output.sendText,
  }, async () => media, async () => {}, drive);

  assert.deepEqual(uploaded[0], ["auth", media.filePath, media.fileName, media.mimeType]);
  assert.match(output.messages[0].text, /exact-limit-file/);
  assert.equal(output.messages.some((message) => message.message?.document), false);
});

test(".ytdl sends extracted MP3 audio to WhatsApp", async () => {
  const output = capture();
  let uploaded = false;
  const download = async (_url, mode) => ({
    title: "Sample song",
    fileName: "Sample song.mp3",
    mimeType: mode === "mp3" ? "audio/mpeg" : "video/mp4",
    buffer: Buffer.from("audio"),
  });

  await ytdl.run({
    text: ".ytdl https://www.youtube.com/watch?v=abc123 mp3",
    sock: output.sock,
    from: "chat@s.whatsapp.net",
    sendText: output.sendText,
  }, download, undefined, { authorize: async () => "auth", uploadToDrive: async () => { uploaded = true; return { id: "uploaded" }; } });

  assert.equal(uploaded, false);
  assert.equal(output.messages[0].message.audio.toString(), "audio");
  assert.equal(output.messages[0].message.mimetype, "audio/mpeg");
  assert.equal(output.messages[0].message.ptt, false);
});

test(".ytdl rejects non-YouTube URLs and unsupported modes", async () => {
  const output = capture();
  let called = false;
  const download = async () => {
    called = true;
  };

  await ytdl.run({ text: ".ytdl https://example.com/video", sendText: output.sendText }, download);
  assert.match(output.messages[0].text, /YouTube/);
  await ytdl.run({ text: ".ytdl https://youtube.com.evil.example/watch?v=abc123", sendText: output.sendText }, download);
  assert.match(output.messages[1].text, /YouTube/);
  await ytdl.run({ text: ".ytdl https://youtu.be/abc123 wav", sendText: output.sendText }, download);
  assert.match(output.messages[2].text, /mp3/);
  assert.equal(called, false);
});

test(".ytdl command matches only complete command prefix", () => {
  assert.equal(ytdl.match({ text: ".ytdl https://youtu.be/abc123" }), true);
  assert.equal(ytdl.match({ text: ".ytdl" }), true);
  assert.equal(ytdl.match({ text: ".ytdlfoo https://youtu.be/abc123" }), false);
});

test(".ytdl removes temporary file after sending media", async () => {
  const output = capture();
  const removed = [];
  const media = {
    title: "Sample video",
    fileName: "Sample video.mp4",
    mimeType: "video/mp4",
    buffer: Buffer.from("video"),
    filePath: "/tmp/youtube-video.mp4",
  };

  await ytdl.run({
    text: ".ytdl https://youtu.be/abc123",
    sock: output.sock,
    from: "chat@s.whatsapp.net",
    sendText: output.sendText,
  }, async () => media, async (filePath) => removed.push(filePath));

  assert.deepEqual(removed, [media.filePath]);
});

test(".ytdl translates legacy duration errors into a clear reply", async () => {
  const output = capture();
  const error = Object.assign(new Error("Video too long"), {
    code: 1,
    stderr: "YouTube video is longer than 15 minutes.",
  });

  await ytdl.run({ text: ".ytdl https://youtu.be/abc123", sendText: output.sendText }, async () => {
    throw error;
  });

  assert.match(output.messages[0].text, /❌/);
  assert.doesNotMatch(output.messages[0].text, /15 menit/);
});

test(".ytdl gives the same download error for duration-related extractor errors", async () => {
  const output = capture();
  const error = new Error("YouTube video is longer than 15 minutes.");

  await ytdl.run({ text: ".ytdl https://youtu.be/abc123 1080", sendText: output.sendText }, async () => {
    throw error;
  });

  assert.match(output.messages[0].text, /❌/);
  assert.doesNotMatch(output.messages[0].text, /15 menit/);
});

test("menu lists YouTube downloader alongside TikTok", async () => {
  let sent;
  await menu.run({
    sock: { sendMessage: async (_to, message) => { sent = message; } },
    from: "chat@s.whatsapp.net",
  });

  assert.match(sent.caption, /\.ytdl <url> \[360\|720\|1080\|best\]/);
  assert.match(sent.caption, /\.ytdl <url> mp3/);
  assert.match(sent.caption, /\.tiktok <url>/);
});
