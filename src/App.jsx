import { useEffect, useMemo, useState } from "react";
import { io } from "./gameClient.js";

const socket = io(import.meta.env.VITE_SERVER_URL || "/", { autoConnect: true });
const avatarChoices = [
  { icon: "🧍🏻‍♀️", label: "Woman, light skin" }, { icon: "🧍🏼‍♀️", label: "Woman, medium-light skin" },
  { icon: "🧍🏽‍♀️", label: "Woman, medium skin" }, { icon: "🧍🏾‍♀️", label: "Woman, medium-dark skin" },
  { icon: "🧍🏿‍♀️", label: "Woman, dark skin" }, { icon: "🧍🏻‍♂️", label: "Man, light skin" },
  { icon: "🧍🏼‍♂️", label: "Man, medium-light skin" }, { icon: "🧍🏽‍♂️", label: "Man, medium skin" },
  { icon: "🧍🏾‍♂️", label: "Man, medium-dark skin" }, { icon: "🧍🏿‍♂️", label: "Man, dark skin" },
  { icon: "🧍🏻", label: "Person, light skin" }, { icon: "🧍🏼", label: "Person, medium-light skin" },
  { icon: "🧍🏽", label: "Person, medium skin" }, { icon: "🧍🏾", label: "Person, medium-dark skin" },
  { icon: "🧍🏿", label: "Person, dark skin" }, { icon: "🧍‍♀️", label: "Woman, default skin tone" }
];
const avatarColors = [
  { name: "Lime", value: "#b9e47a" }, { name: "Gold", value: "#f4c76b" },
  { name: "Sky", value: "#7dd3fc" }, { name: "Rose", value: "#f9a8d4" },
  { name: "Lavender", value: "#c4b5fd" }, { name: "Coral", value: "#fda58b" }
];

