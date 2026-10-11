// Support for the sketch: browser controls, layout, text fitting, and sheet loading.
// Students can start with sketch.js and explore these functions later.
let workbook = null;
let activeTab = 'Shared Concern';
const tabPiles = new Map();
let loading = false;
let ready = false;
let observer;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const statusLine = () => document.querySelector('#status');

function connectControls() {
  const playerButtons = document.querySelectorAll('[data-players]');
  for (const button of playerButtons) {
    button.addEventListener('click', () => {
      players = Number(button.dataset.players);
      for (const other of playerButtons) {
        other.setAttribute('aria-pressed', String(other === button));
      }
      buildCards();
    });
  }
  document.querySelector('#shuffle').addEventListener('click', shuffleCards);
  document.querySelector('#sheet-select').addEventListener('change', event => {
    selectTab(event.target.value);
  });
  observer = new ResizeObserver(layoutCards);
  observer.observe(document.querySelector('header'));
}

function finishFlip(card) {
  card.faceUp = !card.faceUp;
  card.flipping = false;
  document.querySelector('#announcement').textContent = card.faceUp
    ? `${card.type}: ${card.value}`
    : `${card.type} face down`;
  updateButtons();
}

function buildCards() {
  const previousCards = cards;
  cards = [];
  const controls = document.querySelector('#controls');
  controls.replaceChildren();

  for (const type of cardTypes) {
    const count = type === 'NAME' ? players : 1;
    for (let i = 0; i < count; i++) {
      const id = type + i;
      let card = previousCards.find(previous => previous.id === id);
      if (!card) {
        card = {
          id: id,
          type: type,
          number: type === 'NAME' ? i + 1 : null,
          value: null,
          faceUp: false,
          flipping: false
        };
      }

      // Transparent buttons let the canvas work with mouse, touch, and keyboard.
      const button = document.createElement('button');
      button.className = 'card-control';
      button.addEventListener('click', () => flipCard(card));
      button.addEventListener('pointerenter', () => { card.hover = true; });
      button.addEventListener('pointerleave', () => { card.hover = false; });
      card.button = button;
      controls.append(button);
      cards.push(card);
    }
  }
  updateButtons();
  layoutCards();
}

function layoutCards() {
  const canvasWidth = document.documentElement.clientWidth;
  const headerHeight = document.querySelector('header').offsetHeight;
  const availableHeight = Math.max(340, window.innerHeight - headerHeight);
  const gap = 18;
  const padding = 26;
  const aspectRatio = 0.7;

  if (!cards.length) {
    resizeCanvas(canvasWidth, availableHeight);
    return;
  }

  // Try each grid width and keep the one that makes the cards largest.
  let columns = 1;
  let cardWidth = 0;
  for (let count = 1; count <= cards.length; count++) {
    const rows = Math.ceil(cards.length / count);
    const horizontalSpace = (canvasWidth - padding * 2 - gap * (count - 1)) / count;
    const verticalSpace = (availableHeight - padding * 2 - gap * (rows - 1)) / rows;
    const size = Math.min(220, horizontalSpace, verticalSpace * aspectRatio);
    if (size > cardWidth) {
      columns = count;
      cardWidth = size;
    }
  }

  // On small screens, scroll instead of shrinking the cards too far.
  if (cardWidth < 132) {
    columns = Math.max(1, Math.floor((canvasWidth - padding * 2 + gap) / (132 + gap)));
    cardWidth = Math.min(180, (canvasWidth - padding * 2 - gap * (columns - 1)) / columns);
  }
  const rows = Math.ceil(cards.length / columns);
  const cardHeight = cardWidth / aspectRatio;
  const gridHeight = rows * cardHeight + (rows - 1) * gap;
  resizeCanvas(canvasWidth, Math.max(availableHeight, gridHeight + padding * 2));

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const row = Math.floor(i / columns);
    const column = i % columns;
    const rowCount = Math.min(columns, cards.length - row * columns);
    const rowWidth = rowCount * cardWidth + (rowCount - 1) * gap;

    card.w = cardWidth;
    card.h = cardHeight;
    card.x = (width - rowWidth) / 2 + column * (cardWidth + gap);
    card.y = (height - gridHeight) / 2 + row * (cardHeight + gap);
    card.button.style.left = card.x + 'px';
    card.button.style.top = card.y + 'px';
    card.button.style.width = card.w + 'px';
    card.button.style.height = card.h + 'px';
  }
}

function updateButtons() {
  cards.forEach(c => {
    const label = c.type + (c.number ? `, player ${c.number}` : '');
    c.button.disabled = !ready || c.flipping;
    c.button.setAttribute('aria-label', c.faceUp ? `${label}: ${c.value}. Turn face down.` : `${label}. Draw next card.`);
  });
}

// Try smaller text sizes until all the wrapped lines fit on the card.
function drawFittedText(value, maxWidth, maxHeight, maxSize) {
  let lines = [];
  let size = maxSize;
  for (; size >= 9; size--) {
    textSize(size);
    const words = value.split(/\s+/);
    if (size > 9 && words.some(word => textWidth(word) > maxWidth)) continue;
    lines = wrapText(value, maxWidth);
    if (lines.length * size * 1.2 <= maxHeight) break;
  }
  const spacing = size * 1.2;
  for (let i = 0; i < lines.length; i++) {
    text(lines[i], 0, (i - (lines.length - 1) / 2) * spacing);
  }
}

