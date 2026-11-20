import { GAME_TIMEOUT_MS } from "../src/config.js";
import { getRandomAnimal } from "../src/data/animals.js";

export const name = "guess";

// Only one game can run per process.
const state = {
  active: false,
  answer: "",
  hint: "",
  timer: null,
};

export function match(ctx) {
  return ctx.text === ".tebakhewan" || ctx.text.startsWith(".tebak ");
}

function makeHint(answer) {
  return `Hint: starts with *${answer[0]}*, ends with *${answer.slice(-1)}*, ${answer.length} letters long.`;
}

function startGame(sendText) {
  if (state.active) return sendText("❗ A guessing game is already active.");

  const answer = getRandomAnimal();
  state.answer = answer;
  state.hint = makeHint(answer);
  state.active = true;

  sendText(
    `🧠 *Guess the Animal!*\n${state.hint}\n\n` +
      `⏳ Time limit: 60 seconds\n` +
      `Type .tebak followed by your guess`,
  );

  state.timer = setTimeout(() => {
    if (state.active) {
      sendText(`⌛ Time is up! The answer was: *${state.answer}*`);
      state.active = false;
    }
  }, GAME_TIMEOUT_MS);
}

function submitAnswer(text, sendText) {
  if (!state.active) return sendText("❗ No guessing game is active.");

  const guess = text.split(".tebak ")[1].toLowerCase();
  if (guess === state.answer.toLowerCase()) {
    clearTimeout(state.timer);
    state.active = false;
    sendText("✅ *Correct!* The answer is " + state.answer);
  } else {
    sendText("❌ Incorrect! Try again.");
  }
}

export async function run({ text, sendText }) {
  if (text === ".tebakhewan") return startGame(sendText);
  return submitAnswer(text, sendText);
}
