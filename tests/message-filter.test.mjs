import assert from "node:assert/strict";
import { shouldProcessMessage } from "../src/message-filter.js";

assert.equal(shouldProcessMessage({ key: { fromMe: false, remoteJid: "15550000001@s.whatsapp.net" }, message: { conversation: "hi" } }), true);
assert.equal(shouldProcessMessage({ key: { fromMe: true, remoteJid: "15550000001@s.whatsapp.net" }, message: { conversation: "self echo" } }), false);
assert.equal(shouldProcessMessage({ key: { fromMe: false, remoteJid: "123@channel" }, message: { conversation: "channel" } }), false);
assert.equal(shouldProcessMessage({ key: { fromMe: false, remoteJid: "15550000001@s.whatsapp.net" }, message: null }), false);

console.log("message filter tests passed");
