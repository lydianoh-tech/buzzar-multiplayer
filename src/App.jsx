import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SERVER_URL || "/", { autoConnect: true });
const avatarChoices = [
  { icon: "🦁", label: "Lion" }, { icon: "🕊️", label: "Dove" },
  { icon: "👑", label: "Royal" }, { icon: "🌟", label: "Star" },
  { icon: "🦋", label: "Butterfly" }, { icon: "🌻", label: "Sunflower" },
  { icon: "🧑🏽‍🦱", label: "Curly" }, { icon: "👩🏾‍🦰", label: "Red curls" },
  { icon: "🧔🏻", label: "Beard" }, { icon: "👩🏻‍🦳", label: "Silver" },
  { icon: "🧑🏿‍🦲", label: "Bold" }, { icon: "🐑", label: "Lamb" }
];
const avatarColors = [
  { name: "Lime", value: "#b9e47a" }, { name: "Gold", value: "#f4c76b" },
  { name: "Sky", value: "#7dd3fc" }, { name: "Rose", value: "#f9a8d4" },
  { name: "Lavender", value: "#c4b5fd" }, { name: "Coral", value: "#fda58b" }
];

const initialRules = [
  "Create a room and share the five-character code with friends.",
  "At least 2 players are required; up to 12 can join before the host starts.",
  "There are 5 rounds. Each question stays open for up to 20 seconds.",
  "Each player gets one answer per question. The first correct answer earns 100 points.",
  "Incorrect answers earn 0 points. If nobody answers correctly, the timer reveals the answer.",
  "The highest total score after Round 5 wins. Ties share the top spot."
];

