export const name = "calculator";

export function match(ctx) {
  return ctx.text.startsWith(".hitung ");
}

export async function run({ text, sendText }) {
  const expression = text.slice(8).trim();
  try {
    // Allow only numbers and operators to prevent code injection.
    if (!/^[0-9+\-*/(). %]+$/.test(expression)) {
      return sendText("✗ Invalid expression. Use numbers and + - * / ( ).");
    }

    const result = Function(`"use strict"; return (${expression})`)();
    await sendText(`Result of *${expression}*: *${result}*`);
  } catch {
    await sendText("✗ Calculation failed. Check the expression.");
  }
}
