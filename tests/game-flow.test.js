import test from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "../netlify/lib/gameHandler.ts";
import { questions } from "../netlify/lib/gameEngine.ts";

class MemoryStore {
  constructor() { this.values = new Map(); this.version = 0; }
  async getWithMetadata(key) {
    const entry = this.values.get(key);
    return entry ? { data: structuredClone(entry.data), etag: entry.etag, metadata: {} } : null;
  }
  async setJSON(key, data, options = {}) {
    const old = this.values.get(key);
    if (options.onlyIfNew && old) return { modified: false };
    if (options.onlyIfMatch && (!old || old.etag !== options.onlyIfMatch)) return { modified: false };
    const etag = `"test-${++this.version}"`;
    this.values.set(key, { data: structuredClone(data), etag });
    return { modified: true, etag };
  }
}

function createRequest(handler, payload) {
  return handler(new Request("http://localhost/.netlify/functions/game", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload)
  }));
}
async function send(handler, payload) {
  const response = await createRequest(handler, payload);
  const body = await response.json();
  assert.ok(response.ok, `${payload.action} failed: ${JSON.stringify(body)}`);
  return body;
}

test("two players complete three rounds with per-round winners and final scoring", async () => {
  const store = new MemoryStore();
  let now = 1_800_000_000_000;
  const bank = questions.slice(0, 15);
  const handler = createHandler(store, { questions: bank, now: () => now, random: (() => { let n = 0; return () => ((n++ % 29) + 1) / 31; })() });
  const hostId = "player-lydi";
  const guestId = "player-grace";
  const created = await send(handler, { action: "create", playerId: hostId, name: "Lydia", avatar: "🧍‍♀️", avatarColor: "#b9e47a" });
  const code = created.code;
  await send(handler, { action: "join", playerId: guestId, code, name: "Grace", avatar: "🧍🏽‍♀️", avatarColor: "#f9a8d4" });
  await send(handler, { action: "start", playerId: hostId, code });

  for (let q = 0; q < bank.length; q += 1) {
    const current = (await send(handler, { action: "state", playerId: hostId, code })).state;
    assert.equal(current.status, "playing");
    assert.equal(current.round, q);
    assert.equal(current.question.question, bank[q].question);
    const winnerId = q < 10 ? hostId : guestId;
    const loserId = winnerId === hostId ? guestId : hostId;
    const wrong = (bank[q].answer + 1) % 4;
    await send(handler, { action: "answer", playerId: loserId, code, index: wrong });
    const result = await send(handler, { action: "answer", playerId: winnerId, code, index: bank[q].answer });
    assert.equal(result.correct, true);
    assert.equal(result.points, 100);
    const after = result.state;
    if ((q % 5) === 4) {
      assert.equal(after.roundWinner.round, Math.floor(q / 5) + 1);
      assert.equal(after.roundWinner.score, 500);
      assert.equal(after.roundWinner.players[0].id, winnerId);
    }
    if (q < bank.length - 1) await send(handler, { action: "next", playerId: hostId, code });
  }
  const final = (await send(handler, { action: "state", playerId: hostId, code })).state;
  assert.equal(final.status, "finished");
  assert.equal(final.totalRounds, 3);
  assert.equal(final.totalQuestions, 15);
  assert.equal(final.players.find(p => p.id === hostId).score, 1000);
  assert.equal(final.players.find(p => p.id === guestId).score, 500);
  assert.equal([...final.players].sort((a,b) => b.score-a.score)[0].id, hostId);
  assert.equal(final.roundWinner.round, 3);
  assert.equal(final.roundWinner.players[0].id, guestId);
});
