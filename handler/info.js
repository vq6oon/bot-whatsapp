import fs from "fs";
import { BOT_NAME, BOT_VERSION, DEVELOPER, GITHUB, PATHS } from "../src/config.js";

export const name = "info";

export function match(ctx) {
  return ctx.text === ".info";
}

export async function run({ sock, from }) {
  return sock.sendMessage(from, {
    image: fs.readFileSync(PATHS.banner),
    caption:
      `📦 *Bot Information:*\n` +
      `├─ Name       : ${BOT_NAME}\n` +
      `├─ Developer  : ${DEVELOPER}\n` +
      `├─ Banner     : Anime Dandadan\n` +
      `├─ Language   : JavaScript (Node.js)\n` +
      `├─ Framework  : Baileys v6\n` +
      `├─ Platform   : WhatsApp Multi-Device\n` +
      `├─ GitHub     : ${GITHUB}\n` +
      `└─ Version    : ${BOT_VERSION}`,
  });
}
