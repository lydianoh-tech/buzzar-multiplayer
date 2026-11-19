export const ROUND_SECONDS = 20;
export const POINTS_FOR_CORRECT = 100;
export const DEFAULT_TOTAL_ROUNDS = 5;
export const QUESTIONS_PER_ROUND = 5;
export const questions = [
  { category: "Genesis", question: "Who built an ark to survive the great flood?", options: ["Abraham", "Noah", "Moses", "David"], answer: 1, reference: "Genesis 6–9" },
  { category: "The Gospels", question: "In which town was Jesus born?", options: ["Nazareth", "Jerusalem", "Bethlehem", "Capernaum"], answer: 2, reference: "Matthew 2:1; Luke 2:4–7" },
  { category: "Old Testament", question: "Who defeated Goliath?", options: ["Saul", "Jonathan", "Samson", "David"], answer: 3, reference: "1 Samuel 17:45–50" },
  { category: "The Exodus", question: "How many commandments did God give Moses on the stone tablets?", options: ["Seven", "Ten", "Twelve", "Forty"], answer: 1, reference: "Exodus 20:1–17" },
  { category: "The New Testament", question: "Which disciple denied knowing Jesus three times?", options: ["Peter", "John", "Thomas", "Andrew"], answer: 0, reference: "Luke 22:54–62" },
  { category: "Genesis", question: "Who was the first woman?", options: ["Sarah", "Eve", "Rebekah", "Rachel"], answer: 1, reference: "Genesis 2:21–23" },
  { category: "Genesis", question: "What did God create on the first day?", options: ["Animals", "The sun and moon", "Light", "People"], answer: 2, reference: "Genesis 1:3–5" },
  { category: "Genesis", question: "Who was sold by his brothers and taken to Egypt?", options: ["Isaac", "Joseph", "Jacob", "Benjamin"], answer: 1, reference: "Genesis 37:28" },
  { category: "Genesis", question: "What sign did God give as a covenant after the flood?", options: ["A dove", "A rainbow", "A burning bush", "A star"], answer: 1, reference: "Genesis 9:12–17" },
  { category: "Genesis", question: "Who was Abraham’s wife?", options: ["Leah", "Rachel", "Sarah", "Miriam"], answer: 2, reference: "Genesis 17:15" },
  { category: "The Exodus", question: "Who was Moses’ brother?", options: ["Aaron", "Joshua", "Caleb", "Gideon"], answer: 0, reference: "Exodus 4:14" },
  { category: "The Exodus", question: "What sea did the Israelites cross when leaving Egypt?", options: ["Dead Sea", "Red Sea", "Sea of Galilee", "Mediterranean Sea"], answer: 1, reference: "Exodus 14:21–22" },
  { category: "The Exodus", question: "What food did God provide for the Israelites in the wilderness?", options: ["Fish and bread", "Manna", "Grapes", "Olives"], answer: 1, reference: "Exodus 16:14–15" },
  { category: "Old Testament", question: "Who was known for his great strength?", options: ["Samson", "Solomon", "Samuel", "Elijah"], answer: 0, reference: "Judges 16:17" },
  { category: "Old Testament", question: "Who became king after Saul?", options: ["Solomon", "David", "Rehoboam", "Josiah"], answer: 1, reference: "2 Samuel 5:3–4" },
  { category: "Old Testament", question: "Which king was famous for his wisdom?", options: ["Ahab", "Hezekiah", "Solomon", "Saul"], answer: 2, reference: "1 Kings 3:9–12" },
  { category: "Old Testament", question: "Who was swallowed by a great fish?", options: ["Jonah", "Job", "Amos", "Micah"], answer: 0, reference: "Jonah 1:17" },
  { category: "Old Testament", question: "Which prophet challenged the prophets of Baal on Mount Carmel?", options: ["Isaiah", "Jeremiah", "Elijah", "Elisha"], answer: 2, reference: "1 Kings 18:20–39" },
  { category: "Old Testament", question: "Who was thrown into a den of lions?", options: ["Joseph", "Daniel", "Ezra", "Nehemiah"], answer: 1, reference: "Daniel 6:16–23" },
  { category: "Old Testament", question: "What did David use to strike Goliath?", options: ["A sword", "A spear", "A sling and stone", "A bow"], answer: 2, reference: "1 Samuel 17:49–50" },
  { category: "The Gospels", question: "Who baptized Jesus?", options: ["Peter", "John the Baptist", "Paul", "Andrew"], answer: 1, reference: "Matthew 3:13–17" },
  { category: "The Gospels", question: "How many apostles did Jesus choose?", options: ["Seven", "Ten", "Twelve", "Forty"], answer: 2, reference: "Luke 6:13" },
  { category: "The Gospels", question: "What was Jesus’ first recorded miracle in John’s Gospel?", options: ["Healing a blind man", "Walking on water", "Turning water into wine", "Feeding five thousand"], answer: 2, reference: "John 2:1–11" },
  { category: "The Gospels", question: "How many loaves were used to feed the five thousand?", options: ["Two", "Five", "Seven", "Twelve"], answer: 1, reference: "Matthew 14:17–21" },
  { category: "The New Testament", question: "Who climbed a sycamore tree to see Jesus?", options: ["Nicodemus", "Zacchaeus", "Bartimaeus", "Lazarus"], answer: 1, reference: "Luke 19:1–6" },
];

