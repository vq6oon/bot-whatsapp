const ANIMALS = [
  "cat", "dog", "rabbit", "mouse", "squirrel", "monkey", "elephant", "tiger", "lion", "wolf",
  "bear", "horse", "cow", "goat", "sheep", "pig", "deer", "giraffe", "zebra", "rhinoceros",
  "kangaroo", "koala", "panda", "fox", "hedgehog", "pangolin", "armadillo", "slow loris", "meerkat", "guinea pig",
  "fish", "shark", "whale", "dolphin", "jellyfish", "octopus", "squid", "shrimp", "crab", "lobster",
  "clam", "starfish", "turtle", "crocodile", "snail", "goldfish", "chicken", "duck", "goose", "pigeon",
  "eagle", "parrot", "canary", "quail", "flamingo", "pelican", "heron", "ant", "bee", "butterfly",
  "dragonfly", "grasshopper", "cricket", "mosquito", "fly", "spider", "scorpion", "beetle", "cockroach", "cicada",
  "snake", "lizard", "chameleon", "iguana", "frog", "toad", "salamander", "bat", "leech", "worm",
  "platypus", "echidna",
];

export function getRandomAnimal() {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
}
