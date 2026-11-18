import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { randomInt } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3001;
const ROUND_SECONDS = 20;
const POINTS_FOR_CORRECT = 100;

const questions = [
  { category: "Genesis", question: "Who built an ark to survive the great flood?", options: ["Abraham", "Noah", "Moses", "David"], answer: 1, reference: "Genesis 6–9" },
  { category: "The Gospels", question: "In which town was Jesus born?", options: ["Nazareth", "Jerusalem", "Bethlehem", "Capernaum"], answer: 2, reference: "Matthew 2:1; Luke 2:4–7" },
  { category: "Old Testament", question: "Who defeated Goliath?", options: ["Saul", "Jonathan", "Samson", "David"], answer: 3, reference: "1 Samuel 17:45–50" },
  { category: "The Exodus", question: "How many commandments did God give Moses on the stone tablets?", options: ["Seven", "Ten", "Twelve", "Forty"], answer: 1, reference: "Exodus 20:1–17" },
  { category: "The New Testament", question: "Which disciple denied knowing Jesus three times?", options: ["Peter", "John", "Thomas", "Andrew"], answer: 0, reference: "Luke 22:54–62" }
];

const rooms = new Map();
const timers = new Map();
const cleanName = (s) => String(s || "").trim().replace(/[<>]/g, "").slice(0, 22);
const allowedAvatars = new Set(["🦁", "🕊️", "👑", "🌟", "🦋", "🌻", "🧑🏽‍🦱", "👩🏾‍🦰", "🧔🏻", "👩🏻‍🦳", "🧑🏿‍🦲", "🐑"]);
const allowedAvatarColors = new Set(["#b9e47a", "#f4c76b", "#7dd3fc", "#f9a8d4", "#c4b5fd", "#fda58b"]);
const cleanAvatar = (value) => allowedAvatars.has(value) ? value : "🦁";
const cleanAvatarColor = (value) => allowedAvatarColors.has(value) ? value : "#b9e47a";
const publicQuestion = (q) => ({ category: q.category, question: q.question, options: q.options, reference: q.reference });
const roomSnapshot = (room) => ({
  code: room.code, hostId: room.hostId, status: room.status, round: room.round,
  totalRounds: questions.length, question: room.status !== "lobby" && room.round < questions.length ? publicQuestion(questions[room.round]) : null,
  secondsLeft: room.secondsLeft, answerReveal: room.answerReveal,
  players: [...room.players.values()].map(p => ({ id: p.id, name: p.name, avatar: p.avatar, avatarColor: p.avatarColor, score: p.score, answered: room.answered.has(p.id) })),
  winnerId: room.winnerId
});
function broadcast(room) { io.to(room.code).emit("room:update", roomSnapshot(room)); }
function stopTimer(code) { if (timers.has(code)) { clearInterval(timers.get(code)); timers.delete(code); } }
function nextQuestion(room) {
  stopTimer(room.code);
  room.answered = new Set();
  room.answerReveal = null;
  room.winnerId = null;
  if (room.round >= questions.length) {
    room.status = "finished";
    room.question = null;
    broadcast(room);
    return;
  }
  room.status = "playing";
  room.secondsLeft = ROUND_SECONDS;
  broadcast(room);
  const timer = setInterval(() => {
    room.secondsLeft -= 1;
    if (room.secondsLeft <= 0) {
      stopTimer(room.code);
      room.answerReveal = { correctIndex: questions[room.round].answer, message: "Time is up!", reference: questions[room.round].reference };
      room.status = room.round === questions.length - 1 ? "finished" : "between";
      broadcast(room);
    } else broadcast(room);
  }, 1000);
  timers.set(room.code, timer);
}
function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do { code = Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join(""); } while (rooms.has(code));
  return code;
}
app.get("/health", (_req, res) => res.json({ ok: true, name: "Bible Buzz" }));