export const allowedAvatars = new Set(["🧍🏻‍♀️", "🧍🏼‍♀️", "🧍🏽‍♀️", "🧍🏾‍♀️", "🧍🏿‍♀️", "🧍🏻‍♂️", "🧍🏼‍♂️", "🧍🏽‍♂️", "🧍🏾‍♂️", "🧍🏿‍♂️", "🧍🏻", "🧍🏼", "🧍🏽", "🧍🏾", "🧍🏿", "🧍‍♀️"]);
export const allowedAvatarColors = new Set(["#b9e47a", "#f4c76b", "#7dd3fc", "#f9a8d4", "#c4b5fd", "#fda58b"]);
export const cleanName = value => String(value || "").trim().replace(/[<>]/g, "").slice(0, 22);
export const cleanAvatar = value => allowedAvatars.has(value) ? value : "🦁";
export const cleanAvatarColor = value => allowedAvatarColors.has(value) ? value : "#b9e47a";
export const publicQuestion = q => ({ category: q.category, question: q.question, options: q.options, reference: q.reference });
export const totalRoundsFor = bank => Math.ceil(bank.length / QUESTIONS_PER_ROUND);
export const currentRoundFor = (room) => Math.floor(room.questionIndex / QUESTIONS_PER_ROUND) + 1;
export const currentQuestionFor = (room) => (room.questionIndex % QUESTIONS_PER_ROUND) + 1;

export function finalizeRound(room, bank) {
  if ((room.questionIndex % QUESTIONS_PER_ROUND) !== QUESTIONS_PER_ROUND - 1) return;
  const players = room.players;
  const highScore = Math.max(0, ...players.map(player => player.roundScore || 0));
  const winners = highScore > 0 ? players.filter(player => (player.roundScore || 0) === highScore) : [];
  room.roundWinner = {
    round: currentRoundFor(room), score: highScore,
    players: winners.map(player => ({ id: player.id, name: player.name, avatar: player.avatar, avatarColor: player.avatarColor, roundScore: player.roundScore || 0 }))
  };
}

export function expireQuestionIfNeeded(room, bank, now = Date.now()) {
  if (room.status !== "playing" || now < room.deadlineAt) return false;
  const question = bank[room.questionIndex];
  room.answerReveal = { correctIndex: question.answer, message: "Time is up!", reference: question.reference };
  finalizeRound(room, bank);
  room.status = room.questionIndex === bank.length - 1 ? "finished" : "between";
  return true;
}

export function snapshot(room, bank, now = Date.now()) {
  const q = room.status !== "lobby" && room.status !== "finished" && room.questionIndex < bank.length ? publicQuestion(bank[room.questionIndex]) : null;
  return {
    code: room.code, hostId: room.hostId, status: room.status,
    round: room.questionIndex, totalRounds: totalRoundsFor(bank), totalQuestions: bank.length,
    question: q,
    secondsLeft: room.status === "playing" ? Math.max(0, Math.ceil((room.deadlineAt - now) / 1000)) : 0,
    answerReveal: room.answerReveal,
    players: room.players.map(player => ({ ...player, roundScore: player.roundScore || 0, answered: room.answered.includes(player.id) })),
    winnerId: room.winnerId, roundWinner: room.roundWinner || null
  };
}

export function createRoomState({ code, hostId, name, avatar, avatarColor, now = Date.now() }) {
  return {
    code, hostId, status: "lobby", questionIndex: 0, deadlineAt: now + ROUND_SECONDS * 1000,
    players: [{ id: hostId, name: cleanName(name), avatar: cleanAvatar(avatar), avatarColor: cleanAvatarColor(avatarColor), score: 0, roundScore: 0 }],
    answered: [], answerReveal: null, winnerId: null, roundWinner: null
  };
}
