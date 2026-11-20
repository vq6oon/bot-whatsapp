export const name = "list";

export function match(ctx) {
  return /^\.list(?:\s|$)/.test(ctx.text);
}

export async function run({ sendText }) {
  await sendText("Google Drive: (na) — not integrated yet.");
}
