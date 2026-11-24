import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { DRIVE } from "../src/config.js";
import * as checkdrive from "../handler/checkdrive.js";
import * as list from "../handler/list.js";
import * as upload from "../handler/upload.js";
import * as menu from "../handler/menu.js";
import { filterDriveFiles, formatDriveList, uploadToDrive } from "../src/services/drive.js";
import { uniqueDriveFileName, withQualitySuffix } from "../src/utils/filenames.js";

const originalFolderId = DRIVE.folderId;
afterEach(() => {
  DRIVE.folderId = originalFolderId;
});

function textCollector() {
  const messages = [];
  return { messages, sendText: async (text) => messages.push(text) };
}

test("checkdrive reports configured folder and file count", async () => {
  DRIVE.folderId = "folder-123";
  const output = textCollector();
  const drive = {
    authorize: async () => "auth",
    getDriveFolderInfo: async (auth) => {
      assert.equal(auth, "auth");
      return { id: "folder-123", name: "Kamui-Bot" };
    },
    listDriveFiles: async () => [{ id: "one" }, { id: "two" }],
    getDriveQuota: async () => ({ used: "3.00", total: "15.00", free: "12.00" }),
  };

  await checkdrive.run(output, drive);

  assert.equal(output.messages[0], "· Checking Google Drive...");
  assert.match(output.messages.at(-1), /Kamui-Bot/);
  assert.match(output.messages.at(-1), /2/);
});

test("list shows only files matching requested type", async () => {
  DRIVE.folderId = "folder-123";
  const output = textCollector();
  const drive = {
    authorize: async () => "auth",
    listDriveFiles: async () => [
      { id: "video-id", name: "clip.mp4", mimeType: "video/mp4" },
      { id: "image-id", name: "cover.png", mimeType: "image/png" },
    ],
    formatDriveList,
  };

  await list.run({ ...output, text: ".list photo" }, drive);

  assert.equal(output.messages[0], "· Reading Google Drive...");
  assert.match(output.messages.at(-1), /cover\.png/);
  assert.doesNotMatch(output.messages.at(-1), /clip\.mp4/);
  assert.match(output.messages.at(-1), /drive\.google\.com/);
});

test("list rejects unsupported type filters", async () => {
  DRIVE.folderId = "folder-123";
  const output = textCollector();
  await list.run({ ...output, text: ".list archive" }, {});
  assert.match(output.messages[0], /Format: \.list/);
});

test("upload stores quoted WhatsApp media in Drive without sharing it publicly", async () => {
  DRIVE.folderId = "folder-123";
  const output = textCollector();
  const uploaded = [];
  const msg = { message: { extendedTextMessage: {} } };
  const quoted = {
    documentMessage: {
      fileName: "report.pdf",
      mimetype: "application/pdf",
    },
  };
  const drive = {
    authorize: async () => "auth",
    uploadToDrive: async (...args) => {
      uploaded.push(args);
      return { id: "file-id", name: args[2], webViewLink: "https://drive.google.com/file/d/file-id/view" };
    },
  };
  const media = {
    downloadQuotedBuffer: async (message, context) => {
      assert.equal(message, quoted);
      assert.equal(context.stanzaId, "quoted-message-id");
      return Buffer.from("test pdf");
    },
  };

  await upload.run({
    ...output,
    text: ".upload",
    msg,
    quoted,
    quotedContext: { stanzaId: "quoted-message-id" },
  }, drive, media);

  assert.equal(uploaded.length, 1);
  assert.equal(uploaded[0][0], "auth");
  assert.equal(uploaded[0][1].toString(), "test pdf");
  assert.equal(uploaded[0][2], "report.pdf");
  assert.equal(uploaded[0][3], "application/pdf");
  assert.equal(output.messages[0], "· Downloading media...");
  assert.equal(output.messages[1], "· Uploading to Google Drive...");
  assert.match(output.messages.at(-1), /report\.pdf/);
  assert.match(output.messages.at(-1), /drive\.google\.com/);
});

