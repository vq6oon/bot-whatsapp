export const name = "checkdrive";

export function match(ctx) {
  return ctx.text === ".checkdrive";
}

export async function run({ sendText }) {
  await sendText("Google Drive: (na) — not integrated yet.");
}
