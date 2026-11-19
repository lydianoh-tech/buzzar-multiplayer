const ENDPOINT = "/.netlify/functions/game";
const PLAYER_KEY = "bibleBuzzPlayerId";
const ROOM_KEY = "bibleBuzzRoomCode";

function getPlayerId() {
  let id = sessionStorage.getItem(PLAYER_KEY);
  if (!id) {
    id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(PLAYER_KEY, id);
  }
  return id;
}

export function io() {
  const id = getPlayerId();
  const listeners = new Map();
  let roomCode = sessionStorage.getItem(ROOM_KEY) || "";
  let pollTimer = null;
  let stopped = false;
  let reportingError = false;

  const emitEvent = (event, value) => (listeners.get(event) || []).forEach(fn => fn(value));
  async function call(action, payload = {}) {
    const response = await fetch(ENDPOINT, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, playerId: id, code: roomCode, ...payload })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok && !result.error) result.error = `Request failed (${response.status}).`;
    return result;
  }
  async function poll() {
    if (stopped || !roomCode) return;
    try {
      const result = await call("state");
      if (result.error) {
        if (result.status === 404) { sessionStorage.removeItem(ROOM_KEY); roomCode = ""; }
        throw new Error(result.error);
      }
      reportingError = false;
      emitEvent("room:update", result.state);
    } catch (error) {
      if (!reportingError) emitEvent("connect_error", error);
      reportingError = true;
    }
  }
  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    if (!roomCode) return;
    poll();
    pollTimer = setInterval(poll, 900);
  }

  const socket = {
    id,
    on(event, handler) { if (!listeners.has(event)) listeners.set(event, []); listeners.get(event).push(handler); return socket; },
    off(event, handler) {
      if (!listeners.has(event)) return socket;
      if (!handler) listeners.delete(event);
      else listeners.set(event, listeners.get(event).filter(fn => fn !== handler));
      return socket;
    },
    emit(event, payload, callback) {
      const map = { "room:create": "create", "room:join": "join", "game:start": "start", "answer:submit": "answer", "game:next": "next" };
      const action = map[event];
      if (!action) { callback?.({ error: "Unsupported game action." }); return socket; }
      const body = { ...(payload || {}) };
      if (event === "room:join") body.code = String(body.code || "").toUpperCase();
      call(action, body).then(result => {
        if (result.error) { callback?.(result); return; }
        if (result.code) { roomCode = result.code; sessionStorage.setItem(ROOM_KEY, roomCode); startPolling(); }
        if (result.state) emitEvent("room:update", result.state);
        callback?.(result);
      }).catch(error => callback?.({ error: error.message || "Could not reach the game service." }));
      return socket;
    },
    disconnect() { stopped = true; if (pollTimer) clearInterval(pollTimer); }
  };
  if (roomCode) startPolling();
  return socket;
}