test("upload accepts media with command caption and custom file name", async () => {
  DRIVE.folderId = "folder-123";
  const output = textCollector();
  let uploadedFileName;
  const msg = { message: { imageMessage: { mimetype: "image/jpeg" } } };
  const drive = {
    authorize: async () => "auth",
    uploadToDrive: async (_auth, _buffer, fileName) => {
      uploadedFileName = fileName;
      return { id: "image-id", name: fileName };
    },
  };
  const media = { downloadOwnBuffer: async () => Buffer.from("image") };

  await upload.run({ ...output, text: ".upload holiday.jpg", msg }, drive, media);

  assert.equal(uploadedFileName, "holiday.jpg");
  assert.match(output.messages.at(-1), /holiday\.jpg/);
});

test("Drive commands explain missing folder configuration without API calls", async () => {
  DRIVE.folderId = "";
  const output = textCollector();
  const drive = {
    authorize: async () => assert.fail("must not authorize without folder ID"),
  };

  await checkdrive.run(output, drive);
  assert.match(output.messages[0], /DRIVE_FOLDER_ID/);
});

test("Drive file filter handles unsupported filters and empty file names", () => {
  const files = [
    { name: "photo.JPG" },
    { name: "song.mp3" },
    { name: "no-extension" },
    { name: ".hidden" },
  ];

  assert.deepEqual(filterDriveFiles(files, "photo"), [files[0]]);
  assert.deepEqual(filterDriveFiles(files, "unknown"), files);
  assert.match(formatDriveList([], null), /No files found/);
});

test("uploadToDrive checks existing names and picks the next free suffix", async () => {
  DRIVE.folderId = "folder-123";
  const lists = [];
  const created = [];
  const driveClient = {
    files: {
      list: async (params) => {
        lists.push(params);
        return { data: { files: [{ name: "clip.mp4" }, { name: "clip (2).mp4" }] } };
      },
      create: async (params) => {
        created.push(params);
        return { data: { id: "new-id", name: params.requestBody.name } };
      },
    },
  };

  const result = await uploadToDrive("auth", Buffer.from("video"), "clip.mp4", "video/mp4", driveClient);

  assert.equal(result.name, "clip (3).mp4");
  assert.equal(created[0].requestBody.name, "clip (3).mp4");
  assert.match(lists[0].q, /'folder-123' in parents/);
  assert.match(lists[0].q, /name contains 'clip'/);
  assert.match(lists[0].q, /trashed = false/);
});

test("uniqueDriveFileName keeps the extension and skips occupied suffixes", () => {
  assert.equal(uniqueDriveFileName("clip.mp4", []), "clip.mp4");
  assert.equal(uniqueDriveFileName("clip.mp4", ["clip.mp4"]), "clip (2).mp4");
  assert.equal(
    uniqueDriveFileName("clip.mp4", ["clip.mp4", "clip (2).mp4", "clip (3).mp4"]),
    "clip (4).mp4",
  );
  assert.equal(uniqueDriveFileName("notes", ["notes"]), "notes (2)");
});

test("withQualitySuffix inserts the quality before the extension once", () => {
  assert.equal(withQualitySuffix("clip.mp4", "best"), "clip (best).mp4");
  assert.equal(withQualitySuffix("clip.mp4", "720p"), "clip (720p).mp4");
  assert.equal(withQualitySuffix("clip (720p).mp4", "720p"), "clip (720p).mp4");
  assert.equal(withQualitySuffix("notes", "best"), "notes (best)");
});

test("menu advertises the Drive commands it actually implements", async () => {
  let sent = null;
  const sock = { sendMessage: async (_from, message) => { sent = message; } };

  await menu.run({ sock, from: "chat@s.whatsapp.net" });

  assert.ok(sent.image.length > 0);
  assert.match(sent.caption, /\.checkdrive/);
  assert.match(sent.caption, /\.list \[type\]/);
  assert.match(sent.caption, /\.upload \[name\]/);
  assert.doesNotMatch(sent.caption, /\(na\)/);
  assert.doesNotMatch(sent.caption, /Not integrated/);
  assert.doesNotMatch(sent.caption, /\.statusbot/);
});
