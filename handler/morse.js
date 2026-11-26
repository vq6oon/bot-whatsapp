import { toMorse, fromMorse } from "../src/utils/morse.js";

export const name = "morse";

export function match(ctx) {
  return ctx.text.startsWith(".morse ") || ctx.text.startsWith(".textmorse ");
}

export async function run({ text, sendText }) {
  if (text.startsWith(".morse ")) {
    const input = text.slice(7).trim();
    if (!input) return sendText("Example: .morse hello");
    const morseCode = toMorse(input);
    return sendText(`┌─ text  : ${input}\n└─ morse : ${morseCode}`);
  }

  const morseCode = text.slice(11).trim();
  if (!morseCode) return sendText("Example: .textmorse .... . .-.. .-.. ---");
  const decodedText = fromMorse(morseCode);
  return sendText(`┌─ morse : ${morseCode}\n└─ text  : ${decodedText}`);
}
