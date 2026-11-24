import fs from "fs";
import { PATHS } from "../src/config.js";

export const name = "rules";

export function match(ctx) {
  return ctx.text === ".rules";
}

export async function run({ sock, from }) {
  return sock.sendMessage(from, {
    image: fs.readFileSync(PATHS.banner),
    caption:
      `*Bot Usage Rules:*\n\n` +
      `1. Do not spam commands.\n` +
      `2. Do not upload:\n` +
      `   - Pornographic content\n` +
      `   - Graphic violence\n` +
      `   - Hate speech or incitement\n` +
      `   - Illegal content (cracks, carding, etc.)\n` +
      `3. Do not use the bot for criminal activity.\n` +
      `4. Do not use the bot for flooding or automated abuse.\n` +
      `5. Use the bot respectfully and responsibly.\n` +
      `6. Users are solely responsible for misuse.\n` +
      `7. The bot may be stopped or restricted at any time without notice.\n` +
      `8. The developer is not responsible for misuse.`,
  });
}
