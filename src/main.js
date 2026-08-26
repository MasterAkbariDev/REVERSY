import {
  BLACK,
  WHITE,
  EMPTY,
  createBoard,
  applyMove,
  getValidMoves,
  countDiscs,
  isGameOver,
  getWinner,
  opponent,
} from './game/board.js';
import { findBestMove } from './ai/minimax.js';

/** @typedef {'hvai' | 'hvh' | 'aivai'} GameMode */

/** Human-facing pacing — readable, slightly dramatic. */
const TIMING = {
  placeHuman: 420,
  placeAi: 380,
  flipStagger: 48,
  flipSettle: 420,
  afterMove: 140,
  aiPreview: 320,
  aiThinkPad: { easy: 180, medium: 120, hard: 60, expert: 40 },
  aiBetweenTurns: 220,
};

/** AI vs AI spectate — snappy cascade, still readable locks. */
const TIMING_AIVAI = {
  placeHuman: 420,
  placeAi: 280,
  flipStagger: 32,
  flipSettle: 340,
  afterMove: 70,
  aiPreview: 200,
  aiThinkPad: { easy: 80, medium: 50, hard: 30, expert: 20 },
  aiBetweenTurns: 110,
};

function timing() {
  return state.mode === 'aivai' ? TIMING_AIVAI : TIMING;
}

/** One notch tougher for the Cyber-Cyan challenger in AI duels. */
const CHALLENGER_DIFFICULTY = {
  easy: 'medium',
  medium: 'hard',
  hard: 'expert',
};

function aiDifficultyFor(color) {
  if (state.mode === 'aivai' && color === WHITE) {
    return CHALLENGER_DIFFICULTY[state.difficulty] ?? 'hard';
  }
  return state.difficulty;
}

const state = {
  board: createBoard(),
  current: BLACK,
  difficulty: 'medium',
  /** @type {GameMode} */
  mode: 'hvai',
  animating: false,
  gameOver: false,
  /** Abort token for AI vs AI loops when mode/game resets. */
  runId: 0,
};

const app = document.getElementById('app');

function playerName(color) {
  return color === BLACK ? 'Neon-Magenta' : 'Cyber-Cyan';
}

function isAiColor(color) {
  if (state.mode === 'aivai') return true;
  if (state.mode === 'hvh') return false;
  return color === WHITE;
}

function isHumanTurn() {
  return !isAiColor(state.current);
}

function labelFor(color) {
  if (state.mode === 'hvai') {
    return color === BLACK ? 'You' : 'AI';
  }
  if (state.mode === 'hvh') {
    return color === BLACK ? 'P1' : 'P2';
  }
  return color === BLACK ? 'AI-M' : 'AI-C';
}

function tipText() {
  if (state.mode === 'hvh') {
    return 'Human vs Human — Neon-Magenta moves first. Corners are power nodes.';
  }
  if (state.mode === 'aivai') {
    return 'AI vs AI — Magenta at your difficulty, Cyan one tier harder. Fast duel, watch the corners.';
  }
  return 'You play Neon-Magenta. Corners are power nodes. Hard mode solves the endgame.';
}

function renderShell() {
  app.innerHTML = `
    <header class="brand-block">
      <h1 class="brand">REVERSY</h1>
      <p class="brand-sub">othello // alpha-beta neural grid</p>
    </header>

    <div class="hud">
      <div class="score-panel black" id="panel-black" data-color="black">
        <div class="score-disc black" aria-hidden="true"></div>
        <div class="score-meta">
          <span class="score-label" id="label-black">You</span>
          <span class="score-value" id="score-black">2</span>
        </div>
      </div>
      <div class="score-panel white" id="panel-white" data-color="white">
        <div class="score-disc white" aria-hidden="true"></div>
        <div class="score-meta">
          <span class="score-label" id="label-white">AI</span>
          <span class="score-value" id="score-white">2</span>
        </div>
      </div>
    </div>

    <div class="controls modes" role="group" aria-label="Game mode">
      <button type="button" class="ctrl active-mode" data-mode="hvai">You vs AI</button>
      <button type="button" class="ctrl" data-mode="hvh">Human vs Human</button>
      <button type="button" class="ctrl" data-mode="aivai">AI vs AI</button>
    </div>

    <div class="controls">
      <button type="button" class="ctrl primary" id="btn-new">New Game</button>
      <button type="button" class="ctrl" id="btn-pass" hidden>Pass</button>
      <button type="button" class="ctrl" data-diff="easy">Easy</button>
      <button type="button" class="ctrl active-diff" data-diff="medium">Medium</button>
      <button type="button" class="ctrl" data-diff="hard">Hard</button>
    </div>

    <p class="status-bar enter" id="status" role="status" aria-live="polite">Your move — Neon-Magenta</p>

    <div class="board-wrap">
      <div class="board" id="board" role="grid" aria-label="Reversi board"></div>
    </div>

    <p class="tip" id="tip">${tipText()}</p>

    <div class="overlay hidden" id="overlay" role="dialog" aria-modal="true">
      <div class="overlay-card">
        <h2 class="overlay-title" id="overlay-title">SYSTEM HALT</h2>
        <p class="overlay-body" id="overlay-body"></p>
        <button type="button" class="ctrl primary" id="overlay-new">Jack Back In</button>
      </div>
    </div>
  `;

  bindEvents();
  paintBoard(true);
  updateHud();
  updateModeChrome();
}