const initialRules = [
  "Create a room and share the five-character code with friends.",
  "At least 2 players are required; up to 12 can join before the host starts.",
  "There are 5 rounds with 5 questions each (25 questions total). Each question stays open for up to 20 seconds.",
  "Each player gets one answer per question. The first correct answer earns 100 points.",
  "Incorrect answers earn 0 points. If nobody answers correctly, the timer reveals the answer.",
  "The highest total score after all 5 rounds (25 questions) wins. Ties share the top spot."
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
  const [welcomePhase, setWelcomePhase] = useState("entering");

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setWelcomePhase("exiting"), 1700);
    const removeTimer = window.setTimeout(() => setWelcomePhase("hidden"), 2350);
    return () => { window.clearTimeout(exitTimer); window.clearTimeout(removeTimer); };
  }, []);

  useEffect(() => {
    socket.on("room:update", state => {
      setRoom(state);
      setRoomCode(state.code);
      setBusy(false);
    });
    socket.on("connect_error", () => setError("Could not reach the game service. Please check your connection and try again."));
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
    {welcomePhase !== "hidden" && <div className={`welcome-overlay ${welcomePhase}`} role="status" aria-label="Welcome to Bible Buzz">
      <div className="welcome-glow welcome-glow-one" aria-hidden="true" />
      <div className="welcome-glow welcome-glow-two" aria-hidden="true" />
      <div className="welcome-stars" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span><span>✧</span><span>✦</span><span>✧</span></div>
      <div className="welcome-content">
        <div className="welcome-emblem" aria-hidden="true"><span>✦</span></div>
        <div className="welcome-kicker">SCRIPTURE · FRIENDSHIP · FUN</div>
        <div className="welcome-title">BIBLE <strong>BUZZ</strong></div>
        <p className="welcome-tagline">Know the Word. Beat the buzzer.</p>
        <div className="welcome-loading" aria-hidden="true"><span /></div>
      </div>
    </div>}
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
        <div className="room-banner"><div><span className="eyebrow">GAME ROOM</span><h2>{room.status === "lobby" ? "Waiting room" : room.status === "finished" ? "Game complete" : `Round ${Math.min(Math.floor(room.round / 5) + 1, 5)} of 5`}</h2></div><button className="secondary-btn" onClick={copyInvite}>↗ Share invite</button></div>
        <div className="room-code-panel"><span>ROOM CODE</span><strong>{roomCode}</strong><button onClick={copyInvite} aria-label="Copy invite">Copy invite ↗</button></div>
        {room.status === "lobby" && <div className="question-card lobby-card">
          <div className="card-icon">✦</div><div className="eyebrow">GATHER YOUR PLAYERS</div><h1>Let the fellowship begin.</h1><p>Share the room code with your friends. The host can start when at least two players have joined.</p>
          <div className="waiting-count">{room.players.length} / 12 players joined</div>
          {isHost ? <button className="primary-btn" onClick={startGame} disabled={room.players.length < 2}>Start 5-round game (25 questions) →</button> : <div className="waiting-pill"><span className="pulse" /> Waiting for host to start…</div>}
        </div>}
        {room.status === "playing" && room.question && <div className="question-card">
          <div className="question-meta"><span className="category-pill">{room.question.category}</span><span className={`timer ${room.secondsLeft <= 5 ? "urgent" : ""}`}>◷ {room.secondsLeft}s</span></div>
          <div className="round-progress">{Array.from({length:5}, (_, i) => <span key={i} className={i <= Math.floor(room.round / 5) ? "filled" : ""}/>)}</div>
          <div className="eyebrow">ROUND {Math.floor(room.round / 5) + 1} OF 5 · QUESTION {(room.round % 5) + 1} OF 5</div>
          <h1>{room.question.question}</h1>
          <div className="answer-grid">{room.question.options.map((option, i) => <button key={option} className="answer-btn" disabled={answered} onClick={() => submitAnswer(i)}><span>{String.fromCharCode(65+i)}</span>{option}</button>)}</div>
          {answered && <p className="answer-note">Answer locked in — watch the scoreboard!</p>}
          {notice && <p className="notice-msg">{notice}</p>}
        </div>}
        {room.status === "between" && <div className="question-card result-card">
          <div className="result-symbol">✓</div><div className="eyebrow">{(room.round % 5) === 4 ? `ROUND ${Math.floor(room.round / 5) + 1} COMPLETE` : `QUESTION ${(room.round % 5) + 1} COMPLETE`}</div><h1>{room.answerReveal?.message || "Question complete!"}</h1>
          <p>Correct answer: <strong>{room.question?.options[room.answerReveal?.correctIndex]}</strong></p><p className="scripture-ref">Read more: {room.answerReveal?.reference}</p>
          {(room.round % 5) === 4 && room.roundWinner && <div className="round-winner-banner">
            <div className="eyebrow">🏆 ROUND {room.roundWinner.round} WINNER{room.roundWinner.players.length === 1 ? "" : "S"}</div>
            {room.roundWinner.players.length ? <strong>{room.roundWinner.players.map(p => p.name).join(" & ")}</strong> : <strong>No points scored this round</strong>}
            {room.roundWinner.players.length > 0 && <span>{room.roundWinner.score} round points</span>}
          </div>}
          {isHost ? <button className="primary-btn" onClick={nextRound}>{(room.round % 5) === 4 ? "Next round →" : "Next question →"}</button> : <div className="waiting-pill"><span className="pulse"/> Waiting for host to continue…</div>}
        </div>}
        {room.status === "finished" && <div className="question-card result-card final-card">
          <div className="result-symbol">♛</div><div className="eyebrow">FINAL SCORE</div><h1>{leaderboard[0]?.name ? `${leaderboard[0].name} wins!` : "Game complete!"}</h1><p>Congratulations to every player who joined the challenge.</p>
          {room.roundWinner && <div className="round-winner-banner final-round-winner"><div className="eyebrow">🏆 ROUND {room.roundWinner.round} WINNER{room.roundWinner.players.length === 1 ? "" : "S"}</div><strong>{room.roundWinner.players.length ? room.roundWinner.players.map(p => p.name).join(" & ") : "No points scored this round"}</strong>{room.roundWinner.players.length > 0 && <span>{room.roundWinner.score} round points</span>}</div>}
          <div className="winner-celebration" aria-label="Winner celebration">
            <div className="dance-stage" aria-hidden="true"><span className="dance-spark spark-one">✦</span><span className="dance-spark spark-two">✧</span><span className="dance-spark spark-three">✦</span><span className="dance-confetti confetti-one"/><span className="dance-confetti confetti-two"/><span className="dance-confetti confetti-three"/><span className="dance-confetti confetti-four"/><div className="winner-dancer" style={{ "--avatar-color": leaderboard[0]?.avatarColor || "#b9e47a" }} aria-label={`${leaderboard[0]?.name || "Winner"} dancing`}>
              <svg className="dancing-person" viewBox="0 0 140 170" role="img" aria-label="Animated person dancing">
                <defs>
                  <linearGradient id="dancerOutfit" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--avatar-color)"/><stop offset="100%" stopColor="#6eaa55"/></linearGradient>
                  <linearGradient id="dancerSkin" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#e8b58e"/><stop offset="100%" stopColor="#b97954"/></linearGradient>
                </defs>
                <ellipse className="dancer-shadow" cx="70" cy="157" rx="35" ry="6" />
                <g className="dancer-left-leg"><path d="M62 112 L53 137 L43 151" fill="none" stroke="#e8b58e" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/><path d="M42 151 L30 151" fill="none" stroke="#f4c76b" strokeWidth="8" strokeLinecap="round"/></g>
                <g className="dancer-right-leg"><path d="M78 112 L87 135 L100 146" fill="none" stroke="#e8b58e" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/><path d="M100 146 L111 143" fill="none" stroke="#f4c76b" strokeWidth="8" strokeLinecap="round"/></g>
                <path className="dancer-torso" d="M52 66 Q70 58 88 66 L94 111 Q70 123 46 111 Z" fill="url(#dancerOutfit)" stroke="#d9f5a7" strokeWidth="1.5"/>
                <g className="dancer-left-arm"><path d="M53 73 Q36 65 30 48 L20 34" fill="none" stroke="url(#dancerSkin)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/><circle cx="20" cy="33" r="6" fill="#e8b58e"/></g>
                <g className="dancer-right-arm"><path d="M87 73 Q105 64 109 47 L119 31" fill="none" stroke="url(#dancerSkin)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/><circle cx="120" cy="30" r="6" fill="#e8b58e"/></g>
                <g className="dancer-head"><circle cx="70" cy="43" r="22" fill="url(#dancerSkin)"/><path d="M49 39 Q48 17 70 18 Q91 18 92 39 L86 33 Q70 27 54 36 Z" fill="#3a251c"/><circle cx="62" cy="44" r="2" fill="#38241b"/><circle cx="78" cy="44" r="2" fill="#38241b"/><path d="M63 52 Q70 59 78 51" fill="none" stroke="#7b3d2d" strokeWidth="2.5" strokeLinecap="round"/></g>
                <path d="M58 69 Q70 75 82 69" fill="none" stroke="#ffffff" strokeWidth="2" opacity=".65"/>
              </svg>
              <span className="dancer-name">{leaderboard[0]?.avatar || "🏆"}</span>
            </div></div>
            <div className="final-winner"><span>🏆</span><div><small>CHAMPION</small><strong>{leaderboard[0]?.name || "—"}</strong></div><b>{leaderboard[0]?.score ?? 0} pts</b></div>
            <p className="dance-caption">🎉 Victory dance! What a champion! 🎉</p>
          </div>
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