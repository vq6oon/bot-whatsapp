import assert from "node:assert/strict";
import { searchAnime } from "../src/services/anime.js";

let requestedUrl;
const expectedAnime = { title: "Dandadan", mal_id: 57334 };
const fetchMock = async (url) => {
  requestedUrl = String(url);
  return { ok: true, json: async () => ({ data: [expectedAnime] }) };
};

const result = await searchAnime("dandadan", fetchMock);
assert.equal(new URL(requestedUrl).origin, "https://api.tenrai.org");
assert.equal(new URL(requestedUrl).pathname, "/v1/anime");
assert.equal(new URL(requestedUrl).searchParams.get("q"), "dandadan");
assert.equal(new URL(requestedUrl).searchParams.get("limit"), "1");
assert.equal(result, expectedAnime);

console.log("anime API test passed");

// The formatted anime caption must contain actual line breaks.
const { run } = await import("../handler/anime.js");
let sentPayload;
await run({
  text: ".anime dandadan",
  from: "test@s.whatsapp.net",
  sock: { sendMessage: async (_from, payload) => { sentPayload = payload; } },
  sendText: async (text) => { sentPayload = { text }; },
});
assert.ok(sentPayload.caption.includes("\n"), "caption must contain actual newlines");
assert.ok(!sentPayload.caption.includes("\\n"), "caption must not contain literal \n sequences");