function bindEvents() {
  document.getElementById('btn-new').addEventListener('click', () => newGame());
  document.getElementById('overlay-new').addEventListener('click', () => newGame());
  document.getElementById('btn-pass').addEventListener('click', () => humanPass());

  document.querySelectorAll('[data-diff]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.difficulty = btn.dataset.diff;
      document.querySelectorAll('[data-diff]').forEach((b) => {
        b.classList.toggle('active-diff', b.dataset.diff === state.difficulty);
      });
      setStatus(`Difficulty → ${state.difficulty.toUpperCase()}`);
    });
  });

  document.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = /** @type {GameMode} */ (btn.dataset.mode);
      if (mode === state.mode) return;
      state.mode = mode;
      newGame();
    });
  });
}

function updateModeChrome() {
  document.querySelectorAll('[data-mode]').forEach((b) => {
    b.classList.toggle('active-mode', b.dataset.mode === state.mode);
  });
  document.getElementById('label-black').textContent = labelFor(BLACK);
  document.getElementById('label-white').textContent = labelFor(WHITE);
  document.getElementById('tip').textContent = tipText();
  document.getElementById('board')?.classList.toggle('aivai-pace', state.mode === 'aivai');

  const diffBtns = document.querySelectorAll('[data-diff]');
  diffBtns.forEach((b) => {
    b.hidden = state.mode === 'hvh';
  });
}

function openingStatus() {
  if (state.mode === 'aivai') return 'AI duel initializing…';
  if (state.mode === 'hvh') return `${playerName(BLACK)} to move`;
  return 'Your move — Neon-Magenta';
}

function newGame() {
  state.runId += 1;
  state.board = createBoard();
  state.current = BLACK;
  state.animating = false;
  state.gameOver = false;
  document.getElementById('overlay').classList.add('hidden');
  clearAiPreview();
  updateModeChrome();
  paintBoard(true);
  updateHud();
  setStatus(openingStatus());
  queueTurn();
}

function setStatus(text, { thinking = false, gameOver = false } = {}) {
  const el = document.getElementById('status');
  el.classList.remove('enter');
  // Retrigger enter fade for status changes.
  void el.offsetWidth;
  el.classList.add('enter');
  el.textContent = text;
  el.classList.toggle('ai-thinking', thinking);
  el.classList.toggle('game-over', gameOver);
}

function updateHud() {
  const { black, white } = countDiscs(state.board);
  bumpScore('score-black', black);
  bumpScore('score-white', white);

  const panelBlack = document.getElementById('panel-black');
  const panelWhite = document.getElementById('panel-white');
  panelBlack.classList.toggle('active', state.current === BLACK && !state.gameOver);
  panelWhite.classList.toggle('active', state.current === WHITE && !state.gameOver);

  const passBtn = document.getElementById('btn-pass');
  const showPass =
    !state.gameOver &&
    !state.animating &&
    isHumanTurn() &&
    getValidMoves(state.board, state.current).length === 0 &&
    getValidMoves(state.board, opponent(state.current)).length > 0;
  passBtn.hidden = !showPass;
}

function bumpScore(id, value) {
  const el = document.getElementById(id);
  const prev = el.textContent;
  el.textContent = String(value);
  if (prev !== String(value)) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }
}

function validMoveKeys() {
  if (!isHumanTurn() || state.animating || state.gameOver) {
    return new Set();
  }
  return new Set(getValidMoves(state.board, state.current).map(([r, c]) => `${r},${c}`));
}

function setBoardInteractive() {
  const valid = validMoveKeys();
  const locked = state.animating || state.gameOver || !isHumanTurn();
  document.querySelectorAll('#board .cell').forEach((cell) => {
    const key = `${cell.dataset.row},${cell.dataset.col}`;
    cell.classList.toggle('valid', valid.has(key));
    cell.classList.toggle('locked', locked);
  });
}

function clearAiPreview() {
  document.querySelectorAll('#board .cell.ai-target').forEach((c) => {
    c.classList.remove('ai-target');
  });
}

