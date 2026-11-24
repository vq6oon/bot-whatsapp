import * as driveService from "../src/services/drive.js";
import { DRIVE } from "../src/config.js";

export const name = "checkdrive";

export function match(ctx) {
  return ctx.text === ".checkdrive";
}

export async function run({ sendText }, drive = driveService) {
  if (!DRIVE.folderId) {
    return sendText("⚠️ Isi DRIVE_FOLDER_ID di .env dengan ID folder Drive.");
  }

  try {
    const auth = await drive.authorize();
    const [folder, files] = await Promise.all([
      drive.getDriveFolderInfo(auth),
      drive.listDriveFiles(auth),
    ]);
    const link = folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`;
    return sendText(
      `Lamp1on-Bot · Google Drive\n\nStatus: tersambung\nFolder: *${folder.name}*\nFile: ${files.length}\n🔗 ${link}`,
    );
  } catch (error) {
    console.error("checkdrive:", error?.message || error);
    return sendText(driveErrorMessage(error));
  }
}

function driveErrorMessage(error) {
  if (error?.message?.includes("DRIVE_FOLDER_ID")) {
    return "⚠️ Isi DRIVE_FOLDER_ID di .env dengan ID folder Drive.";
  }
  if (error?.code === 401 || error?.response?.status === 401) {
    return "❌ Token Google Drive ditolak. Jalankan ulang node get_token.js dan perbarui credentials/token.json.";
  }
  if (error?.code === 403 || error?.response?.status === 403) {
    return "❌ Google menolak akses folder. Scope drive.file hanya mencakup file yang dibuat atau dibuka aplikasi; folder lama perlu izin Drive penuh dan OAuth ulang.";
  }
  if (error?.code === 404 || error?.response?.status === 404) {
    return "❌ Folder tidak ditemukan atau tidak terlihat oleh aplikasi. Pastikan ID folder benar dan ubah scope OAuth ke https://www.googleapis.com/auth/drive, lalu buat token baru.";
  }
  return "❌ Gagal menyambungkan Google Drive. Periksa OAuth credentials, token, dan folder ID.";
}
