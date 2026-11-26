import fs from "fs";
import { BOT_NAME, BOT_VERSION, DEVELOPER, PATHS } from "../src/config.js";

export const name = "menu";

export function match(ctx) {
  return ctx.text === ".menu";
}

export async function run({ sock, from }) {
  const caption = [
    `${BOT_NAME} · ${BOT_VERSION}`,
    "",
    "› Info",
    ".help [command] · help for one command",
    ".info · bot information",
    ".rules · usage rules",
    "",
    "› Download",
    ".yt <url> · youtube video → drive (.help yt)",
    ".ytm <url> · youtube audio → chat (.help ytm)",
    ".anidl <title> · anime → drive (.help anidl)",
    ".tiktok <url> · tiktok media (.help tiktok)",
    "",
    "› Drive",
    ".checkdrive · folder status",
    ".list [type] · list files (.help list)",
    ".upload [name] · upload media",
    "",
    "› Search",
    ".getani <title> · anime search (.help getani)",
    ".scan <url> · url safety check",
    ".shorturl <url> · shorten url",
    "",
    "› Tools",
    ".tts <text> · text to speech",
    ".hitung <expression> · calculator",
    ".morse / .textmorse · morse",
    ".encode64 / .decode64 · base64",
    ".biner / .binarytext · binary",
    ".deviceinfo · device info",
    ".sticker / .s · image → sticker",
    "",
    DEVELOPER,
  ].join("\n");

  return sock.sendMessage(from, {
    image: fs.readFileSync(PATHS.banner),
    caption,
  });
}
