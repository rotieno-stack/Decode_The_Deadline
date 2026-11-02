// Decode the Deadline -- client.
//
// This file never holds the solution. It renders clues and givens fetched
// from /api/puzzle, sends guesses to /api/guess (which answers only
// true/false), and only learns a cell's real value at the moment the
// server confirms a guess is correct for that specific cell.

const SIZE = 3;

const state = {
  grid: Array.from({ length: SIZE }, () => Array(SIZE).fill(null)),
  given: Array.from({ length: SIZE }, () => Array(SIZE).fill(false)),
  usedValues: new Set(),
  selected: null, // {row, col}
};

const gridEl = document.getElementById('grid');
const keypadEl = document.getElementById('keypad');
const clueListEl = document.getElementById('clue-list');
const logEl = document.getElementById('log');
const hintBtn = document.getElementById('hint-btn');
const revealEl = document.getElementById('reveal');
const revealTimeEl = document.getElementById('reveal-time');

function log(message, kind = '') {
  const p = document.createElement('p');
  p.className = `log-line${kind ? ` log-line--${kind}` : ''}`;
  p.textContent = message;
  logEl.appendChild(p);
  logEl.scrollTop = logEl.scrollHeight;
}

function cellKey(r, c) {
  return `${r}-${c}`;
}

function isDiagonal(r, c) {
  return r === c;
}

function renderGrid() {
  gridEl.innerHTML = '';
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cell';
      btn.dataset.row = r;
      btn.dataset.col = c;
      if (isDiagonal(r, c)) btn.classList.add('diagonal');

      const value = state.grid[r][c];
      if (value !== null) {
        btn.textContent = value;
        btn.classList.add(state.given[r][c] ? 'given' : 'solved');
      } else {
        btn.textContent = '';
        btn.addEventListener('click', () => selectCell(r, c));
      }

      if (state.selected && state.selected.row === r && state.selected.col === c) {
        btn.classList.add('selected');
      }

      gridEl.appendChild(btn);
    }
  }
}

function renderKeypad() {
  keypadEl.innerHTML = '';
  for (let v = 1; v <= 9; v += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'digit-btn';
    btn.textContent = String(v);
    btn.disabled = state.usedValues.has(v);
    btn.addEventListener('click', () => submitGuess(v));
    keypadEl.appendChild(btn);
  }
}

function selectCell(r, c) {
  state.selected = { row: r, col: c };
  renderGrid();
}

async function submitGuess(value) {
  if (!state.selected) {
    log('Select an empty cell first.', 'muted');
    return;
  }
  const { row, col } = state.selected;
  const label = `row ${row + 1}, col ${col + 1}`;

  if (state.usedValues.has(value)) {
    log(`${value} is already placed elsewhere in the grid.`, 'muted');
    return;
  }

  let data;
  try {
    const res = await fetch('/api/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row, col, value }),
    });
    data = await res.json();
    if (!res.ok) throw new Error(data.error || 'request failed');
  } catch (err) {
    log('Could not reach the server -- try again.', 'bad');
    return;
  }

  if (data.correct) {
    state.grid[row][col] = value;
    state.usedValues.add(value);
    state.selected = null;
    log(`${label} = ${value}. Correct.`, 'good');
    renderGrid();
    renderKeypad();
    checkComplete();
  } else {
    // Every unused 1-9 digit belongs somewhere in this grid (it's a
    // 1-9 permutation), so a wrong-but-unused guess always means
    // "right digit, wrong cell" -- no secret needed to say so.
    log(`Not ${label} -- ${value} belongs somewhere else in the grid.`, 'bad');
  }
}

async function requestHint() {
  if (!state.selected) {
    log('Select an empty cell first.', 'muted');
    return;
  }
  const { row, col } = state.selected;
  let data;
  try {
    const res = await fetch(`/api/hint?row=${row}&col=${col}`);
    data = await res.json();
    if (!res.ok) throw new Error(data.error || 'request failed');
  } catch (err) {
    log('Could not reach the server -- try again.', 'bad');
    return;
  }
  const parity = data.odd ? 'odd' : 'even';
  const primality = data.prime ? 'prime' : 'not prime';
  log(`Hint for row ${row + 1}, col ${col + 1}: ${parity}, ${primality}.`, 'hint');
}

function checkComplete() {
  const complete = state.grid.every((row) => row.every((v) => v !== null));
  if (!complete) return;

  const diagonal = [state.grid[0][0], state.grid[1][1], state.grid[2][2]];
  const [d1, d2, d3] = diagonal;
  const hour = d1;
  const minute = d2 * 5;
  const period = d3 % 2 === 1 ? 'AM' : 'PM';
  const minuteStr = String(minute).padStart(2, '0');

  revealTimeEl.textContent = `${hour}:${minuteStr} ${period} PST`;
  revealEl.hidden = false;
  revealEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  log('Grid complete. Release time decoded above.', 'good');
}

async function init() {
  let data;
  try {
    const res = await fetch('/api/puzzle');
    data = await res.json();
  } catch (err) {
    log('Could not load the puzzle. Refresh to try again.', 'bad');
    return;
  }

  data.givens.forEach(({ row, col, value }) => {
    state.grid[row][col] = value;
    state.given[row][col] = true;
    state.usedValues.add(value);
  });

  data.clues.forEach((clue) => {
    const li = document.createElement('li');
    li.textContent = clue;
    clueListEl.appendChild(li);
  });

  renderGrid();
  renderKeypad();
  hintBtn.addEventListener('click', requestHint);

  document.addEventListener('keydown', (e) => {
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= 9) submitGuess(n);
  });
}

init();
