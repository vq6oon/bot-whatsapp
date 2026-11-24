export const name = "binary";

export function match(ctx) {
  return (
    ctx.text.startsWith(".biner ") ||
    ctx.text.startsWith(".textbinary ") ||
    ctx.text.startsWith(".binarytext ")
  );
}

const toBinary = (text) =>
  [...text]
    .map((character) => character.charCodeAt(0).toString(2).padStart(8, "0"))
    .join(" ");

export async function run({ text, sendText }) {
  if (text.startsWith(".biner ")) {
    const input = text.slice(7).trim();
    if (!input) return sendText("· Enter text after .biner");

    const perCharacter = [...input].map(
      (character) => `${character} → ${character.charCodeAt(0).toString(2).padStart(8, "0")}`,
    );

    return sendText(
      `*Text to Binary:*\n${perCharacter.join("\n")}\n\nOutput:\n${toBinary(input)}`,
    );
  }

  if (text.startsWith(".textbinary ")) {
    const input = text.slice(12).trim();
    return sendText(`┌─ text   : ${input}\n└─ binary : ${toBinary(input)}`);
  }

  const input = text.slice(12).trim();
  try {
    const decodedText = input
      .split(" ")
      .map((binary) => String.fromCharCode(parseInt(binary, 2)))
      .join("");
    return sendText(`┌─ binary : ${input}\n└─ text   : ${decodedText}`);
  } catch {
    return sendText("✗ Invalid binary format.");
  }
}
