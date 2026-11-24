export const name = "encode";

export function match(ctx) {
  return ctx.text.startsWith(".encode64 ") || ctx.text.startsWith(".decode64 ");
}

export async function run({ text, sendText }) {
  if (text.startsWith(".encode64 ")) {
    const input = text.slice(10).trim();
    if (!input) return sendText("· Example: .encode64 hello world");
    const base64 = Buffer.from(input).toString("base64");
    return sendText(`┌─ text    : ${input}\n└─ base64  : ${base64}`);
  }

  const input = text.slice(10).trim();
  try {
    const decodedText = Buffer.from(input, "base64").toString("utf-8");
    return sendText(`┌─ base64  : ${input}\n└─ text    : ${decodedText}`);
  } catch {
    return sendText("✗ Invalid Base64 format.");
  }
}
