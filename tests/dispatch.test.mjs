import assert from "node:assert/strict";
import { dispatch } from "../src/router.js";

let mediaSent = [];
const sock = {
  sendMessage: async (from, payload) => {
    mediaSent.push(payload);
    return { ok: true };
  },
};

function makeCtx(text) {
  const texts = [];
  mediaSent = [];
  const ctx = {
    sock,
    msg: {
      message: { conversation: text },
      key: { remoteJid: "15550000001@s.whatsapp.net" },
    },
    from: "15550000001@s.whatsapp.net",
    sender: "15550000001@s.whatsapp.net",
    text,
    time: "00:00:00",
    quoted: undefined,
    quotedContext: undefined,
    sendText: async (body) => {
      texts.push(String(body));
    },
  };
  return { ctx, out: () => texts.concat(mediaSent.map((m) => m.caption || m.text || "[media]")) };
}

const cases = [
  [".menu", "menu"],
  [".info", "info"],
  [".rules", "rules"],
  [".deviceinfo", "deviceinfo"],
  [".hitung 2+3*4", "calculator"],
  [".morse hello world", "morse"],
  [".textmorse .... . .-.. .-.. ---", "morse"],
  [".encode64 halo", "encode"],
  [".decode64 aGFsbw==", "encode"],
  [".biner hi", "binary"],
  [".textbinary hi", "binary"],
  [".binarytext 01101000 01101001", "binary"],
  [".tebakhewan", "guess"],
  [".tebak wrong", "guess"],
];

let failed = 0;

for (const [text, expected] of cases) {
  const { ctx, out } = makeCtx(text);
  const handled = await dispatch(ctx);
  const replies = out();
  const ok = handled === expected && replies.length > 0;
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${text} => ${handled} (${replies.length} replies)`);
}

const { ctx: unknownCtx } = makeCtx(".unknowncommand");
assert.equal(await dispatch(unknownCtx), null, "unknown commands must be ignored");

const { ctx: hitungCtx, out: hitungOut } = makeCtx(".hitung 2+3*4");
await dispatch(hitungCtx);
assert.match(hitungOut()[0], /14/, "calculator result is incorrect");

const { ctx: morseCtx, out: morseOut } = makeCtx(".textmorse .... . .-.. .-.. ---");
await dispatch(morseCtx);
assert.match(morseOut()[0], /hello/, "Morse decoding is incorrect");

assert.equal(failed, 0, `${failed} cases failed`);
console.log("all dispatch cases passed");
process.exit(0);
