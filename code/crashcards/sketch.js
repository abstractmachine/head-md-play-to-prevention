// Change this URL to use another publicly readable Google spreadsheet.
const spreadsheetURL = 'https://docs.google.com/spreadsheets/d/1nnhvI_IryI0F6DF96gG0yU4ifF3cyOdEKYWtJw7XUyg/edit';

// Crash Cards — start here.
// support.js loads the spreadsheet and positions the cards.
// deck.js keeps each category's draw pile free of repeats.

let cards = [];
let piles = {};
let players = 1;
let cardTypes = [];
let cardColors = {};
let textColors = {};

const flipDuration = 540; // milliseconds

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('table');
  canvas.elt.setAttribute('aria-hidden', 'true');
  pixelDensity(min(window.devicePixelRatio, 2));
  textFont('Helvetica');

  connectControls();
  loadSheet();
}

function draw() {
  background(128);

  for (const card of cards) {
    drawCard(card);
  }
}

function drawCard(card) {
  let progress = 0;
  let showValue = card.faceUp;

  if (card.flipping) {
    progress = min((millis() - card.flipStarted) / flipDuration, 1);
    // Ease in and out, then swap the visible face halfway through.
    progress = progress * progress * (3 - 2 * progress);
    if (progress >= 0.5) showValue = !card.faceUp;
    if (progress === 1) finishFlip(card);
  }

  push();
  translate(card.x + card.w / 2, card.y + card.h / 2);

  // cos goes from 1 to 0 to -1: full width, edge-on, full width again.
  scale(max(0.001, abs(cos(progress * PI))), 1);
  rectMode(CENTER);
  noStroke();

  fill(0, 26);
  rect(2, 5, card.w, card.h, 12);
  fill(cardColors[card.type]);
  rect(0, 0, card.w, card.h, 12);

  if (card.hover) {
    noFill();
    stroke(textColors[card.type]);
    strokeWeight(1);
    rect(0, 0, card.w - 8, card.h - 8, 9);
    noStroke();
  }

  fill(textColors[card.type]);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);

  if (showValue) {
    let label = card.type;
    if (card.number) label += ' / ' + card.number;
    textSize(10);
    text(label, 0, -card.h / 2 + 22);

    const fontSize = card.type === 'NAME' ? 32 : 23;
    drawFittedText(card.value, card.w - 30, card.h - 100, fontSize);
  } else {
    textSize(min(23, card.w * 0.12));
    text(card.type, 0, 0);

    if (card.number) {
      textStyle(NORMAL);
      textSize(11);
      text('PLAYER ' + card.number, 0, 28);
    }
  }
  pop();
}

function flipCard(card) {
  if (!ready || card.flipping) return;

  // Take a new value only when turning a face-down card over.
  if (!card.faceUp) {
    const value = piles[card.type].draw();
    if (value === null) {
      statusLine().textContent = card.type + ' is empty. Shuffle to start again.';
      return;
    }
    card.value = value;
  }

  card.flipStarted = millis();
  card.flipping = true;
  if (reducedMotion.matches) finishFlip(card);
  updateButtons();
}

function shuffleCards() {
  for (const pile of Object.values(piles)) {
    pile.reset();
  }
  for (const card of cards) {
    card.value = null;
    card.faceUp = false;
    card.flipping = false;
  }
  updateButtons();
}

function windowResized() {
  layoutCards();
}
