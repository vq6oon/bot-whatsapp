export function shouldProcessMessage(msg) {
  if (!msg?.message) return false;
  if (msg.key?.fromMe) return false;
  if (msg.key?.remoteJid?.endsWith("@channel")) return false;
  return true;
}