function paintBoard(boot = false) {
  const boardEl = document.getElementById('board');
  const valid = validMoveKeys();
  const locked = state.animating || state.gameOver || !isHumanTurn();
  let cells = boardEl.querySelectorAll('.cell');

  if (cells.length !== 64) {
    boardEl.replaceChildren();
    let i = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.style.setProperty('--i', String(i++));
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}`);
        cell.addEventListener('click', () => onCellClick(r, c));
        boardEl.appendChild(cell);
      }
    }
    cells = boardEl.querySelectorAll('.cell');
  }

  boardEl.classList.remove('booting');
  if (boot) {
    void boardEl.offsetWidth;
    boardEl.classList.add('booting');
  }

  cells.forEach((cell) => {
    const r = Number(cell.dataset.row);
    const c = Number(cell.dataset.col);
    const key = `${r},${c}`;
    cell.classList.toggle('valid', valid.has(key));
    cell.classList.toggle('locked', locked);
    cell.classList.remove('ripple', 'ai-target');

    const piece = state.board[r][c];
    let disc = cell.querySelector('.disc');

    if (piece === EMPTY) {
      disc?.remove();
      return;
    }

    const color = piece === BLACK ? 'black' : 'white';
    if (!disc) {
      disc = document.createElement('div');
      disc.className = `disc ${color}`;
      if (!boot) disc.classList.add('settled');
      cell.appendChild(disc);
      return;
    }

    disc.classList.remove('place', 'ai-place', 'flip', 'black', 'white');
    disc.classList.add(color);
    if (!boot) disc.classList.add('settled');
  });
}

function getCell(r, c) {
  return document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function onCellClick(row, col) {
  if (state.animating || state.gameOver) return;
  if (!isHumanTurn()) return;

  const moves = getValidMoves(state.board, state.current);
  if (!moves.some(([r, c]) => r === row && c === col)) return;

  await playMove(row, col, state.current, false);
  await afterMove();
}

async function humanPass() {
  if (state.animating || state.gameOver) return;
  if (!isHumanTurn()) return;
  if (getValidMoves(state.board, state.current).length > 0) return;

  const skipped = state.current;
  state.current = opponent(state.current);
  updateHud();
  setStatus(`${playerName(skipped)} passes — ${playerName(state.current)} to move`);
  await queueTurn();
}

async function playMove(row, col, player, isAi) {
  state.animating = true;
  updateHud();
  setBoardInteractive();

  const t = timing();
  const flips = applyMove(state.board, row, col, player);
  const cell = getCell(row, col);

  const disc = document.createElement('div');
  disc.className = `disc ${player === BLACK ? 'black' : 'white'} ${isAi ? 'ai-place' : 'place'}`;
  cell.appendChild(disc);
  cell.classList.add('ripple');
  cell.classList.remove('valid', 'ai-target');

  await wait(isAi ? t.placeAi : t.placeHuman);

  // Cascade flips in parallel — stagger start, swap color at edge-on (~40%).
  const colorAt = Math.round(t.flipSettle * 0.4);
  const colorClass = player === BLACK ? 'black' : 'white';
  const flipJobs = [];

  for (let i = 0; i < flips.length; i++) {
    const [fr, fc] = flips[i];
    const flipCell = getCell(fr, fc);
    const old = flipCell.querySelector('.disc');
    if (!old) continue;

    old.classList.remove('place', 'ai-place', 'settled', 'flip');
    void old.offsetWidth;
    old.classList.add('flip');

    flipJobs.push(
      wait(colorAt).then(() => {
        old.classList.remove('black', 'white');
        old.classList.add(colorClass);
      })
    );

    if (i < flips.length - 1) await wait(t.flipStagger);
  }

  await Promise.all(flipJobs);
  await wait(Math.max(0, t.flipSettle - colorAt) + t.afterMove);

  state.animating = false;
  paintBoard();
  updateHud();
}

async function afterMove() {
  if (checkEnd()) return;

  const next = opponent(state.current);
  const nextMoves = getValidMoves(state.board, next);

  if (nextMoves.length === 0) {
    const again = getValidMoves(state.board, state.current);
    if (again.length === 0) {
      checkEnd();
      return;
    }
    setStatus(`${playerName(next)} has no moves — turn retained`);
    paintBoard();
    updateHud();
    if (isAiColor(state.current)) {
      await wait(timing().aiBetweenTurns);
      await runAiTurn();
    }
    return;
  }

  state.current = next;
  updateHud();
  await queueTurn();
}

async function queueTurn() {
  if (state.gameOver) return;

  if (isAiColor(state.current)) {
    await runAiTurn();
    return;
  }

  const moves = getValidMoves(state.board, state.current);
  if (moves.length === 0) {
    // Opponent must have moves or game would be over — show pass.
    paintBoard();
    updateHud();
    if (state.mode === 'hvh') {
      setStatus(`${playerName(state.current)} has no moves — press Pass`);
    } else {
      setStatus('No valid moves — press Pass');
    }
    return;
  }

  if (state.mode === 'hvh') {
    setStatus(`${playerName(state.current)} to move`);
  } else {
    setStatus('Your move — Neon-Magenta');
  }
  paintBoard();
  updateHud();
}

async function runAiTurn() {
  const runId = state.runId;
  if (state.gameOver || !isAiColor(state.current)) return;

  const aiColor = state.current;
  const moves = getValidMoves(state.board, aiColor);

  if (moves.length === 0) {
    state.current = opponent(aiColor);
    setStatus(`${playerName(aiColor)} passes — ${playerName(state.current)} to move`);
    paintBoard();
    updateHud();
    if (getValidMoves(state.board, state.current).length === 0) {
      checkEnd();
      return;
    }
    await wait(timing().aiBetweenTurns);
    if (runId !== state.runId) return;
    await queueTurn();
    return;
  }

  const t = timing();
  const diff = aiDifficultyFor(aiColor);
  const who = state.mode === 'aivai' ? playerName(aiColor) : 'AI';
  const tier =
    state.mode === 'aivai' ? ` // ${diff}` : '';
  setStatus(`${who} thinking // minimax α-β${tier}…`, { thinking: true });
  paintBoard();
  updateHud();

  const thinkDelay = t.aiThinkPad[diff] ?? t.aiThinkPad[state.difficulty] ?? 100;
  const start = performance.now();

  const move = await new Promise((resolve) => {
    setTimeout(() => {
      resolve(findBestMove(state.board, aiColor, diff));
    }, 0);
  });

  if (runId !== state.runId) return;

  const elapsed = performance.now() - start;
  if (elapsed < thinkDelay) await wait(thinkDelay - elapsed);
  if (runId !== state.runId) return;

  if (!move) {
    state.current = opponent(aiColor);
    setStatus(`${who} passes`);
    paintBoard();
    updateHud();
    await queueTurn();
    return;
  }

  const [r, c] = move;
  const coord = `${String.fromCharCode(65 + c)}${r + 1}`;
  setStatus(`${who} locks onto ${coord}`);

  // Preview target so the decision is visible before the slam.
  clearAiPreview();
  const target = getCell(r, c);
  target?.classList.add('ai-target');
  await wait(t.aiPreview);
  if (runId !== state.runId) return;

  setStatus(`${who} deploys @ ${coord}`);
  await playMove(r, c, aiColor, true);
  if (runId !== state.runId) return;

  // Brief beat so score bumps register before the next lock-on.
  if (state.mode === 'aivai' || isAiColor(opponent(aiColor))) {
    await wait(t.aiBetweenTurns);
  }
  if (runId !== state.runId) return;

  await afterMove();
}