io.on("connection", socket => {
  socket.on("room:create", ({ name, avatar, avatarColor } = {}, ack = () => {}) => {
    const playerName = cleanName(name);
    if (!playerName) return ack({ error: "Enter your name first." });
    const code = makeCode();
    const room = { code, hostId: socket.id, status: "lobby", round: 0, secondsLeft: ROUND_SECONDS, players: new Map(), answered: new Set(), answerReveal: null, winnerId: null };
    room.players.set(socket.id, { id: socket.id, name: playerName, avatar: cleanAvatar(avatar), avatarColor: cleanAvatarColor(avatarColor), score: 0 });
    rooms.set(code, room);
    socket.join(code);
    ack({ code, state: roomSnapshot(room) });
    broadcast(room);
  });

  socket.on("room:join", ({ code, name, avatar, avatarColor } = {}, ack = () => {}) => {
    const roomCode = String(code || "").trim().toUpperCase();
    const room = rooms.get(roomCode);
    const playerName = cleanName(name);
    if (!playerName) return ack({ error: "Enter your name first." });
    if (!room) return ack({ error: "Room not found. Check the code and try again." });
    if (room.status !== "lobby") return ack({ error: "This game has already started." });
    if (room.players.size >= 12) return ack({ error: "This room is full (12 players maximum)." });
    if ([...room.players.values()].some(p => p.name.toLowerCase() === playerName.toLowerCase())) return ack({ error: "That name is already taken in this room." });
    room.players.set(socket.id, { id: socket.id, name: playerName, avatar: cleanAvatar(avatar), avatarColor: cleanAvatarColor(avatarColor), score: 0 });
    socket.join(roomCode);
    ack({ code: roomCode, state: roomSnapshot(room) });
    broadcast(room);
  });

  socket.on("game:start", ack => {
    const room = [...rooms.values()].find(r => r.players.has(socket.id));
    if (!room) return ack?.({ error: "Join a room first." });
    if (room.hostId !== socket.id) return ack?.({ error: "Only the host can start the game." });
    if (room.players.size < 2) return ack?.({ error: "At least two players are required." });
    if (room.status !== "lobby") return ack?.({ error: "The game has already started." });
    room.round = 0;
    room.players.forEach(p => p.score = 0);
    nextQuestion(room);
    ack?.({ ok: true });
  });

  socket.on("answer:submit", ({ index } = {}, ack = () => {}) => {
    const room = [...rooms.values()].find(r => r.players.has(socket.id));
    if (!room || room.status !== "playing") return ack({ error: "This question is not accepting answers." });
    if (room.answered.has(socket.id)) return ack({ error: "You have already answered this question." });
    if (!Number.isInteger(index) || index < 0 || index > 3) return ack({ error: "Invalid answer." });
    room.answered.add(socket.id);
    const q = questions[room.round];
    const player = room.players.get(socket.id);
    if (index === q.answer && !room.winnerId) {
      room.winnerId = socket.id;
      player.score += POINTS_FOR_CORRECT;
      room.answerReveal = { correctIndex: q.answer, message: `${player.name} was fastest with the correct answer! +${POINTS_FOR_CORRECT} points`, reference: q.reference };
      stopTimer(room.code);
      room.status = room.round === questions.length - 1 ? "finished" : "between";
      broadcast(room);
      ack({ correct: true, points: POINTS_FOR_CORRECT });
      return;
    }
    broadcast(room);
    ack({ correct: index === q.answer, points: 0, message: index === q.answer ? "Correct, but another player was faster." : "Not quite. You can’t answer again this round." });
  });

  socket.on("game:next", ack => {
    const room = [...rooms.values()].find(r => r.players.has(socket.id));
    if (!room) return ack?.({ error: "Join a room first." });
    if (room.hostId !== socket.id) return ack?.({ error: "Only the host can continue." });
    if (room.status !== "between") return ack?.({ error: "The round is not ready to advance." });
    room.round += 1;
    nextQuestion(room);
    ack?.({ ok: true });
  });

  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      if (!room.players.has(socket.id)) continue;
      room.players.delete(socket.id);
      room.answered.delete(socket.id);
      if (room.players.size === 0) {
        stopTimer(room.code);
        rooms.delete(room.code);
      } else {
        if (room.hostId === socket.id) room.hostId = room.players.keys().next().value;
        broadcast(room);
      }
    }
  });
});

const clientDist = path.resolve(__dirname, "../dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/socket.io")) return next();
  res.sendFile(path.join(clientDist, "index.html"), err => { if (err) res.status(404).send("Build the client with npm run build first."); });
});
server.listen(PORT, () => console.log(`Bible Buzz server listening on ${PORT}`));