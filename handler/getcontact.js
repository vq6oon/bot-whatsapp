import { jidDecode } from "@whiskeysockets/baileys";

export const name = "getcontact";

export function match({ text }) {
  return text === ".getcontact" || text === ".gc";
}

export async function run({ sock, from, sender, msg, sendText }) {
  const decodedSender = jidDecode(sender);
  const phoneNumber = decodedSender?.user;
  if (
    decodedSender?.server !== "s.whatsapp.net" ||
    !phoneNumber ||
    !/^\d+$/.test(phoneNumber)
  ) {
    return sendText("Tidak bisa membaca nomor kontak dari chat ini.");
  }

  const displayName = msg.pushName || phoneNumber;
  const formattedNumber = phoneNumber.startsWith("0")
    ? `62${phoneNumber.slice(1)}`
    : phoneNumber;
  const vcard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${displayName}`,
    `TEL;type=CELL;type=VOICE;waid=${formattedNumber}:+${formattedNumber}`,
    "END:VCARD",
  ].join("\n");

  return sock.sendMessage(from, {
    contacts: {
      displayName,
      contacts: [{ displayName, vcard }],
    },
  });
}
