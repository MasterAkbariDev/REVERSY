import {
  BLACK,
  EMPTY,
  BOARD_SIZE,
  cloneBoard,
  applyMove,
  getValidMoves,
  opponent,
  isGameOver,
  countDiscs,
} from '../game/board.js';

/** Corner / edge / near-corner positional weights (classic Othello heuristic). */
const POSITION_WEIGHTS = [
  [120, -20, 20, 5, 5, 20, -20, 120],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [120, -20, 20, 5, 5, 20, -20, 120],
];

/** Squares adjacent to corners — deadly until that corner is taken. */
const X_SQUARES = [
  [1, 1],
  [1, 6],
  [6, 1],
  [6, 6],
];
const C_SQUARES = [
  [0, 1],
  [1, 0],
  [0, 6],
  [1, 7],
  [6, 0],
  [7, 1],
  [6, 7],
  [7, 6],
];
const CORNERS = [
  [0, 0],
  [0, 7],
  [7, 0],
  [7, 7],
];

const DIFFICULTY_DEPTH = {
  easy: 3,
  medium: 5,
  hard: 7,
  /** Used as the AI-vs-AI challenger when Hard is selected. */
  expert: 8,
};

/**
 * Evaluate board from `aiPlayer` perspective (higher = better for AI).
 */
function evaluate(board, aiPlayer) {
  const foe = opponent(aiPlayer);
  let score = 0;
  let aiDiscs = 0;
  let foeDiscs = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const cell = board[r][c];
      if (cell === aiPlayer) {
        score += POSITION_WEIGHTS[r][c];
        aiDiscs++;
      } else if (cell === foe) {
        score -= POSITION_WEIGHTS[r][c];
        foeDiscs++;
      }
    }
  }

  // Corner control is decisive — amplify beyond the base matrix.
  for (const [r, c] of CORNERS) {
    if (board[r][c] === aiPlayer) score += 35;
    else if (board[r][c] === foe) score -= 35;
  }

  // Punish X/C squares harder when the matching corner is still open.
  for (let i = 0; i < CORNERS.length; i++) {
    const [cr, cc] = CORNERS[i];
    if (board[cr][cc] !== EMPTY) continue;
    const [xr, xc] = X_SQUARES[i];
    if (board[xr][xc] === aiPlayer) score -= 28;
    else if (board[xr][xc] === foe) score += 28;
  }
  for (const [r, c] of C_SQUARES) {
    const cornerR = r === 0 || r === 7 ? r : r < 4 ? 0 : 7;
    const cornerC = c === 0 || c === 7 ? c : c < 4 ? 0 : 7;
    if (board[cornerR][cornerC] !== EMPTY) continue;
    if (board[r][c] === aiPlayer) score -= 12;
    else if (board[r][c] === foe) score += 12;
  }

  const aiMoves = getValidMoves(board, aiPlayer).length;
  const foeMoves = getValidMoves(board, foe).length;
  // Mobility pressure — starve the opponent of options.
  score += 12 * (aiMoves - foeMoves);
  if (foeMoves === 0 && aiMoves > 0) score += 40;
  if (aiMoves === 0 && foeMoves > 0) score -= 40;

  if (isGameOver(board)) {
    const { black, white } = countDiscs(board);
    const aiCount = aiPlayer === BLACK ? black : white;
    const foeCount = aiPlayer === BLACK ? white : black;
    if (aiCount > foeCount) return 100000 + (aiCount - foeCount);
    if (aiCount < foeCount) return -100000 - (foeCount - aiCount);
    return 0;
  }

  const empty = BOARD_SIZE * BOARD_SIZE - aiDiscs - foeDiscs;
  // Midgame: prefer parity / mobility. Endgame: race discs.
  if (empty < 14) {
    score += 22 * (aiDiscs - foeDiscs);
  } else if (empty > 40) {
    score += 2 * (aiDiscs - foeDiscs);
  }

  return score;
}

/**
 * Minimax with alpha-beta pruning.
 * @returns {{ score: number, move: [number, number] | null }}
 */
function alphabeta(board, depth, alpha, beta, maximizing, aiPlayer, currentPlayer) {
  const moves = getValidMoves(board, currentPlayer);

  if (depth === 0 || (moves.length === 0 && getValidMoves(board, opponent(currentPlayer)).length === 0)) {
    return { score: evaluate(board, aiPlayer), move: null };
  }

  // Pass if no moves
  if (moves.length === 0) {
    return alphabeta(
      board,
      depth - 1,
      alpha,
      beta,
      !maximizing,
      aiPlayer,
      opponent(currentPlayer)
    );
  }

  // Move ordering: try corners / high-weight cells first for better pruning
  moves.sort(([r1, c1], [r2, c2]) =>
    POSITION_WEIGHTS[r2][c2] - POSITION_WEIGHTS[r1][c1]
  );

  let bestMove = moves[0];

  if (maximizing) {
    let maxEval = -Infinity;
    for (const [r, c] of moves) {
      const next = cloneBoard(board);
      applyMove(next, r, c, currentPlayer);
      const { score } = alphabeta(
        next,
        depth - 1,
        alpha,
        beta,
        false,
        aiPlayer,
        opponent(currentPlayer)
      );
      if (score > maxEval) {
        maxEval = score;
        bestMove = [r, c];
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  }

  let minEval = Infinity;
  for (const [r, c] of moves) {
    const next = cloneBoard(board);
    applyMove(next, r, c, currentPlayer);
    const { score } = alphabeta(
      next,
      depth - 1,
      alpha,
      beta,
      true,
      aiPlayer,
      opponent(currentPlayer)
    );
    if (score < minEval) {
      minEval = score;
      bestMove = [r, c];
    }
    beta = Math.min(beta, score);
    if (beta <= alpha) break;
  }
  return { score: minEval, move: bestMove };
}

function emptyCount(board) {
  let n = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === EMPTY) n++;
    }
  }
  return n;
}

/**
 * Compute the best AI move.
 * @param {number[][]} board
 * @param {1 | 2} aiPlayer
 * @param {'easy' | 'medium' | 'hard' | 'expert'} difficulty
 * @returns {[number, number] | null}
 */
export function findBestMove(board, aiPlayer, difficulty = 'medium') {
  const base = DIFFICULTY_DEPTH[difficulty] ?? 5;
  const empty = emptyCount(board);
  // Exact endgame solve when few empties remain — much tougher late game.
  const endgameSolve =
    difficulty === 'easy' ? 6 : difficulty === 'medium' ? 10 : 12;
  const depth = empty <= endgameSolve ? empty : base;

  const moves = getValidMoves(board, aiPlayer);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  // Easy: occasional suboptimal picks so humans can learn without a wall.
  if (difficulty === 'easy' && moves.length > 1 && Math.random() < 0.22) {
    const ranked = [...moves].sort(
      ([r1, c1], [r2, c2]) =>
        POSITION_WEIGHTS[r2][c2] - POSITION_WEIGHTS[r1][c1]
    );
    return ranked[1 + Math.floor(Math.random() * Math.min(2, ranked.length - 1))];
  }

  const { move } = alphabeta(
    board,
    depth,
    -Infinity,
    Infinity,
    true,
    aiPlayer,
    aiPlayer
  );
  return move;
}

export { DIFFICULTY_DEPTH };
