/*
  Poké Guess 1–50 - fully client-side game
  UX goals: simple, colorful, child-friendly, clear feedback
*/

const GAME_MIN_NUMBER = 1;
const GAME_MAX_NUMBER = 256;

/** @typedef {{ targetNumber:number, guessCount:number, isGameOver:boolean, numberToButton: Map<number, HTMLButtonElement>, currentMax:number }} GameState */

/** @type {GameState} */
const state = {
  targetNumber: 0,
  guessCount: 0,
  isGameOver: false,
  numberToButton: new Map(),
  currentMax: GAME_MAX_NUMBER,
};

const gridEl = document.getElementById("grid");
const hintEl = document.getElementById("hint");
const counterEl = document.getElementById("counter");
const newGameBtn = document.getElementById("newGameBtn");
const playAgainBtn = document.getElementById("playAgainBtn");
const winOverlay = document.getElementById("winOverlay");
const confettiEl = document.getElementById("confetti");
const charizardEl = document.getElementById("charizard");
const maxSlider = document.getElementById("maxSlider");
const maxValueEl = document.getElementById("maxValue");

document.addEventListener("DOMContentLoaded", () => {
  // Reflect dynamic max in document title and grid aria-label
  try {
    document.title = `Poké Guess 1–${state.currentMax}`;
    const grid = document.getElementById("grid");
    if (grid) grid.setAttribute("aria-label", `Number choices from ${GAME_MIN_NUMBER} to ${state.currentMax}`);
    if (maxSlider && maxValueEl) {
      maxSlider.value = String(state.currentMax);
      maxValueEl.textContent = String(state.currentMax);
    }
  } catch (_) {}
  initializeGame();
});

newGameBtn.addEventListener("click", () => resetGame());
playAgainBtn.addEventListener("click", () => resetGame());
if (maxSlider) {
  maxSlider.addEventListener("input", () => {
    if (state.guessCount !== 0) return; // only before first guess
    const raw = parseInt(maxSlider.value, 10);
    const nextMax = clamp(isNaN(raw) ? GAME_MAX_NUMBER : raw, 10, 1024);
    state.currentMax = nextMax;
    if (maxValueEl) maxValueEl.textContent = String(nextMax);
    document.title = `Poké Guess 1–${state.currentMax}`;
    const grid = document.getElementById("grid");
    if (grid) grid.setAttribute("aria-label", `Number choices from ${GAME_MIN_NUMBER} to ${state.currentMax}`);
    initializeGame();
  });
}

function initializeGame() {
  state.targetNumber = randomIntInclusive(GAME_MIN_NUMBER, state.currentMax);
  state.guessCount = 0;
  state.isGameOver = false;
  state.numberToButton.clear();

  renderNumberGrid();
  setHint(`Pick a number between ${GAME_MIN_NUMBER} and ${state.currentMax}!`, "start");
  updateCounter();
  winOverlay.hidden = true;
  clearConfetti();
  hideCharizard();
  if (maxSlider) maxSlider.disabled = false;
}

function resetGame() {
  initializeGame();
}

function renderNumberGrid() {
  gridEl.innerHTML = "";
  for (let n = GAME_MIN_NUMBER; n <= state.currentMax; n += 1) {
    const btn = document.createElement("button");
    btn.className = "numbtn";
    btn.type = "button";
    btn.textContent = String(n);
    btn.setAttribute("aria-label", `Guess number ${n}`);
    btn.dataset.number = String(n);

    // Fun rainbow color per number
    const hue = (n * 13) % 360;
    btn.style.background = `linear-gradient(180deg, hsl(${hue} 90% 60%), hsl(${hue} 85% 52%))`;

    btn.addEventListener("click", () => handleGuess(n));
    state.numberToButton.set(n, btn);
    gridEl.appendChild(btn);
  }
}

/**
 * Handles a player's guess.
 * @param {number} selectedNumber
 */
