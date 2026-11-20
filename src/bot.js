import bailey from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import P from "pino";
import fs from "fs";
import { PATHS } from "./config.js";
import { logLine, logToFile, timeNow } from "./logger.js";
import { dispatch } from "./router.js";

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = bailey;

// Set WA_PAIR_NUMBER to the bot number to log in without a QR code.
function maybeRequestPairingCode(sock) {
  if (!process.env.WA_PAIR_NUMBER) return;

  setTimeout(async () => {
    try {
      const num = String(process.env.WA_PAIR_NUMBER).replace(/[^0-9]/g, "");
      const code = await sock.requestPairingCode(num);
      console.log("Pairing code for +" + num + ": " + code);
      logToFile(`[${new Date().toISOString()}] pairing ${num} => ${code}`);
    } catch (e) {
      console.error("pairing code failed:", e?.message || e);
    }
  }, 3000);
}

function watchConnection(sock, restart) {
  let connectedOnce = false;

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) qrcode.generate(qr, { small: true });

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) restart();
      connectedOnce = false;
    }

    if (connection === "open" && !connectedOnce) {
      console.log("Connected to WhatsApp");
      connectedOnce = true;
    }
  });
}

function readMessage(msg) {
  const from = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const text =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    msg.message.videoMessage?.caption ||
    "";

  const quotedContext = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = quotedContext?.quotedMessage;

  return { from, sender, text, quoted, quotedContext };
}

async function onMessage(sock, msg) {
  if (!msg.message) return;
  if (msg.key.remoteJid?.endsWith("@channel")) return;

  const time = timeNow();
  const { from, sender, text, quoted, quotedContext } = readMessage(msg);

  logLine(`[${time}] ${sender} ➜ ${text}`);

  const sendText = async (body) => {
    logLine(`[${time}] Bot ➜ ${body}`);
    return sock.sendMessage(from, { text: body });
  };

  await dispatch({
    sock,
    msg,
    from,
    sender,
    text,
    time,
    quoted,
    quotedContext,
    sendText,
  });
}

export async function startBot() {
  fs.mkdirSync(PATHS.downloads, { recursive: true });
  fs.mkdirSync(PATHS.logs, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(PATHS.auth);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveCreds);
  maybeRequestPairingCode(sock);
  watchConnection(sock, startBot);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    try {
      await onMessage(sock, msg);
    } catch (e) {
      console.error("[handler]", e);
      logToFile(`[${new Date().toISOString()}] error: ${e?.message || e}`);
    }
  });
}
