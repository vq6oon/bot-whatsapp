import P from "pino";
import bailey from "@whiskeysockets/baileys";

const { downloadMediaMessage } = bailey;
const silentLogger = P({ level: "silent" });

// Download media quoted by the user, such as an image or document.
export function downloadQuotedBuffer(quotedMessage, quotedContext) {
  return downloadMediaMessage(
    { message: quotedMessage, key: quotedContext?.stanzaId },
    "buffer",
    {},
    { logger: silentLogger },
  );
}

// Download media sent directly by the user.
export function downloadOwnBuffer(msg) {
  return downloadMediaMessage(msg, "buffer", {}, { logger: silentLogger });
}
