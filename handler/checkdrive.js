import * as driveService from "../src/services/drive.js";
import { DRIVE } from "../src/config.js";

export const name = "checkdrive";

export function match(ctx) {
  return ctx.text === ".checkdrive";
}

export async function run({ sendText }, drive = driveService) {
  if (!DRIVE.folderId) {
    return sendText("! Set DRIVE_FOLDER_ID in .env to your Google Drive folder ID.");
  }

  try {
    const auth = await drive.authorize();
    const [folder, files] = await Promise.all([
      drive.getDriveFolderInfo(auth),
      drive.listDriveFiles(auth),
    ]);
    const link = folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`;
    return sendText(
      `Lamp1on-Bot · Google Drive\n\nStatus: connected\nFolder: *${folder.name}*\nFiles: ${files.length}\n→ ${link}`,
    );
  } catch (error) {
    console.error("checkdrive:", error?.message || error);
    return sendText(driveErrorMessage(error));
  }
}

function driveErrorMessage(error) {
  if (error?.message?.includes("DRIVE_FOLDER_ID")) {
    return "! Set DRIVE_FOLDER_ID in .env to your Google Drive folder ID.";
  }
  if (error?.code === 401 || error?.response?.status === 401) {
    return "✗ Google Drive token rejected. Re-run node get_token.js and update credentials/token.json.";
  }
  if (error?.code === 403 || error?.response?.status === 403) {
    return "✗ Google denied folder access. The drive.file scope only covers files created or opened by the app; older folders need full Drive access and a new OAuth token.";
  }
  if (error?.code === 404 || error?.response?.status === 404) {
    return "✗ Folder not found or not visible to the app. Check the folder ID, switch the OAuth scope to https://www.googleapis.com/auth/drive, and create a new token.";
  }
  return "✗ Failed to connect to Google Drive. Check the OAuth credentials, token, and folder ID.";
}
