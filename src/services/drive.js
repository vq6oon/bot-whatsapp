import fs from "fs";
import { Readable } from "node:stream";
import { google } from "googleapis";
import { DRIVE } from "../config.js";
import { splitFileName, uniqueDriveFileName } from "../utils/filenames.js";

export async function authorize() {
  if (!fs.existsSync(DRIVE.credentialsPath)) {
    throw new Error(`Google OAuth client file not found at ${DRIVE.credentialsPath}.`);
  }
  if (!fs.existsSync(DRIVE.tokenPath)) {
    throw new Error(`Google OAuth token not found at ${DRIVE.tokenPath}. Run get_token.js first.`);
  }

  const credentials = JSON.parse(fs.readFileSync(DRIVE.credentialsPath, "utf-8"));
  const installed = credentials.installed || credentials.web;
  if (!installed?.client_id || !installed?.client_secret) {
    throw new Error("Google OAuth client file is invalid.");
  }

  const oAuth2Client = new google.auth.OAuth2(
    installed.client_id,
    installed.client_secret,
    installed.redirect_uris?.[0],
  );
  oAuth2Client.setCredentials(
    JSON.parse(fs.readFileSync(DRIVE.tokenPath, "utf-8")),
  );
  return oAuth2Client;
}

function requireFolderId() {
  if (!DRIVE.folderId) {
    throw new Error("Set DRIVE_FOLDER_ID in .env to your Google Drive folder ID.");
  }
  return DRIVE.folderId;
}

export async function getDriveFolderInfo(auth) {
  const folderId = requireFolderId();
  const drive = google.drive({ version: "v3", auth });
  const response = await drive.files.get({
    fileId: folderId,
    fields: "id, name, mimeType, webViewLink",
  });
  if (response.data.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error("DRIVE_FOLDER_ID does not point to a Google Drive folder.");
  }
  return response.data;
}

function escapeDriveValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function listMatchingNames(drive, folderId, base) {
  const names = [];
  let pageToken;
  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and name contains '${escapeDriveValue(base)}' and trashed = false`,
      pageSize: 1000,
      pageToken,
      fields: "nextPageToken, files(name)",
    });
    names.push(...(response.data.files || []).map((file) => file.name));
    pageToken = response.data.nextPageToken;
  } while (pageToken);
  return names;
}

export async function uploadToDrive(auth, buffer, fileName, mimeType, driveClient = null) {
  const folderId = requireFolderId();
  const drive = driveClient || google.drive({ version: "v3", auth });
  const { base } = splitFileName(fileName);
  const existingNames = await listMatchingNames(drive, folderId, base);
  const name = uniqueDriveFileName(fileName, existingNames);
  const body = typeof buffer === "string" ? fs.createReadStream(buffer) : Readable.from(buffer);
  const response = await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType, body },
    fields: "id, name, mimeType, webViewLink",
  });
  return response.data;
}

export async function listDriveFiles(auth) {
  const folderId = requireFolderId();
  const drive = google.drive({ version: "v3", auth });
  const files = [];
  let pageToken;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: 100,
      pageToken,
      orderBy: "name",
      fields: "nextPageToken, files(id, name, mimeType, webViewLink)",
    });
    files.push(...(response.data.files || []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return files;
}

export async function getDriveQuota(auth) {
  const drive = google.drive({ version: "v3", auth });
  const response = await drive.about.get({ fields: "storageQuota" });
  const quota = response.data.storageQuota;

  const toGb = (bytes) => Number(bytes || 0) / (1024 * 1024 * 1024);
  const used = toGb(quota.usage).toFixed(2);
  const total = toGb(quota.limit).toFixed(2);

  return { used, total, free: (total - used).toFixed(2) };
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

export function formatDriveList(files, type = null) {
  const filteredFiles = filterDriveFiles(files, type);
  if (filteredFiles.length === 0) return "No files found.";

  return filteredFiles
    .map((file) => {
      const link = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
      return `*${file.name}*\n→ ${link}`;
    })
    .join("\n\n");
}