function checkEnd() {
  if (!isGameOver(state.board)) return false;

  state.gameOver = true;
  state.runId += 1;
  const winner = getWinner(state.board);
  const { black, white } = countDiscs(state.board);
  updateHud();
  paintBoard();

  const overlay = document.getElementById('overlay');
  const title = document.getElementById('overlay-title');
  const body = document.getElementById('overlay-body');

  if (winner === 'draw') {
    title.textContent = 'DEADLOCK';
    body.textContent = `Grid locked ${black}–${white}. Mutual annihilation.`;
    setStatus('Draw — grid stalemate', { gameOver: true });
  } else if (state.mode === 'hvai') {
    if (winner === 'black') {
      title.textContent = 'YOU WIN';
      body.textContent = `Neon-Magenta ${black} · Cyber-Cyan ${white}. Neural net outplayed.`;
      setStatus('Victory — Neon-Magenta dominates', { gameOver: true });
    } else {
      title.textContent = 'AI WINS';
      body.textContent = `Cyber-Cyan ${white} · Neon-Magenta ${black}. Alpha-beta prevails.`;
      setStatus('Defeat — AI controls the grid', { gameOver: true });
    }
  } else if (state.mode === 'hvh') {
    const name = winner === 'black' ? 'Neon-Magenta' : 'Cyber-Cyan';
    title.textContent = `${name.toUpperCase()} WINS`;
    body.textContent = `Neon-Magenta ${black} · Cyber-Cyan ${white}.`;
    setStatus(`${name} takes the grid`, { gameOver: true });
  } else {
    const name = winner === 'black' ? 'Neon-Magenta AI' : 'Cyber-Cyan AI';
    title.textContent = `${name.toUpperCase()} WINS`;
    body.textContent = `Neon-Magenta ${black} · Cyber-Cyan ${white}. Alpha-beta duel complete.`;
    setStatus(`${name} prevails`, { gameOver: true });
  }

  overlay.classList.remove('hidden');
  return true;
}

renderShell();
