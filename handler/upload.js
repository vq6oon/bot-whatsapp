export const name = "upload";

export function match(ctx) {
  return ctx.text.startsWith(".upload");
}

export async function run({ sendText }) {
  await sendText("Google Drive: (na) — not integrated yet.");
}
