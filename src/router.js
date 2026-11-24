import * as menu from "../handler/menu.js";
import * as info from "../handler/info.js";
import * as rules from "../handler/rules.js";
import * as checkdrive from "../handler/checkdrive.js";
import * as tts from "../handler/tts.js";
import * as scan from "../handler/scan.js";
import * as tiktok from "../handler/tiktok.js";
import * as yt from "../handler/yt.js";
import * as ytm from "../handler/ytm.js";
import * as hitung from "../handler/hitung.js";
import * as getani from "../handler/getani.js";
import * as anidl from "../handler/anidl.js";
import * as shorturl from "../handler/shorturl.js";
import * as deviceinfo from "../handler/deviceinfo.js";
import * as tebak from "../handler/tebak.js";
import * as morse from "../handler/morse.js";
import * as encode from "../handler/encode.js";
import * as binary from "../handler/binary.js";
import * as upload from "../handler/upload.js";
import * as list from "../handler/list.js";
import * as sticker from "../handler/sticker.js";

// Handler order determines command matching priority.
const HANDLERS = [
  menu,
  info,
  rules,
  checkdrive,
  tts,
  scan,
  tiktok,
  yt,
  ytm,
  hitung,
  getani,
  anidl,
  shorturl,
  deviceinfo,
  tebak,
  morse,
  encode,
  binary,
  upload,
  list,
  sticker,
];

// Run the first matching handler. Each message triggers one command.
export async function dispatch(ctx) {
  for (const handler of HANDLERS) {
    if (!handler.match(ctx)) continue;
    await handler.run(ctx);
    return handler.name;
  }
  return null;
}
