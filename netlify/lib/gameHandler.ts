import {
  ROUND_SECONDS, POINTS_FOR_CORRECT, QUESTIONS_PER_ROUND, questions as defaultQuestions,
  cleanName, cleanAvatar, cleanAvatarColor, snapshot, createRoomState, finalizeRound,
  expireQuestionIfNeeded
} from "./gameEngine.ts";

const MAX_CAS_ATTEMPTS = 8;
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
function makeCode(random = Math.random) {
  return Array.from({ length: 5 }, () => ROOM_ALPHABET[Math.floor(random() * ROOM_ALPHABET.length)]).join("");
}
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

/** Handler factory lets the same production rules run against an in-memory test store. */
export function createHandler(store: any, options: { questions?: any[]; now?: () => number; random?: () => number } = {}) {
  const bank = options.questions || defaultQuestions;
  const now = options.now || (() => Date.now());
  const random = options.random || Math.random;

  async function readRoom(code: string) {
    return store.getWithMetadata(code, { type: "json", consistency: "strong" });
  }

  async function mutateRoom(code: string, mutator: (room: any) => any) {
    for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt += 1) {
      const entry = await readRoom(code);
      if (!entry || !entry.data) return { error: "Room not found. Check the code and try again.", status: 404 };
      const room = clone(entry.data);
      const result = await mutator(room);
      if (result?.readOnly) return { room, result };
      const saved = await store.setJSON(code, room, { onlyIfMatch: entry.etag });
      if (saved.modified) return { room, result };
    }
    return { error: "This room is receiving simultaneous updates. Please try again.", status: 409 };
  }

  async function makeRoom(data: any) {
    const name = cleanName(data.name);
    if (!name) return { error: "Enter your name first.", status: 400 };
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = makeCode(random);
      const room = createRoomState({ code, hostId: data.playerId, name, avatar: data.avatar, avatarColor: data.avatarColor, now: now() });
      const saved = await store.setJSON(code, room, { onlyIfNew: true });
      if (saved.modified) return { code, state: snapshot(room, bank, now()) };
    }
    return { error: "Could not create a room. Please try again.", status: 503 };
  }

  async function action(data: any) {
    const actionName = data.action;
    const playerId = String(data.playerId || "").slice(0, 100);
    if (!playerId) return { error: "Player session is missing. Refresh and try again.", status: 400 };

    if (actionName === "create") return makeRoom({ ...data, playerId });

    if (actionName === "join") {
      const code = String(data.code || "").trim().toUpperCase();
      if (!/^[A-Z2-9]{5}$/.test(code)) return { error: "Enter a valid five-character room code.", status: 400 };
      const result = await mutateRoom(code, room => {
        const name = cleanName(data.name);
        if (!name) return { error: "Enter your name first.", status: 400, readOnly: true };
        if (room.status !== "lobby") return { error: "This game has already started.", status: 409, readOnly: true };
        if (room.players.length >= 12) return { error: "This room is full (12 players maximum).", status: 409, readOnly: true };
        if (room.players.some((p: any) => p.id === playerId)) return { joined: true };
        if (room.players.some((p: any) => p.name.toLowerCase() === name.toLowerCase())) return { error: "That name is already taken in this room.", status: 409, readOnly: true };
        room.players.push({ id: playerId, name, avatar: cleanAvatar(data.avatar), avatarColor: cleanAvatarColor(data.avatarColor), score: 0, roundScore: 0 });
        return { joined: true };
      });
      if (result.error) return result;
      if (result.result?.error) return { error: result.result.error, status: result.result.status || 400 };
      return { code, state: snapshot(result.room, bank, now()) };
    }

    const code = String(data.code || "").trim().toUpperCase();
    if (!code) return { error: "Join a room first.", status: 400 };
    if (actionName === "state") {
      const result = await mutateRoom(code, room => {
        if (expireQuestionIfNeeded(room, bank, now())) return { changed: true };
        return { readOnly: true };
      });
      if (result.error) return result;
      return { code, state: snapshot(result.room, bank, now()) };
    }

    const result = await mutateRoom(code, room => {
      // Persist a timeout before rejecting an action that arrived too late.
      const expired = expireQuestionIfNeeded(room, bank, now());
      if (expired && actionName !== "state") return { error: "Time is up for this question.", status: 409 };
      const player = room.players.find((p: any) => p.id === playerId);
      if (!player) return { error: "You are not a member of this room.", status: 403, readOnly: true };

      if (actionName === "start") {
        if (room.hostId !== playerId) return { error: "Only the host can start the game.", status: 403, readOnly: true };
        if (room.players.length < 2) return { error: "At least two players are required.", status: 400, readOnly: true };
        if (room.status !== "lobby") return { error: "The game has already started.", status: 409, readOnly: true };
        room.status = "playing"; room.questionIndex = 0; room.deadlineAt = now() + ROUND_SECONDS * 1000;
        room.answered = []; room.answerReveal = null; room.winnerId = null; room.roundWinner = null;
        room.players.forEach((p: any) => { p.score = 0; p.roundScore = 0; });
        return { ok: true };
      }

      if (actionName === "answer") {
        if (room.status !== "playing") return { error: "This question is not accepting answers.", status: 409, readOnly: true };
        if (room.answered.includes(playerId)) return { error: "You have already answered this question.", status: 409, readOnly: true };
        const index = data.index;
        if (!Number.isInteger(index) || index < 0 || index > 3) return { error: "Invalid answer.", status: 400, readOnly: true };
        room.answered.push(playerId);
        const question = bank[room.questionIndex];
        if (index === question.answer && !room.winnerId) {
          room.winnerId = playerId;
          player.score += POINTS_FOR_CORRECT; player.roundScore = (player.roundScore || 0) + POINTS_FOR_CORRECT;
          room.answerReveal = { correctIndex: question.answer, message: `${player.name} was fastest with the correct answer! +${POINTS_FOR_CORRECT} points`, reference: question.reference };
          finalizeRound(room, bank);
          room.status = room.questionIndex === bank.length - 1 ? "finished" : "between";
          return { correct: true, points: POINTS_FOR_CORRECT };
        }
        return { correct: index === question.answer, points: 0, message: index === question.answer ? "Correct, but another player was faster." : "Not quite. You can’t answer again this question." };
      }

      if (actionName === "next") {
        if (room.hostId !== playerId) return { error: "Only the host can continue.", status: 403, readOnly: true };
        if (room.status !== "between") return { error: "The question is not ready to advance.", status: 409, readOnly: true };
        room.questionIndex += 1;
        if (room.questionIndex >= bank.length) {
          room.status = "finished"; room.answerReveal = null; room.deadlineAt = 0;
          return { ok: true };
        }
        room.answered = []; room.answerReveal = null; room.winnerId = null;
        if (room.questionIndex % QUESTIONS_PER_ROUND === 0) {
          room.roundWinner = null;
          room.players.forEach((p: any) => { p.roundScore = 0; });
        }
        room.status = "playing"; room.deadlineAt = now() + ROUND_SECONDS * 1000;
        return { ok: true };
      }
      return { error: "Unknown game action.", status: 400, readOnly: true };
    });

    if (result.error) return result;
    if (result.result?.error) return { error: result.result.error, status: result.result.status || 400 };
    const state = snapshot(result.room, bank, now());
    return { ...(result.result || {}), code, state };
  }

  return async function handler(request: Request) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" } });
    if (request.method !== "POST") return json({ error: "Use POST for game actions." }, 405);
    let body: any;
    try { body = await request.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400); }
    try {
      const result = await action(body);
      const status = result.status || (result.error ? 400 : 200);
      return json(result, status);
    } catch (error) {
      console.error("Bible Buzz function error", error);
      return json({ error: "The game service had a temporary problem. Please try again." }, 500);
    }
  };
}