function wrapText(value, maxWidth) {
  const lines = [];
  for (const paragraph of value.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (textWidth(word) > maxWidth) {
        if (line) lines.push(line);
        line = '';
        for (const letter of word) {
          if (textWidth(line + letter) > maxWidth) {
            lines.push(line);
            line = '';
          }
          line += letter;
        }
      } else if (line && textWidth(line + ' ' + word) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line += (line ? ' ' : '') + word;
      }
    }
    lines.push(line);
  }
  return lines;
}

function selectTab(name) {
  const tab = workbook.tabs.find(t => t.name === name);
  if (!tab) return;
  activeTab = name;
  cardTypes = tab.columns.map(c => c.type);
  cardColors = Object.fromEntries(tab.columns.map(c => [c.type,c.background]));
  textColors = Object.fromEntries(tab.columns.map(c => [c.type,c.foreground]));
  piles = tabPiles.get(name) || {};
  for (const column of tab.columns) {
    if (!piles[column.type]) {
      piles[column.type] = new DrawPile(column.values);
    }
  }
  tabPiles.set(name,piles);
  cards = [];
  ready = true;
  buildCards();
  document.title = `Crash Cards — ${name}`;
  document.querySelector('#sheet-select').value = name;
  statusLine().textContent = `${name} loaded.`;
}

async function loadSheet() {
  if (loading) return;
  loading = true;
  const selector = document.querySelector('#sheet-select');
  selector.disabled = true;
  try {
    const fresh = await readSpreadsheet();
    if (!fresh.tabs?.length) throw new Error('No tabs found');
    workbook = fresh;
    selector.replaceChildren(...workbook.tabs.map(tab => {
      const option = new Option(tab.name, tab.name);
      return option;
    }));
    selectTab(workbook.tabs.some(t => t.name === activeTab) ? activeTab : workbook.tabs[0].name);
  } catch (error) {
    statusLine().textContent = 'Could not load the spreadsheet. Refresh the page to retry.';
    selector.replaceChildren(new Option('Unable to load', ''));
    selector.title = statusLine().textContent;
    console.error(error);
  } finally {
    loading = false;
    selector.disabled = !workbook;
  }
}

// Google exports XLSX (a ZIP of XML files), which includes values AND colors.
// This runs entirely in the browser: no Python server or API key.

async function readSpreadsheet() {
  const match = spreadsheetURL.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error('Check spreadsheetURL at the top of sketch.js.');
  const spreadsheetId = match[1];
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
  const response = await fetch(url, {
    credentials: 'omit',
    cache: 'no-store',
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error('Spreadsheet unavailable');
  const bytes = new Uint8Array(await response.arrayBuffer());
  const files = fflate.unzipSync(bytes);
  const xml = path => new DOMParser().parseFromString(
    fflate.strFromU8(files[path]), 'application/xml'
  );
  const elements = (parent, tag) => [...parent.getElementsByTagNameNS('*', tag)];
  const first = (parent, tag) => elements(parent, tag)[0];
  const text = (parent, tag) => first(parent, tag)?.textContent || '';

  const styles = xml('xl/styles.xml');
  const fonts = [...first(styles, 'fonts').children];
  const fills = [...first(styles, 'fills').children];
  const formats = [...first(styles, 'cellXfs').children];
  const theme = first(xml('xl/theme/theme1.xml'), 'clrScheme');
  const themeOrder = ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2',
    'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];

  function readColor(element, fallback) {
    if (!element) return fallback;
    let rgb = element.getAttribute('rgb');
    if (element.hasAttribute('theme')) {
      const name = themeOrder[Number(element.getAttribute('theme'))];
      const color = first(theme, name).firstElementChild;
      rgb = color.getAttribute('val') || color.getAttribute('lastClr');
    }
    if (!rgb) return fallback;
    return '#' + rgb.slice(-6);
  }

  let strings = [];
  if (files['xl/sharedStrings.xml']) {
    strings = elements(xml('xl/sharedStrings.xml'), 'si').map(item =>
      elements(item, 't').map(part => part.textContent).join('')
    );
  }
  const relationships = elements(xml('xl/_rels/workbook.xml.rels'), 'Relationship');
  const sheets = elements(xml('xl/workbook.xml'), 'sheet');
  const tabs = [];

  for (const sheet of sheets) {
    const id = sheet.getAttributeNS(
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'
    );
    const target = relationships.find(item => item.getAttribute('Id') === id).getAttribute('Target');
    const path = new URL(target, 'https://workbook.local/xl/').pathname.slice(1);
    const cells = elements(xml(path), 'c').map(cell => {
      const reference = cell.getAttribute('r');
      let value = text(cell, 'v');
      if (cell.getAttribute('t') === 's') value = strings[Number(value)];
      if (cell.getAttribute('t') === 'inlineStr') {
        value = elements(cell, 't').map(part => part.textContent).join('');
      }
      return {
        column: reference.replace(/[0-9]/g, ''),
        row: Number(reference.replace(/[A-Z]/g, '')),
        style: Number(cell.getAttribute('s') || 0),
        value: value || ''
      };
    });

    const columns = [];
    for (const cell of cells.filter(cell => cell.row === 1 && cell.value.trim())) {
      const format = formats[cell.style];
      const fill = fills[Number(format.getAttribute('fillId') || 0)];
      const font = fonts[Number(format.getAttribute('fontId') || 0)];
      columns.push({
        type: cell.value.trim().toUpperCase(),
        background: readColor(first(fill, 'fgColor'), '#FFFFFF'),
        foreground: readColor(first(font, 'color'), '#000000'),
        values: cells.filter(item => item.column === cell.column && item.row > 1)
          .map(item => item.value).filter(value => value.trim())
      });
    }
    tabs.push({name: sheet.getAttribute('name'), columns: columns});
  }
  return {tabs: tabs};
}