export default function App() {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(() => localStorage.getItem("bibleBuzzAvatar") || "🦁");
  const [avatarColor, setAvatarColor] = useState(() => localStorage.getItem("bibleBuzzAvatarColor") || "#b9e47a");
  const [codeInput, setCodeInput] = useState("");
  const [room, setRoom] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    socket.on("room:update", state => {
      setRoom(state);
      setRoomCode(state.code);
      setBusy(false);
    });
    socket.on("connect_error", () => setError("Could not connect to the game server. If you are running locally, start it with npm run dev."));
    return () => { socket.off("room:update"); socket.off("connect_error"); };
  }, []);

  const me = useMemo(() => room?.players.find(p => p.id === socket.id), [room]);
  const isHost = room?.hostId === socket.id;
  const leaderboard = useMemo(() => [...(room?.players || [])].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)), [room]);
  const answered = Boolean(me?.answered);

  function createRoom(e) {
    e.preventDefault(); setError(""); setNotice("");
    localStorage.setItem("bibleBuzzAvatar", avatar);
    localStorage.setItem("bibleBuzzAvatarColor", avatarColor);
    socket.emit("room:create", { name, avatar, avatarColor }, result => {
      if (result?.error) return setError(result.error);
      setRoomCode(result.code); setRoom(result.state);
    });
  }
  function joinRoom(e) {
    e.preventDefault(); setError(""); setNotice("");
    localStorage.setItem("bibleBuzzAvatar", avatar);
    localStorage.setItem("bibleBuzzAvatarColor", avatarColor);
    socket.emit("room:join", { name, code: codeInput, avatar, avatarColor }, result => {
      if (result?.error) return setError(result.error);
      setRoomCode(result.code); setRoom(result.state);
    });
  }
  function startGame() {
    setError(""); socket.emit("game:start", result => { if (result?.error) setError(result.error); });
  }
  function submitAnswer(index) {
    if (answered || room?.status !== "playing") return;
    setError(""); setNotice("");
    socket.emit("answer:submit", { index }, result => {
      if (result?.error) setError(result.error);
      else setNotice(result?.message || (result?.correct ? `Correct! +${result.points} points.` : "Answer submitted."));
    });
  }
  function nextRound() {
    setError(""); socket.emit("game:next", result => { if (result?.error) setError(result.error); });
  }
  async function copyInvite() {
    const url = `${window.location.origin}/?room=${roomCode}`;
    try { await navigator.clipboard.writeText(`Join my Bible Buzz game! Room code: ${roomCode}\n${url}`); setNotice("Invite link and room code copied!"); }
    catch { setNotice(`Share this room code: ${roomCode}`); }
  }
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invited = params.get("room");
    if (invited) setCodeInput(invited.toUpperCase());
  }, []);

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="/" aria-label="Bible Buzz home"><span className="brand-mark">✦</span><span>BIBLE <b>BUZZ</b></span></a>
      <span className="live-label"><i /> LIVE MULTIPLAYER</span>
    </header>

    {!room ? <section className="landing">
      <div className="hero-copy">
        <div className="hero-orbit" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span></div>
        <div className="eyebrow">SCRIPTURE • SPEED • FRIENDSHIP</div>
        <h1>Know the Word.<br/><em>Beat the buzzer.</em></h1>
        <p className="hero-description">A live Bible trivia challenge for friends, family, and fellowship. Join from anywhere and see who knows their Scripture best.</p>
        <div className="hero-stats"><div><strong>05</strong><span>ROUNDS</span></div><div><strong>20s</strong><span>PER QUESTION</span></div><div><strong>100</strong><span>POINTS TO WIN</span></div></div>
      </div>
      <div className="join-card">
        <div className="card-icon">✧</div><h2>Ready to play?</h2><p>Choose a name, then host a game or join a friend.</p>
        <div className="avatar-builder">
          <div className="avatar-builder-heading">
            <div><span className="eyebrow">MAKE IT YOURS</span><h3>Choose your avatar</h3></div>
            <div className="avatar-preview" style={{ "--avatar-color": avatarColor }}>{avatar}</div>
          </div>
          <div className="avatar-grid" role="group" aria-label="Choose an avatar">
            {avatarChoices.map(choice => <button type="button" key={choice.icon} title={choice.label} aria-label={choice.label} aria-pressed={avatar === choice.icon} className={`avatar-choice ${avatar === choice.icon ? "selected" : ""}`} onClick={() => setAvatar(choice.icon)}>{choice.icon}</button>)}
          </div>
          <div className="color-picker-label">AVATAR GLOW</div>
          <div className="avatar-colors" role="group" aria-label="Choose avatar color">
            {avatarColors.map(color => <button type="button" key={color.value} title={color.name} aria-label={`${color.name} avatar glow`} aria-pressed={avatarColor === color.value} className={`color-choice ${avatarColor === color.value ? "selected" : ""}`} style={{ "--swatch": color.value }} onClick={() => setAvatarColor(color.value)} />)}
          </div>
        </div>
        <label htmlFor="playerName">YOUR PLAYER NAME</label>
        <input id="playerName" maxLength="22" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" required />
        <button className="primary-btn full" disabled={!name.trim()} onClick={createRoom}>＋ Create a room</button>
        <div className="or-divider"><span>OR JOIN A FRIEND</span></div>
        <form onSubmit={joinRoom} className="join-form">
          <input aria-label="Room code" maxLength="5" value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} placeholder="5-CHARACTER CODE" />
          <button className="secondary-btn" disabled={!name.trim() || codeInput.trim().length !== 5}>Join</button>
        </form>
        {error && <p className="error-msg">{error}</p>}
        <div className="secure-note">✦ No account needed · Up to 12 players</div>
      </div>
      <section className="rules-card">
        <div><div className="eyebrow">HOW IT WORKS</div><h2>Simple rules. Friendly competition.</h2></div>
        <ol>{initialRules.map((rule, i) => <li key={rule}><span>{String(i + 1).padStart(2, "0")}</span>{rule}</li>)}</ol>
      </section>
    </section> : <section className="game-layout">
      <div className="game-main">
        <div className="room-banner"><div><span className="eyebrow">GAME ROOM</span><h2>{room.status === "lobby" ? "Waiting room" : room.status === "finished" ? "Game complete" : `Round ${Math.min(room.round + 1, 5)} of 5`}</h2></div><button className="secondary-btn" onClick={copyInvite}>↗ Share invite</button></div>
        <div className="room-code-panel"><span>ROOM CODE</span><strong>{roomCode}</strong><button onClick={copyInvite} aria-label="Copy invite">Copy invite ↗</button></div>
        {room.status === "lobby" && <div className="question-card lobby-card">
          <div className="card-icon">✦</div><div className="eyebrow">GATHER YOUR PLAYERS</div><h1>Let the fellowship begin.</h1><p>Share the room code with your friends. The host can start when at least two players have joined.</p>
          <div className="waiting-count">{room.players.length} / 12 players joined</div>
          {isHost ? <button className="primary-btn" onClick={startGame} disabled={room.players.length < 2}>Start 5-round game →</button> : <div className="waiting-pill"><span className="pulse" /> Waiting for host to start…</div>}
        </div>}
        {room.status === "playing" && room.question && <div className="question-card">
          <div className="question-meta"><span className="category-pill">{room.question.category}</span><span className={`timer ${room.secondsLeft <= 5 ? "urgent" : ""}`}>◷ {room.secondsLeft}s</span></div>
          <div className="round-progress">{Array.from({length:5}, (_, i) => <span key={i} className={i <= room.round ? "filled" : ""}/>)}</div>
          <div className="eyebrow">QUESTION {room.round + 1} / 5</div>
          <h1>{room.question.question}</h1>
          <div className="answer-grid">{room.question.options.map((option, i) => <button key={option} className="answer-btn" disabled={answered} onClick={() => submitAnswer(i)}><span>{String.fromCharCode(65+i)}</span>{option}</button>)}</div>
          {answered && <p className="answer-note">Answer locked in — watch the scoreboard!</p>}
          {notice && <p className="notice-msg">{notice}</p>}
        </div>}
        {room.status === "between" && <div className="question-card result-card">
          <div className="result-symbol">✓</div><div className="eyebrow">ROUND {room.round + 1} COMPLETE</div><h1>{room.answerReveal?.message || "Round complete!"}</h1>
          <p>Correct answer: <strong>{room.question?.options[room.answerReveal?.correctIndex]}</strong></p><p className="scripture-ref">Read more: {room.answerReveal?.reference}</p>
          {isHost ? <button className="primary-btn" onClick={nextRound}>Next round →</button> : <div className="waiting-pill"><span className="pulse"/> Waiting for host to continue…</div>}
        </div>}
        {room.status === "finished" && <div className="question-card result-card final-card">
          <div className="result-symbol">♛</div><div className="eyebrow">FINAL SCORE</div><h1>{leaderboard[0]?.name ? `${leaderboard[0].name} wins!` : "Game complete!"}</h1><p>Congratulations to every player who joined the challenge.</p>
          <div className="final-winner"><span>✦</span><div><small>CHAMPION</small><strong>{leaderboard[0]?.name || "—"}</strong></div><b>{leaderboard[0]?.score ?? 0} pts</b></div>
          <button className="secondary-btn" onClick={() => { setRoom(null); setRoomCode(""); setNotice(""); setError(""); }}>Back to home</button>
        </div>}
        {error && <p className="error-msg">{error}</p>}
        {notice && room.status !== "playing" && <p className="notice-msg">{notice}</p>}
      </div>
      <aside className="score-panel">
        <div className="score-heading"><div><div className="eyebrow">LIVE STANDINGS</div><h2>Scoreboard</h2></div><span className="player-count">{room.players.length} players</span></div>
        <div className="player-list">{leaderboard.map((player, i) => <div className={`player-row ${player.id === socket.id ? "you" : ""}`} key={player.id}><span className={`rank rank-${i+1}`}>{i === 0 && player.score > 0 ? "♛" : String(i+1).padStart(2,"0")}</span><div className="player-avatar" style={{ "--avatar-color": player.avatarColor || "#b9e47a" }}>{player.avatar || player.name.slice(0,1).toUpperCase()}</div><div className="player-info"><strong>{player.name}{player.id === socket.id ? " (you)" : ""}</strong><small>{player.id === room.hostId ? "HOST" : player.answered && room.status === "playing" ? "ANSWERED" : "PLAYER"}</small></div><b className="score">{player.score}</b></div>)}</div>
        <div className="score-foot"><span>✦</span> Fastest correct answer earns 100 points.</div>
      </aside>
    </section>}
    <footer><span>✦ BIBLE BUZZ</span><span>Play fair. Learn together. Grow in the Word.</span></footer>
  </main>;
}