function handleGuess(selectedNumber) {
  if (state.isGameOver) return;
  const btn = state.numberToButton.get(selectedNumber);
  if (!btn || btn.disabled) return;

  state.guessCount += 1;
  if (maxSlider) maxSlider.disabled = true; // lock slider after first guess
  updateCounter();

  if (selectedNumber === state.targetNumber) {
    setHint(`You got it! ${selectedNumber} is correct!`, "win");
    celebrateWin(selectedNumber);
    return;
  }

  if (selectedNumber < state.targetNumber) {
    setHint("Higher! ⬆️", "higher");
    grayOutRange(GAME_MIN_NUMBER, selectedNumber);
  } else {
    setHint("Lower! ⬇️", "lower");
    grayOutRange(selectedNumber, state.currentMax);
  }
}

function grayOutRange(startInclusive, endInclusive) {
  const start = Math.min(startInclusive, endInclusive);
  const end = Math.max(startInclusive, endInclusive);
  for (let n = start; n <= end; n += 1) {
    const b = state.numberToButton.get(n);
    if (b) {
      b.classList.add("out");
      b.disabled = true;
      b.setAttribute("aria-disabled", "true");
    }
  }
}

function setHint(text, type) {
  hintEl.textContent = text;
  hintEl.classList.remove("hint--higher", "hint--lower", "hint--win");
  if (type === "higher") hintEl.classList.add("hint--higher");
  if (type === "lower") hintEl.classList.add("hint--lower");
  if (type === "win") hintEl.classList.add("hint--win");
}

function updateCounter() {
  counterEl.textContent = `Guesses: ${state.guessCount}`;
}

function celebrateWin(correctNumber) {
  state.isGameOver = true;

  // Gray out all incorrect numbers, highlight the winner
  for (let n = GAME_MIN_NUMBER; n <= state.currentMax; n += 1) {
    const b = state.numberToButton.get(n);
    if (!b) continue;
    if (n === correctNumber) {
      b.classList.add("correct");
      b.disabled = true;
      b.setAttribute("aria-disabled", "true");
    } else {
      b.classList.add("out");
      b.disabled = true;
      b.setAttribute("aria-disabled", "true");
    }
  }

  launchConfetti();
  winOverlay.querySelector(".overlay__title").textContent = `You got it!`;
  const guessWord = state.guessCount === 1 ? "guess" : "guesses";
  winOverlay.querySelector(".overlay__text").textContent = `The number was ${correctNumber}. You did it in ${state.guessCount} ${guessWord}!`;
  winOverlay.hidden = false;
  flyCharizard();
}

function randomIntInclusive(min, max) {
  const mn = Math.ceil(min);
  const mx = Math.floor(max);
  return Math.floor(Math.random() * (mx - mn + 1)) + mn;
}

function launchConfetti() {
  clearConfetti();
  const colors = ["#ff2f48", "#ff9f0a", "#ffcc00", "#34c759", "#007aff", "#af52de"];
  const pieceCount = 120;
  const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

  for (let i = 0; i < pieceCount; i += 1) {
    const piece = document.createElement("div");
    piece.className = "confetti__piece";
    piece.style.left = `${Math.random() * vw}px`;
    piece.style.background = colors[i % colors.length];
    const size = 8 + Math.random() * 10;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 1.3}px`;
    piece.style.animationDelay = `${Math.random() * 0.7}s`;
    piece.style.animationDuration = `${2 + Math.random() * 1.8}s`;
    confettiEl.appendChild(piece);
  }

  // Auto clear after a short while
  window.setTimeout(clearConfetti, 4200);
}

function clearConfetti() {
  while (confettiEl.firstChild) confettiEl.removeChild(confettiEl.firstChild);
}

function flyCharizard() {
  if (!charizardEl) return;
  charizardEl.hidden = false;
  // Run a quick fly-by then an aggressive multi-directional rampage
  charizardEl.style.animation = "charizard-fly 1200ms ease-in 1, charizard-rampage 2400ms ease-in-out 1 1100ms";
  window.setTimeout(() => {
    hideCharizard();
  }, 3600);
}

function hideCharizard() {
  if (!charizardEl) return;
  charizardEl.style.animation = "none";
  charizardEl.hidden = true;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}


