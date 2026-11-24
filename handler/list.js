import { DRIVE } from "../src/config.js";
import * as driveService from "../src/services/drive.js";

export const name = "list";

export function match(ctx) {
  return /^\.list(?:\s|$)/.test(ctx.text);
}

export async function run({ text, sendText }, drive = driveService) {
  if (!DRIVE.folderId) {
    return sendText("⚠️ Isi DRIVE_FOLDER_ID di .env dengan ID folder Drive.");
  }

  const type = text.trim().split(/\s+/)[1]?.toLowerCase() || null;
  const supportedTypes = ["audio", "video", "document", "photo"];
  if (type && !supportedTypes.includes(type)) {
    return sendText("Format: .list [audio|video|document|photo]");
  }

  try {
    const auth = await drive.authorize();
    const files = await drive.listDriveFiles(auth);
    return sendText(`Google Drive · ${files.length} file\n\n${drive.formatDriveList(files, type)}`);
  } catch (error) {
    console.error("list:", error?.message || error);
    if (error?.code === 401 || error?.response?.status === 401) {
      return sendText("❌ Token Google Drive ditolak. Jalankan ulang node get_token.js dan perbarui credentials/token.json.");
    }
    if (error?.code === 403 || error?.response?.status === 403) {
      return sendText("❌ Google menolak akses folder. Scope drive.file hanya mencakup file yang dibuat atau dibuka aplikasi; folder lama perlu izin Drive penuh dan OAuth ulang.");
    }
    if (error?.code === 404 || error?.response?.status === 404) {
      return sendText("❌ Folder tidak ditemukan atau tidak terlihat oleh aplikasi. Periksa DRIVE_FOLDER_ID dan scope OAuth.");
    }
    return sendText("❌ Gagal membaca folder Google Drive. Periksa OAuth credentials, token, dan folder ID.");
  }
}
