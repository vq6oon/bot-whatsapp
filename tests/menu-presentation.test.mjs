import assert from "node:assert/strict";
import { run as runMenu } from "../handler/menu.js";
import { run as runDeviceInfo } from "../handler/deviceinfo.js";
import { PATHS } from "../src/config.js";

assert.equal(PATHS.banner, "assets/v2.0.png");
assert.equal(PATHS.deviceBanner, "assets/v2.0.png");

for (const run of [runMenu, runDeviceInfo]) {
  let sent;
  await run({
    from: "15550000001@s.whatsapp.net",
    sock: { sendMessage: async (_from, payload) => { sent = payload; } },
  });
  assert.ok(Buffer.isBuffer(sent.image));
  assert.doesNotMatch(sent.caption, /[\p{Extended_Pictographic}\uFE0F]/u);
}

console.log("menu and device info presentation tests passed");
