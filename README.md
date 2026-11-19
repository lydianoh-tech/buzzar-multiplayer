# Bible Buzz — Netlify-ready multiplayer Bible trivia

Bible Buzz keeps its existing React/Vite interface, avatar picker, live room codes, Bible questions, scoring, per-round winners, and animated final celebration. The continuously running Express/Socket.IO server has been replaced by a Netlify Function and Netlify Blobs room storage.

## Game rules

- 2–12 players per room.
- Five rounds with five questions per round (25 questions total).
- Each question stays open for up to 20 seconds.
- Each player gets one answer per question.
- The first correct answer earns 100 points; incorrect answers earn zero.
- Each round announces its winner after question five. Ties share the round win.
- The overall champion is announced after question 25.
- The host advances the game between questions; round numbering resets at each new round.

## Publish with Netlify Drop

1. Extract `netlify-ready-game.zip` into a folder.
2. Sign in to Netlify and open https://app.netlify.com/drop.
3. Drag the **whole extracted project folder** into the Drop area (not just `dist`). Netlify must run the build and package the function; a static-only upload of `dist` will not include the backend.
4. Wait for the build and deployment to finish. Open the published site in two browsers/devices and test creating/joining a room.

The project includes root-level `netlify.toml`, `package.json`, `package-lock.json`, the frontend source, and `netlify/functions/game.ts`. Netlify automatically provides the credentials needed by Netlify Blobs to a deployed Function; no database account, API key, custom environment variable, GitHub repository, or manual database provisioning is required.

## Architecture

- `src/App.jsx` and `src/styles.css` — existing user interface and styling.
- `src/gameClient.js` — lightweight HTTP polling client; it calls `/.netlify/functions/game` directly.
- `netlify/functions/game.ts` — single Netlify Function endpoint.
- `netlify/lib/gameEngine.ts` — question bank, snapshots, scoring helpers, and round winner logic, kept outside the functions directory.
- `netlify/lib/gameHandler.ts` — reusable request/game-state handler used by the Function and integration tests.
- `netlify.toml` — build, publish, and functions configuration. No `config.path` or `/api/game` redirect is used.
- `tests/game-flow.test.js` — complete three-round/two-player scoring and winner integration test.

The function opens a site-wide Netlify Blobs store with strong consistency. Room creation uses `onlyIfNew`; room mutations use ETag-based `onlyIfMatch` conditional writes with bounded retries. Blobs is a key/value store rather than a transactional database, so conditional writes reduce stale overwrites but are not a substitute for full multi-record transactions. Each game is stored as one room record to keep its state update atomic at the application level as far as the conditional-write API allows.

## Testing

- `npm test` runs a simulated complete three-round game with two players. It verifies all 15 questions, answer scoring, round winners, the final scores, and the overall winner.
- `npm run build` creates the production frontend bundle.
- Netlify's build process packages `netlify/functions/game.ts` during deployment.

Netlify Blobs is available to deployed Functions automatically. Local execution of the real Blobs-backed endpoint requires Netlify's local development runtime; the included integration test uses an in-memory store with the same conditional-write contract and does not need credentials.
