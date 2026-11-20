const MORSE_MAP = {
  a: ".-",
  b: "-...",
  c: "-.-.",
  d: "-..",
  e: ".",
  f: "..-.",
  g: "--.",
  h: "....",
  i: "..",
  j: ".---",
  k: "-.-",
  l: ".-..",
  m: "--",
  n: "-.",
  o: "---",
  p: ".--.",
  q: "--.-",
  r: ".-.",
  s: "...",
  t: "-",
  u: "..-",
  v: "...-",
  w: ".--",
  x: "-..-",
  y: "-.--",
  z: "--..",
  0: "-----",
  1: ".----",
  2: "..---",
  3: "...--",
  4: "....-",
  5: ".....",
  6: "-....",
  7: "--...",
  8: "---..",
  9: "----.",
};

const REVERSE_MAP = Object.fromEntries(
  Object.entries(MORSE_MAP).map(([char, code]) => [code, char]),
);

export function toMorse(text) {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) =>
      word
        .split("")
        .map((char) => MORSE_MAP[char] || "")
        .join(" "),
    )
    .join(" / ");
}

export function fromMorse(code) {
  return code
    .trim()
    .split(" / ")
    .map((word) =>
      word
        .trim()
        .split(" ")
        .map((symbol) => REVERSE_MAP[symbol] || "")
        .join(""),
    )
    .join(" ");
}
