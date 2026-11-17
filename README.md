# REVERSY

A browser-based Reversi game with a neon interface and a computer opponent powered by minimax search.

## Highlights

- Play as black against an AI with three search-depth settings.
- See valid moves, disc flips, scores, and the current game state.
- Explore a game engine separated from the interface and an alpha-beta search with positional heuristics.

## Getting started

Requires Node.js and npm.

```bash
git clone https://github.com/MasterAkbariDev/REVERSY.git
cd REVERSY
npm ci
npm run dev
```

Open the local URL printed by Vite. Choose a difficulty and click a highlighted square to play. **New Game** resets the board.

## Development

```bash
npm run build      # production bundle in dist/
npm run preview    # preview a production build
```

| Path | Purpose |
| --- | --- |
| `src/game/board.js` | Board rules, legal moves, flips, and scoring |
| `src/ai/minimax.js` | Minimax search, alpha-beta pruning, and evaluation |
| `src/main.js` | Interface and game loop |
| `src/styles/main.css` | Visual theme and animations |
