import fs from "fs";
import { google } from "googleapis";
import { DRIVE } from "../config.js";

export async function authorize() {
  const credentials = JSON.parse(
    fs.readFileSync(DRIVE.credentialsPath, "utf-8"),
  );
  const { client_secret, client_id, redirect_uris } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
  );

  if (!fs.existsSync(DRIVE.tokenPath)) {
    throw new Error(
      `OAuth token not found at ${DRIVE.tokenPath}. Run get_token.js first.`,
    );
  }

  oAuth2Client.setCredentials(
    JSON.parse(fs.readFileSync(DRIVE.tokenPath, "utf-8")),
  );
  return oAuth2Client;
}

export async function uploadToDrive(auth, filePath, fileName) {
  const drive = google.drive({ version: "v3", auth });

  const existing = await drive.files.list({
    q: `'${DRIVE.folderId}' in parents and name='${fileName}'`,
    fields: "files(id, name)",
  });

  if (existing.data.files.length > 0) {
    return {
      alreadyExists: true,
      link: `https://drive.google.com/uc?id=${existing.data.files[0].id}&export=download`,
    };
  }

  const response = await drive.files.create({
    resource: { name: fileName, parents: [DRIVE.folderId] },
    media: { body: fs.createReadStream(filePath) },
    fields: "id",
  });

  await drive.permissions.create({
    fileId: response.data.id,
    requestBody: { role: "reader", type: "anyone" },
  });

  return {
    alreadyExists: false,
    link: `https://drive.google.com/uc?id=${response.data.id}&export=download`,
  };
}

export async function getDriveQuota(auth) {
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.about.get({ fields: "storageQuota" });
  const quota = res.data.storageQuota;

  const gb = (bytes) => parseInt(bytes) / (1024 * 1024 * 1024);
  const used = gb(quota.usage).toFixed(2);
  const total = gb(quota.limit).toFixed(2);

  return { used, total, free: (total - used).toFixed(2) };
}

export async function listDriveFiles(auth) {
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.list({
    q: `'${DRIVE.folderId}' in parents`,
    fields: "files(id, name)",
  });

  return res.data.files
    .map(
      (file) =>
        `📄 *${file.name}*\n🔗 https://drive.google.com/file/d/${file.id}`,
    )
    .join("\n\n");
}

const AUDIO_EXT = ["mp3", "m4a", "wav", "ogg", "flac"];
const VIDEO_EXT = ["mp4", "mkv", "webm", "mov", "avi"];
const DOC_EXT = ["pdf", "docx", "doc", "xlsx", "pptx", "txt", "csv"];
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "gif", "bmp"];

export function filterDriveFiles(files, type) {
  return files.filter((file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    if (type === "audio") return AUDIO_EXT.includes(ext);
    if (type === "video") return VIDEO_EXT.includes(ext);
    if (type === "document") return DOC_EXT.includes(ext);
    if (type === "photo") return IMAGE_EXT.includes(ext);
    return true;
  });
}

function iconFor(fileName) {
  const ext = fileName.split(".").pop().toLowerCase();
  if (AUDIO_EXT.includes(ext)) return "🎵";
  if (VIDEO_EXT.includes(ext)) return "🎬";
  if (DOC_EXT.includes(ext)) return "📑";
  if (IMAGE_EXT.includes(ext)) return "🖼️";
  return "📄";
}

export async function formatDriveList(auth, type = null) {
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.list({
    q: `'${DRIVE.folderId}' in parents`,
    fields: "files(id, name)",
  });

  const files = filterDriveFiles(res.data.files, type);
  if (files.length === 0) return "📭 No files found.";

  return files
    .map(
      (file) =>
        `${iconFor(file.name)} *${file.name}*\n🔗 https://drive.google.com/file/d/${file.id}`,
    )
    .join("\n\n");
}
