# REVERSY

Cyberpunk Othello (Reversi) with a minimax + alpha-beta AI.

## Stack

- Vanilla JS + Vite
- Minimax search with alpha-beta pruning and positional heuristics
- Animated cyberpunk UI (scanlines, disc flips, HUD glow)

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
```

## Controls

- Click a highlighted cell to place a disc (you are Neon-Magenta / black)
- Easy / Medium / Hard sets AI search depth (2 / 4 / 6)
- New Game resets the board

## Project layout

```
index.html
vite.config.js
public/favicon.svg
src/
  main.js          # UI + game loop
  game/board.js    # rules, flips, scoring
  ai/minimax.js    # alpha-beta AI
  styles/main.css  # cyberpunk theme + animations
```
# REVERSY
