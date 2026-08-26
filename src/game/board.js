/** @typedef {0 | 1 | 2} Cell — empty | black | white */
/** @typedef {[number, number]} Coord */

export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;
export const BOARD_SIZE = 8;

export const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

export function opponent(player) {
  return player === BLACK ? WHITE : BLACK;
}

export function createBoard() {
  const board = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(EMPTY)
  );
  board[3][3] = WHITE;
  board[3][4] = BLACK;
  board[4][3] = BLACK;
  board[4][4] = WHITE;
  return board;
}

export function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function inBounds(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

/**
 * Returns discs that would flip if `player` places at (row, col).
 * @returns {Coord[]}
 */
export function getFlips(board, row, col, player) {
  if (board[row][col] !== EMPTY) return [];

  const foe = opponent(player);
  /** @type {Coord[]} */
  const flips = [];

  for (const [dr, dc] of DIRECTIONS) {
    let r = row + dr;
    let c = col + dc;
    /** @type {Coord[]} */
    const path = [];

    while (inBounds(r, c) && board[r][c] === foe) {
      path.push([r, c]);
      r += dr;
      c += dc;
    }

    if (path.length > 0 && inBounds(r, c) && board[r][c] === player) {
      flips.push(...path);
    }
  }

  return flips;
}

export function isValidMove(board, row, col, player) {
  return getFlips(board, row, col, player).length > 0;
}

/** @returns {Coord[]} */
export function getValidMoves(board, player) {
  /** @type {Coord[]} */
  const moves = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (isValidMove(board, r, c, player)) moves.push([r, c]);
    }
  }
  return moves;
}

/**
 * Apply a move in place. Returns flipped coords (for animation).
 * @returns {Coord[]}
 */
export function applyMove(board, row, col, player) {
  const flips = getFlips(board, row, col, player);
  if (flips.length === 0) return [];

  board[row][col] = player;
  for (const [r, c] of flips) {
    board[r][c] = player;
  }
  return flips;
}

export function countDiscs(board) {
  let black = 0;
  let white = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === BLACK) black++;
      else if (board[r][c] === WHITE) white++;
    }
  }
  return { black, white };
}

export function isGameOver(board) {
  return (
    getValidMoves(board, BLACK).length === 0 &&
    getValidMoves(board, WHITE).length === 0
  );
}

/**
 * @returns {'black' | 'white' | 'draw' | null}
 */
export function getWinner(board) {
  if (!isGameOver(board)) return null;
  const { black, white } = countDiscs(board);
  if (black > white) return 'black';
  if (white > black) return 'white';
  return 'draw';
}
