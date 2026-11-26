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
      `*Bot rules:*\n\n` +
      `1. No spam.\n` +
      `2. No uploads of porn, gore, hate speech, illegal material (cracks, carding), or anything criminal.\n` +
      `3. No flooding or automated abuse.\n` +
      `4. The bot can be stopped or restricted at any time without notice.\n` +
      `5. Misuse is the user's responsibility.`,
  });
}
