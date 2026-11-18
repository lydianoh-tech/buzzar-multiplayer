# Bible Buzz — Multiplayer Bible Trivia

A responsive, real-time Bible trivia game built with React, Vite, Express, and Socket.IO. Players join the same room from separate devices using a five-character code or invite link.

## Rules

- 2–12 players per room.
- 5 Bible trivia rounds, 20 seconds per question.
- Each player may submit one answer per round.
- The first correct answer received by the server earns 100 points.
- Incorrect answers earn 0 points. If nobody answers correctly, the timer reveals the answer.
- The player with the highest score after round 5 wins; ties share the win.
- The host controls the start and progression between rounds.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`). For multiple devices on the same Wi-Fi, use your computer's LAN IP and make sure the firewall allows the Vite and server ports. For play across the internet, deploy the app.

## Deploy to Render

This repo includes `render.yaml`. Create a new Render Web Service from your Git repository and use the included configuration, or set:
- Build command: `npm install && npm run build`
- Start command: `npm start`

The Node server serves the built frontend and Socket.IO on the same origin. Once deployment finishes, share the Render URL. The live URL does not exist until you deploy it to an account you control.

## Project structure

- `src/App.jsx` — game UI and client socket events
- `src/styles.css` — responsive styling
- `server/index.js` — room management, question timer, scoring, server-authoritative answer validation
- `render.yaml` — deployment configuration

## Before a public launch

- Test with at least two devices and browsers.
- Consider adding reconnection support and persistent game records if desired.
- The current game uses an in-memory room store; active rooms reset when the server restarts.
- The question set is intentionally a starter set of five questions. Review wording and Bible references for your preferred Bible translation or audience.
