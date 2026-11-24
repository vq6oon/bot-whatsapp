export const BOT_NAME = "Kamui-Bot";
export const BOT_VERSION = "v3.0.0";
export const DEVELOPER = "@vq6oon";
export const GITHUB = "github.com/vq6oon";

export const PATHS = {
  assets: "assets",
  data: "./data",
  downloads: "./data/downloads",
  logs: "./data/logs",
  auth: "./data/auth_info",
  banner: "assets/kamui-bot.png",
  deviceBanner: "assets/kamui-bot.png",
};

export const DRIVE = {
  folderId: process.env.DRIVE_FOLDER_ID || "",
  scopes: ["https://www.googleapis.com/auth/drive"],
  tokenPath: "credentials/token.json",
  credentialsPath: "credentials/credentials.json",
};

export const GAME_TIMEOUT_MS = 60_000;
