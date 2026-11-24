import { DRIVE } from "../src/config.js";
import * as driveService from "../src/services/drive.js";

export const name = "list";

export function match(ctx) {
  return /^\.list(?:\s|$)/.test(ctx.text);
}

export async function run({ text, sendText }, drive = driveService) {
  if (!DRIVE.folderId) {
    return sendText("! Set DRIVE_FOLDER_ID in .env to your Google Drive folder ID.");
  }

  const type = text.trim().split(/\s+/)[1]?.toLowerCase() || null;
  const supportedTypes = ["audio", "video", "document", "photo"];
  if (type && !supportedTypes.includes(type)) {
    return sendText("Format: .list [audio|video|document|photo]");
  }

  await sendText("· Reading Google Drive...");

  try {
    const auth = await drive.authorize();
    const files = await drive.listDriveFiles(auth);
    return sendText(`Google Drive · ${files.length} file${files.length === 1 ? "" : "s"}\n\n${drive.formatDriveList(files, type)}`);
  } catch (error) {
    console.error("list:", error?.message || error);
    if (error?.code === 401 || error?.response?.status === 401) {
      return sendText("✗ Google Drive token rejected. Re-run node get_token.js and update credentials/token.json.");
    }
    if (error?.code === 403 || error?.response?.status === 403) {
      return sendText("✗ Google denied folder access. The drive.file scope only covers files created or opened by the app; older folders need full Drive access and a new OAuth token.");
    }
    if (error?.code === 404 || error?.response?.status === 404) {
      return sendText("✗ Folder not found or not visible to the app. Check DRIVE_FOLDER_ID and the OAuth scope.");
    }
    return sendText("✗ Failed to read the Google Drive folder. Check the OAuth credentials, token, and folder ID.");
  }
}
