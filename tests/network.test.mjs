import assert from "node:assert/strict";
import { dispatch } from "../src/router.js";

const sock = { sendMessage: async () => ({ ok: true }) };

function makeCtx(text, extra = {}) {
  const sent = [];
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
    sendText: async (body) => {
      sent.push(String(body));
    },
    ...extra,
  };
  return { ctx, sent };
}

// Drive commands return an unavailable status until integration is ready.
for (const text of [".list", ".list audio", ".checkdrive"]) {
  const { ctx, sent } = makeCtx(text);
  const handled = await dispatch(ctx);
  assert.ok(handled, `${text} must be handled`);
  assert.ok(sent.length > 0, `${text} must return a reply`);
  console.log(`${text} => ${sent[0].split("\n")[0]}`);
}

// .upload responds with the Drive integration status.
const { ctx: uploadCtx } = makeCtx(".upload");
assert.equal(await dispatch(uploadCtx), "upload", ".upload should report Drive status");

// Sticker commands must accept both canonical and short aliases.
for (const command of [".sticker", ".s"]) {
  const { ctx, sent } = makeCtx(command);
  assert.equal(await dispatch(ctx), "sticker", `${command} must dispatch`);
  assert.match(sent[0], /image/i, `${command} must explain missing image`);
}

console.log("all network branches passed");
process.exit(0);
