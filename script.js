// LAST WORD STANDING - Stage 3 (Local Gameplay + Firebase Realtime Multiplayer)

const firebaseConfig = {
  apiKey: "API_KEY_KAMU",
  authDomain: "last-word-standing-e99fb.firebaseapp.com",
  databaseURL: "https://last-word-standing-e99fb-default-rtdb.firebaseio.com",
  projectId: "last-word-standing-e99fb",
  storageBucket: "last-word-standing-e99fb.firebasestorage.app",
  messagingSenderId: "394915963762",
  appId: "1:394915963762:web:51cde099d11ba1834633eb"
};

const hasFirebaseSdk =
  typeof window.firebase !== "undefined" &&
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.startsWith("ISI_");

let auth = null;
let db = null;
let myUid = null;
let roomRef = null;
let serverOffsetMs = 0;

const screens = {
  landing: document.getElementById("landingPage"),
  entry: document.getElementById("entryPage"),
  lobby: document.getElementById("lobbyPage"),
  gameplay: document.getElementById("gameplayPage"),
  winner: document.getElementById("winnerPage")
};

const QUESTION_BANK = [
  {
    category: "SINONIM",
    hint: "Satu kata persamaan makna",
    prompt: "Apa sinonim dari kata 'cermat'?",
    answers: ["teliti", "hati-hati", "hati hati", "saksama", "seksama"]
  },
  {
    category: "ANTONIM",
    hint: "Satu kata lawan makna",
    prompt: "Apa antonim dari kata 'abstrak'?",
    answers: ["konkret", "kongkret", "nyata"]
  },
  {
    category: "KATA BAKU",
    hint: "Ejaan baku sesuai KBBI",
    prompt: "Bentuk baku dari kata 'apotik' adalah...",
    answers: ["apotek"]
  },
  {
    category: "KATA BAKU",
    hint: "Ejaan baku sesuai KBBI",
    prompt: "Bentuk baku dari kata 'resiko' adalah...",
    answers: ["risiko"]
  },
  {
    category: "SINONIM",
    hint: "Satu kata persamaan makna",
    prompt: "Apa sinonim dari kata 'gigih'?",
    answers: ["ulet", "tangguh", "pantang menyerah"]
  },
  {
    category: "ANTONIM",
    hint: "Satu kata lawan makna",
    prompt: "Apa antonim dari kata 'progresif'?",
    answers: ["regresif", "mundur"]
  },
  {
    category: "MAKNA KATA",
    hint: "Istilah umum dalam bahasa Indonesia",
    prompt: "Kata yang memiliki makna sama atau mirip disebut...",
    answers: ["sinonim"]
  },
  {
    category: "MAKNA KATA",
    hint: "Istilah umum dalam bahasa Indonesia",
    prompt: "Kata yang maknanya berlawanan dengan kata lain disebut...",
    answers: ["antonim"]
  },
  {
    category: "KATA BAKU",
    hint: "Ejaan baku sesuai KBBI",
    prompt: "Bentuk baku dari kata 'praktek' adalah...",
    answers: ["praktik"]
  },
  {
    category: "SINONIM",
    hint: "Satu kata persamaan makna",
    prompt: "Apa sinonim dari kata 'wahana'?",
    answers: ["sarana", "wadah", "media"]
  },
  {
    category: "ANTONIM",
    hint: "Satu kata lawan makna",
    prompt: "Apa antonim dari kata 'dinamis'?",
    answers: ["statis"]
  },
  {
    category: "KATA BAKU",
    hint: "Ejaan baku sesuai KBBI",
    prompt: "Bentuk baku dari kata 'nasehat' adalah...",
    answers: ["nasihat"]
  },
  {
    category: "IMBUHAN / AFIKSASI",
    hint: "Kata dasar + awalan 'meng-'",
    prompt: "Bentuk kata berimbuhan 'meng-' yang tepat untuk kata dasar 'pukul' adalah...",
    answers: ["memukul"]
  },
  {
    category: "IMBUHAN / AFIKSASI",
    hint: "Kata dasar + awalan 'meng-'",
    prompt: "Bentuk kata berimbuhan 'meng-' yang tepat untuk kata dasar 'saji' adalah...",
    answers: ["menyaji"]
  },
  {
    category: "MAJAS",
    hint: "Gaya bahasa melebih-lebihkan",
    prompt: "Kalimat 'Suaranya menggelegar membelah angkasa' menggunakan majas...",
    answers: ["hiperbola"]
  },
  {
    category: "UNGKAPAN / IDIOM",
    hint: "Makna kiasan sehari-hari",
    prompt: "Ungkapan untuk orang yang suka membaca buku disebut...",
    answers: ["kutu buku"]
  },
  {
    category: "KATA BAKU",
    hint: "Ejaan baku sesuai KBBI",
    prompt: "Bentuk baku dari kata 'aktifitas' adalah...",
    answers: ["aktivitas"]
  },
  {
    category: "SINONIM",
    hint: "Satu kata persamaan makna",
    prompt: "Apa sinonim dari kata 'mutakhir'?",
    answers: ["terbaru", "terkini", "modern"]
  }
];

const NORMAL_TIME = 12;
const SUDDEN_DEATH_TIME = 8;

const state = {
  roomCode: null,
  players: [],
  isHost: false,
  currentPlayerId: null,
  demoCounter: 0,
  match: {
    active: false,
    round: 1,
    turnIndex: 0,
    activePlayerUid: null,
    timeLeft: NORMAL_TIME,
    maxTime: NORMAL_TIME,
    turnDeadline: null,
    suddenDeath: false,
    currentQuestion: null,
    questionIndex: 0,
    usedQuestionIndexes: [],
    timerId: null,
    advanceTimeoutId: null,
    resolvingTurn: false,
    lastEventKey: null,
    logs: []
  }
};

const $ = (id) => document.getElementById(id);

function showScreen(name) {
  Object.values(screens).forEach(screen => screen.classList.add("hidden"));
  screens[name].classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

let toastTimer;
function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function cleanName(value) {
  return value.trim().replace(/\s+/g, " ").slice(0, 16);
}

function normalizeAnswer(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function makePlayer(name, isHost = false, isDemo = false, customId = null) {
  return {
    id: customId || `player-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    uid: customId || `player-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    name,
    isHost,
    isDemo,
    lives: 3,
    status: "alive", // "alive" | "eliminated"
    score: 0,
    correctCount: 0,
    attempts: 0,
    connected: true,
    joinedAt: Date.now()
  };
}

function getServerNow() {
  return Date.now() + serverOffsetMs;
}

function getAlivePlayers() {
  return state.players.filter(p => p.status === "alive" && p.lives > 0 && p.connected !== false);
}

function getAccuracy(player) {
  if (!player.attempts) return 0;
  return Math.round((player.correctCount / player.attempts) * 100);
}

function addLog(text, type = "neutral") {
  state.match.logs.unshift({ text, type });
  if (state.match.logs.length > 25) {
    state.match.logs.pop();
  }
}

function stopTimers() {
  if (state.match.timerId) {
    clearInterval(state.match.timerId);
    state.match.timerId = null;
  }
  if (state.match.advanceTimeoutId) {
    clearTimeout(state.match.advanceTimeoutId);
    state.match.advanceTimeoutId = null;
  }
}

function setFeedback(message, kind = "neutral") {
  const box = $("feedbackBox");
  box.textContent = message;
  box.className = `feedback-box feedback-${kind}`;
}

// --- INISIALISASI FIREBASE (JIKA SDK & CONFIG SUDAH DIISI) ---
function initFirebase() {
  if (!hasFirebaseSdk) return;

  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.database();

  db.ref(".info/serverTimeOffset").on("value", snap => {
    serverOffsetMs = snap.val() || 0;
  });

  auth.signInAnonymously().catch(err => {
    console.error("Auth error:", err);
    showToast("Gagal masuk sesi anonim Firebase.");
  });

  auth.onAuthStateChanged(user => {
    if (user) {
      myUid = user.uid;
      state.currentPlayerId = user.uid;

      console.log("FIREBASE AUTH BERHASIL");
      console.log("UID:", myUid);

      showToast("Firebase berhasil terhubung!");
    } else {
      myUid = null;
      console.log("FIREBASE AUTH BELUM LOGIN");
      showToast("Firebase belum login, coba lagi..."); 
    }
  });
}

// --- LOBBY & ROOM ---
async function createRoom() {
  console.log("CREATE ROOM: tombol berhasil diklik");

  const name = cleanName($("hostName").value);

  if (!name) {
    return showToast("Masukkan nama pemain terlebih dahulu.");
  }

  if (hasFirebaseSdk) {
    if (!myUid || !db) {
      console.error("Firebase belum siap:", { myUid, db });
      return showToast("Menghubungkan ke Firebase, coba lagi...");
    }

    const code = generateRoomCode();
    const host = makePlayer(name, true, false, myUid);
    host.joinedAt = firebase.database.ServerValue.TIMESTAMP;

    try {
      console.log("Mencoba membuat room:", code);

      await db.ref(`rooms/${code}`).set({
        meta: {
          code,
          hostUid: myUid,
          status: "waiting",
          createdAt: firebase.database.ServerValue.TIMESTAMP
        },
        players: {
          [myUid]: host
        }
      });

      console.log("Room berhasil dibuat:", code);

      attachRoomListener(code);
      showToast("Arena online dibuat! Bagikan kode room.");
      return;

    } catch (error) {
      console.error("CREATE ROOM ERROR:", error);
      showToast("Gagal membuat arena: " + error.message);
      return;
    }
  }

  // Fallback mode lokal jika Firebase belum dikonfigurasi
  state.roomCode = generateRoomCode();
  state.isHost = true;

  const host = makePlayer(name, true, false);
  state.currentPlayerId = host.id;
  state.players = [host];

  renderLobby();
  showScreen("lobby");
  showToast("Arena lokal dibuat. Bagikan kode room!");
}

async function joinRoom() {
  const name = cleanName($("joinName").value);
  const code = $("roomCodeInput").value.trim().toUpperCase();

  if (!name) return showToast("Masukkan nama pemain terlebih dahulu.");
  if (code.length !== 6) return showToast("Kode room harus terdiri dari 6 karakter.");

  if (hasFirebaseSdk) {
    if (!myUid) return showToast("Menghubungkan ke Firebase, coba lagi...");
    const ref = db.ref(`rooms/${code}`);
    const snap = await ref.get();
    if (!snap.exists()) return showToast("Room tidak ditemukan.");

    const roomData = snap.val();
    if (roomData.meta?.status !== "waiting") {
      return showToast("Pertandingan sudah dimulai.");
    }

    const existingPlayers = Object.values(roomData.players || {});
    if (existingPlayers.length >= 15) return showToast("Room sudah penuh.");
    if (existingPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      return showToast("Nama tersebut sudah digunakan di room ini.");
    }

    const player = makePlayer(name, false, false, myUid);
    player.joinedAt = firebase.database.ServerValue.TIMESTAMP;

    await ref.child(`players/${myUid}`).set(player);
    attachRoomListener(code);
    showToast(`${name} bergabung ke arena.`);
    return;
  }

  // Fallback mode lokal
  if (state.roomCode !== code) {
    return showToast("Room tidak ditemukan di sesi lokal ini.");
  }
  if (state.players.length >= 15) return showToast("Room sudah penuh.");
  if (state.players.some(player => player.name.toLowerCase() === name.toLowerCase())) {
    return showToast("Nama tersebut sudah digunakan di room ini.");
  }

  const player = makePlayer(name, false, false);
  state.players.push(player);
  state.currentPlayerId = player.id;
  state.isHost = false;
  renderLobby();
  showScreen("lobby");
  showToast(`${name} berhasil bergabung ke arena.`);
}

async function checkHostMigration(data) {
  if (!hasFirebaseSdk || !roomRef || !data?.meta) return;
  const currentHost = (data.players || {})[data.meta.hostUid];
  if (!currentHost || currentHost.connected === false) {
    const candidates = Object.values(data.players || {})
      .filter(p => p.connected !== false && p.uid !== data.meta.hostUid)
      .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));

    if (candidates.length > 0 && candidates[0].uid === myUid) {
      await roomRef.update({
        "meta/hostUid": myUid,
        [`players/${myUid}/isHost`]: true
      });
      showToast("Kamu kini menjadi HOST baru arena ini.");
    }
  }
}

function attachRoomListener(code) {
  if (roomRef) {
    roomRef.off();
  }
  state.roomCode = code;
  roomRef = db.ref(`rooms/${code}`);

  if (myUid) {
    roomRef.child(`players/${myUid}/connected`).onDisconnect().set(false);
    roomRef.child(`players/${myUid}/connected`).set(true);
  }

  roomRef.on("value", snap => {
    const data = snap.val();
    if (!data) {
      stopTimers();
      state.match.active = false;
      state.roomCode = null;
      state.players = [];
      showToast("Room telah ditutup.");
      showScreen("entry");
      return;
    }

    state.players = Object.values(data.players || {}).sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
    state.isHost = data.meta?.hostUid === myUid;

    const status = data.meta?.status;
    if (status === "waiting") {
      stopTimers();
      state.match.active = false;
      renderLobby();
      showScreen("lobby");
    } else if (status === "playing") {
      showScreen("gameplay");
      syncMatchSnapshot(data.match, data.submissions);
    } else if (status === "finished") {
      stopTimers();
      state.match.active = false;
      const winner = state.players.find(p => p.uid === data.match?.winnerUid) || state.players[0];
      finishMatch(winner, data.match?.round);
    }
  });
}

function renderLobby() {
  $("roomCodeDisplay").textContent = state.roomCode || "------";
  $("playerCount").textContent = String(state.players.length).padStart(2, "0");

  const list = $("playerList");
  list.innerHTML = "";

  state.players.forEach(player => {
    const item = document.createElement("div");
    item.className = "player-item";

    const avatar = document.createElement("div");
    avatar.className = "player-avatar";
    avatar.textContent = player.name.charAt(0).toUpperCase();

    const info = document.createElement("div");
    info.className = "player-info";
    const name = document.createElement("strong");
    name.textContent = player.name;
    const status = document.createElement("small");
    const isMe = player.uid === state.currentPlayerId || player.id === state.currentPlayerId;
    status.textContent = isMe ? "YOU" : (player.isDemo ? "DEMO BOT" : "READY TO PLAY");
    info.append(name, status);
    item.append(avatar, info);

    if (player.isHost) {
      const hostTag = document.createElement("span");
      hostTag.className = "host-tag";
      hostTag.textContent = "HOST";
      item.append(hostTag);
    }
    list.append(item);
  });

  const canStart = state.isHost && state.players.length >= 2;
  $("startGameBtn").disabled = !canStart;
  $("startHint").textContent = state.isHost
    ? (canStart ? "Semua siap? Mulai pertandingan!" : "Tambahkan minimal 1 pemain lagi untuk memulai.")
    : "Menunggu host memulai pertandingan.";
  $("addDemoBtn").style.display = state.isHost ? "inline-flex" : "none";
}

async function addDemoPlayer() {
  if (!state.isHost) return;
  if (state.players.length >= 15) return showToast("Maksimal 15 pemain.");
  state.demoCounter += 1;
  const demoNames = ["WordHunter", "GrammarFox", "SyntaxRider", "LexiStorm", "EjaanMaster", "KataBaku"];
  const name = demoNames[(state.demoCounter - 1) % demoNames.length] + (state.demoCounter > demoNames.length ? state.demoCounter : "");
  const demoPlayer = makePlayer(name, false, true);

  if (hasFirebaseSdk && roomRef) {
    await roomRef.child(`players/${demoPlayer.uid}`).set(demoPlayer);
  } else {
    state.players.push(demoPlayer);
    renderLobby();
  }
  showToast(`${name} ditambahkan sebagai pemain demo.`);
}

async function leaveRoom() {
  stopTimers();
  state.match.active = false;

  if (hasFirebaseSdk && roomRef && myUid) {
    try {
      await roomRef.child(`players/${myUid}/connected`).onDisconnect().cancel();
      if (state.isHost) {
        await roomRef.remove();
      } else {
        await roomRef.child(`players/${myUid}`).remove();
      }
    } catch (err) {
      console.error("Leave room error:", err);
    }
    roomRef.off();
    roomRef = null;
  }

  state.roomCode = null;
  state.players = [];
  state.isHost = false;
  state.demoCounter = 0;
  showScreen("entry");
}

// --- GAMEPLAY ENGINE (HOST / REFEREE & CLIENT SYNC) ---
function pickNextQuestionIndex(usedIndexes = []) {
  const pool = QUESTION_BANK.map((_, idx) => idx).filter(idx => !usedIndexes.includes(idx));
  if (pool.length === 0) {
    return Math.floor(Math.random() * QUESTION_BANK.length);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

async function startMatch() {
  if (!state.isHost || state.players.length < 2) return;

  const firstPlayer = state.players[0];
  const suddenDeath = state.players.length === 2;
  const duration = suddenDeath ? SUDDEN_DEATH_TIME : NORMAL_TIME;
  const qIdx = pickNextQuestionIndex([]);

  if (hasFirebaseSdk && roomRef) {
    const updates = {};
    state.players.forEach(p => {
      updates[`players/${p.uid}/lives`] = 3;
      updates[`players/${p.uid}/status`] = "alive";
      updates[`players/${p.uid}/score`] = 0;
      updates[`players/${p.uid}/correctCount`] = 0;
      updates[`players/${p.uid}/attempts`] = 0;
      updates[`players/${p.uid}/connected`] = true;
    });

    const now = getServerNow();
    updates["submissions"] = null;
    updates["meta/status"] = "playing";
    updates["match"] = {
      round: 1,
      turnIndex: 0,
      activePlayerUid: firstPlayer.uid,
      suddenDeath,
      questionIndex: qIdx,
      usedQuestionIndexes: [qIdx],
      turnDuration: duration,
      turnDeadline: now + duration * 1000,
      resolving: false,
      winnerUid: null,
      lastEvent: {
        id: `evt-${Date.now()}`,
        type: "ok",
        text: `Pertandingan dimulai dengan ${state.players.length} pemain. Setiap pemain punya 3 nyawa.`
      }
    };

    await roomRef.update(updates);
    return;
  }

  // Mode lokal
  state.players.forEach(p => {
    p.lives = 3;
    p.status = "alive";
    p.score = 0;
    p.correctCount = 0;
    p.attempts = 0;
  });

  state.match.active = true;
  state.match.round = 1;
  state.match.turnIndex = 0;
  state.match.suddenDeath = suddenDeath;
  state.match.usedQuestionIndexes = [qIdx];
  state.match.logs = [];
  addLog(`Pertandingan dimulai dengan ${state.players.length} pemain.`, "ok");
  showScreen("gameplay");
  setupLocalTurn(firstPlayer, qIdx, duration);
}

function setupLocalTurn(activePlayer, qIdx, duration) {
  stopTimers();
  state.match.active = true;
  state.match.resolvingTurn = false;
  state.match.activePlayerUid = activePlayer.uid;
  state.match.questionIndex = qIdx;
  state.match.currentQuestion = QUESTION_BANK[qIdx];
  state.match.maxTime = duration;
  state.match.timeLeft = duration;
  state.match.turnDeadline = Date.now() + duration * 1000;

  $("answerInput").value = "";
  $("answerInput").focus();
  renderGameplay(activePlayer);
  startCountdownLoop();
}

function syncMatchSnapshot(matchData, submissions) {
  if (!matchData) return;

  state.match.active = true;
  state.match.round = matchData.round || 1;
  state.match.turnIndex = matchData.turnIndex || 0;
  state.match.activePlayerUid = matchData.activePlayerUid || null;
  state.match.suddenDeath = Boolean(matchData.suddenDeath);
  state.match.questionIndex = matchData.questionIndex || 0;
  state.match.currentQuestion = QUESTION_BANK[state.match.questionIndex] || QUESTION_BANK[0];
  state.match.maxTime = matchData.turnDuration || NORMAL_TIME;
  state.match.turnDeadline = matchData.turnDeadline || (getServerNow() + NORMAL_TIME * 1000);
  state.match.resolvingTurn = Boolean(matchData.resolving);

  if (matchData.lastEvent && matchData.lastEvent.id && matchData.lastEvent.id !== state.match.lastEventKey) {
    state.match.lastEventKey = matchData.lastEvent.id;
    addLog(matchData.lastEvent.text, matchData.lastEvent.type || "neutral");
    setFeedback(matchData.lastEvent.text, matchData.lastEvent.type || "neutral");
  }

  const activePlayer =
    state.players.find(p => p.uid === state.match.activePlayerUid) ||
    getAlivePlayers()[0] ||
    null;

  renderGameplay(activePlayer);
  startCountdownLoop();

  // Host memproses jawaban masuk dari pemain aktif
  if (state.isHost && !state.match.resolvingTurn && activePlayer && submissions && submissions[activePlayer.uid]) {
    const sub = submissions[activePlayer.uid];
    if (sub && sub.round === state.match.round) {
      processTurnResolution(activePlayer, sub.answer || "", false, Math.max(0, Math.round((state.match.turnDeadline - getServerNow()) / 1000)));
    }
  }
}

function startCountdownLoop() {
  if (state.match.timerId) {
    clearInterval(state.match.timerId);
  }

  const tick = () => {
    if (!state.match.active) {
      clearInterval(state.match.timerId);
      return;
    }

    const nowMs = hasFirebaseSdk ? getServerNow() : Date.now();
    const remainingSec = Math.max(0, Math.ceil((state.match.turnDeadline - nowMs) / 1000));
    state.match.timeLeft = remainingSec;
    updateTimerUI();

    if (remainingSec <= 0) {
      clearInterval(state.match.timerId);
      const canReferee = !hasFirebaseSdk || state.isHost;
      if (canReferee && !state.match.resolvingTurn) {
        const activePlayer =
          state.players.find(p => p.uid === state.match.activePlayerUid) ||
          getAlivePlayers()[0];
        if (activePlayer) {
          processTurnResolution(activePlayer, null, true, 0);
        }
      }
    }
  };

  tick();
  state.match.timerId = setInterval(tick, 250);
}

function updateTimerUI() {
  const left = Math.max(0, state.match.timeLeft);
  const ratio = Math.min(100, Math.max(0, (left / state.match.maxTime) * 100));
  $("timerDisplay").textContent = `${left}s`;
  $("timerBar").style.width = `${ratio}%`;
  const timerBox = $("timerDisplay").closest(".timer-box");
  if (left <= 3) {
    timerBox.classList.add("danger");
  } else {
    timerBox.classList.remove("danger");
  }
}

async function processTurnResolution(player, rawAnswer, isTimeout = false, remainingSec = 0) {
  if (state.match.resolvingTurn) return;
  state.match.resolvingTurn = true;
  stopTimers();

  const question = state.match.currentQuestion || QUESTION_BANK[0];
  const validAnswers = question.answers.map(normalizeAnswer);
  const normalizedInput = normalizeAnswer(rawAnswer);
  const isCorrect = !isTimeout && normalizedInput.length > 0 && validAnswers.includes(normalizedInput);

  const nextAttempts = (player.attempts || 0) + 1;
  let nextCorrect = player.correctCount || 0;
  let nextScore = player.score || 0;
  let nextLives = player.lives;
  let eventText = "";
  let eventType = "neutral";
  let eliminatedNow = false;

  if (isCorrect) {
    nextCorrect += 1;
    const pts = 100 + Math.max(0, remainingSec) * 10;
    nextScore += pts;
    eventType = "ok";
    eventText = `BENAR! ${player.name} menjawab "${rawAnswer}" (+${pts} pts).`;
  } else {
    nextLives = Math.max(0, player.lives - 1);
    eliminatedNow = nextLives <= 0;
    eventType = eliminatedNow ? "elim" : "err";
    const reason = isTimeout
      ? `WAKTU HABIS untuk ${player.name}!`
      : `SALAH! Jawaban "${rawAnswer}" milik ${player.name} kurang tepat.`;
    const extra = eliminatedNow
      ? ` Nyawa habis — ${player.name} TERELIMINASI!`
      : ` Sisa nyawa: ${nextLives}. Jawaban valid: "${question.answers[0]}".`;
    eventText = `${reason}${extra}`;
  }

  const nextStatus = nextLives <= 0 ? "eliminated" : "alive";

  // Hitung pemain yang masih bertahan setelah update ini
  const simulatedPlayers = state.players.map(p =>
    p.uid === player.uid
      ? { ...p, lives: nextLives, status: nextStatus, score: nextScore, correctCount: nextCorrect, attempts: nextAttempts }
      : p
  );
  const aliveAfter = simulatedPlayers.filter(p => p.status === "alive" && p.lives > 0 && p.connected !== false);

  if (hasFirebaseSdk && roomRef) {
    const updates = {
      [`players/${player.uid}/lives`]: nextLives,
      [`players/${player.uid}/status`]: nextStatus,
      [`players/${player.uid}/score`]: nextScore,
      [`players/${player.uid}/correctCount`]: nextCorrect,
      [`players/${player.uid}/attempts`]: nextAttempts,
      [`submissions/${player.uid}`]: null,
      "match/resolving": true,
      "match/lastEvent": {
        id: `evt-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
        type: eventType,
        text: eventText
      }
    };
    await roomRef.update(updates);

    state.match.advanceTimeoutId = setTimeout(async () => {
      if (!roomRef || !state.isHost) return;

      if (aliveAfter.length === 1) {
        await roomRef.update({
          "meta/status": "finished",
          "match/winnerUid": aliveAfter[0].uid,
          "match/resolving": false
        });
        return;
      }

      if (aliveAfter.length === 0) {
        const sortedByScore = [...simulatedPlayers].sort((a, b) => b.score - a.score);
        await roomRef.update({
          "meta/status": "finished",
          "match/winnerUid": sortedByScore[0]?.uid || null,
          "match/resolving": false
        });
        return;
      }

      const suddenDeath = aliveAfter.length === 2;
      const duration = suddenDeath ? SUDDEN_DEATH_TIME : NORMAL_TIME;
      const nextTurnIndex = eliminatedNow
        ? state.match.turnIndex % aliveAfter.length
        : (state.match.turnIndex + 1) % aliveAfter.length;
      const nextPlayer = aliveAfter[nextTurnIndex];
      const nextQIdx = pickNextQuestionIndex(state.match.usedQuestionIndexes || []);
      const nextUsed = [...(state.match.usedQuestionIndexes || []), nextQIdx].slice(-QUESTION_BANK.length);
      const sdNote = suddenDeath && !state.match.suddenDeath ? " ⚡ SUDDEN DEATH (8s)!" : "";

      await roomRef.update({
        "match/round": (state.match.round || 1) + 1,
        "match/turnIndex": nextTurnIndex,
        "match/activePlayerUid": nextPlayer.uid,
        "match/suddenDeath": suddenDeath,
        "match/questionIndex": nextQIdx,
        "match/usedQuestionIndexes": nextUsed,
        "match/turnDuration": duration,
        "match/turnDeadline": getServerNow() + duration * 1000,
        "match/resolving": false,
        "match/lastEvent": {
          id: `evt-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          type: suddenDeath ? "elim" : "neutral",
          text: `Ronde ${(state.match.round || 1) + 1}: Giliran ${nextPlayer.name}.${sdNote}`
        }
      });
    }, 1050);
    return;
  }

  // --- MODE LOKAL ---
  player.lives = nextLives;
  player.status = nextStatus;
  player.score = nextScore;
  player.correctCount = nextCorrect;
  player.attempts = nextAttempts;

  addLog(eventText, eventType);
  setFeedback(eventText, eventType);
  renderGameplay(player);

  state.match.advanceTimeoutId = setTimeout(() => {
    if (!state.match.active) return;

    const currentAlive = getAlivePlayers();
    if (currentAlive.length === 1) {
      finishMatch(currentAlive[0], state.match.round);
      return;
    }
    if (currentAlive.length === 0) {
      const sorted = [...state.players].sort((a, b) => b.score - a.score);
      finishMatch(sorted[0], state.match.round);
      return;
    }

    const suddenDeath = currentAlive.length === 2;
    if (suddenDeath && !state.match.suddenDeath) {
      state.match.suddenDeath = true;
      addLog("⚡ SUDDEN DEATH AKTIF! Tersisa 2 pemain — waktu giliran 8 detik!", "elim");
      showToast("⚡ SUDDEN DEATH! Waktu giliran 8 detik.");
    }

    state.match.turnIndex = eliminatedNow
      ? state.match.turnIndex % currentAlive.length
      : (state.match.turnIndex + 1) % currentAlive.length;
    state.match.round += 1;

    const nextPlayer = currentAlive[state.match.turnIndex];
    const nextQIdx = pickNextQuestionIndex(state.match.usedQuestionIndexes);
    state.match.usedQuestionIndexes.push(nextQIdx);
    const duration = suddenDeath ? SUDDEN_DEATH_TIME : NORMAL_TIME;

    setupLocalTurn(nextPlayer, nextQIdx, duration);
  }, 1050);
}

async function handleAnswerSubmit(event) {
  event.preventDefault();
  if (!state.match.active || state.match.resolvingTurn) return;

  const raw = $("answerInput").value.trim();
  if (!raw) return showToast("Ketik jawaban terlebih dahulu.");

  const activePlayer =
    state.players.find(p => p.uid === state.match.activePlayerUid) ||
    getAlivePlayers()[state.match.turnIndex % Math.max(1, getAlivePlayers().length)];

  if (!activePlayer) return;

  if (hasFirebaseSdk && roomRef) {
    if (myUid !== activePlayer.uid) {
      return showToast(`Sekarang giliran ${activePlayer.name}.`);
    }
    $("answerInput").value = "";
    await roomRef.child(`submissions/${myUid}`).set({
      round: state.match.round,
      answer: raw,
      submittedAt: firebase.database.ServerValue.TIMESTAMP
    });
    return;
  }

  $("answerInput").value = "";
  processTurnResolution(activePlayer, raw, false, Math.max(0, state.match.timeLeft));
}

function simulateBotTurn() {
  if (!state.match.active || state.match.resolvingTurn) return;
  const activePlayer =
    state.players.find(p => p.uid === state.match.activePlayerUid) ||
    getAlivePlayers()[0];
  if (!activePlayer) return;

  const q = state.match.currentQuestion || QUESTION_BANK[0];
  const willAnswerRight = Math.random() < 0.7;
  const sampleAns = willAnswerRight ? q.answers[0] : "salah-simulasi";
  processTurnResolution(activePlayer, sampleAns, false, Math.max(0, state.match.timeLeft));
}

function forceTimeoutTurn() {
  if (!state.match.active || state.match.resolvingTurn) return;
  const activePlayer =
    state.players.find(p => p.uid === state.match.activePlayerUid) ||
    getAlivePlayers()[0];
  if (!activePlayer) return;

  processTurnResolution(activePlayer, null, true, 0);
}

function renderGameplay(activePlayer) {
  const alive = getAlivePlayers();
  $("roundBadge").textContent = `ROUND ${String(state.match.round).padStart(2, "0")}`;
  $("aliveBadge").textContent = `ALIVE: ${alive.length}/${state.players.length}`;
  $("suddenDeathBadge").classList.toggle("hidden", !state.match.suddenDeath);
  $("gameplayPage").querySelector(".question-panel")?.classList.toggle("sudden-active", state.match.suddenDeath);

  $("activePlayerTitle").innerHTML = `GILIRAN: <span>${activePlayer ? activePlayer.name.toUpperCase() : "-"}</span>`;
  updateTimerUI();

  if (state.match.currentQuestion) {
    $("questionCategory").textContent = state.match.currentQuestion.category;
    $("questionHint").textContent = state.match.currentQuestion.hint;
    $("questionPrompt").textContent = state.match.currentQuestion.prompt;
  }

  const isMyTurn = !hasFirebaseSdk || (activePlayer && activePlayer.uid === myUid);
  $("answerInput").disabled = !isMyTurn || state.match.resolvingTurn;
  $("submitAnswerBtn").disabled = !isMyTurn || state.match.resolvingTurn;
  $("answerInput").placeholder = isMyTurn
    ? "Ketik jawaban Bahasa Indonesia lalu tekan Enter..."
    : `Menunggu ${activePlayer ? activePlayer.name : "pemain aktif"} menjawab...`;

  const simBar = $("simBotTurnBtn")?.closest(".local-sim-bar");
  if (simBar) {
    simBar.style.display = state.isHost ? "flex" : "none";
  }

  const list = $("survivorList");
  list.innerHTML = "";

  state.players.forEach(player => {
    const card = document.createElement("div");
    const isTurn = activePlayer && player.uid === activePlayer.uid && player.status === "alive";
    card.className = `survivor-card ${isTurn ? "is-turn" : ""} ${player.status === "eliminated" ? "eliminated" : ""}`;

    const left = document.createElement("div");
    left.className = "survivor-left";

    const avatar = document.createElement("div");
    avatar.className = "player-avatar";
    avatar.textContent = player.name.charAt(0).toUpperCase();

    const meta = document.createElement("div");
    meta.className = "survivor-meta";
    const title = document.createElement("strong");
    title.textContent = player.name + (isTurn ? " (GILIRAN)" : "");
    const sub = document.createElement("small");
    const statusLabel = player.status === "alive" ? "BERTAHAN" : "TERELIMINASI";
    sub.textContent = `${statusLabel} • Akurasi ${getAccuracy(player)}% (${player.correctCount || 0}/${player.attempts || 0})`;
    meta.append(title, sub);
    left.append(avatar, meta);

    const right = document.createElement("div");
    right.className = "survivor-right";
    const hearts = document.createElement("span");
    hearts.className = "lives-hearts";
    hearts.textContent = "♥".repeat(player.lives) + "♡".repeat(Math.max(0, 3 - player.lives));

    const scoreLine = document.createElement("span");
    scoreLine.className = "score-line";
    scoreLine.textContent = `${player.score || 0} PTS`;

    right.append(hearts, scoreLine);
    card.append(left, right);
    list.append(card);
  });

  const logEl = $("eventLog");
  logEl.innerHTML = "";
  state.match.logs.forEach(entry => {
    const li = document.createElement("li");
    li.textContent = entry.text;
    if (entry.type === "elim") li.classList.add("log-elim");
    if (entry.type === "ok") li.classList.add("log-ok");
    logEl.append(li);
  });
}

function finishMatch(winner, finalRound = state.match.round) {
  stopTimers();
  state.match.active = false;

  $("winnerName").textContent = winner ? winner.name.toUpperCase() : "NO WINNER";
  $("winnerSubtitle").textContent = winner
    ? `Bertahan hingga ronde ke-${finalRound} di arena ${state.roomCode || "LOKAL"}.`
    : "Pertandingan berakhir.";

  $("winnerStatsRow").innerHTML = "";
  if (winner) {
    const stats = [
      { label: "FINAL SCORE", value: `${winner.score || 0} PTS` },
      { label: "ACCURACY", value: `${getAccuracy(winner)}%` },
      { label: "LIVES LEFT", value: `${winner.lives} ♥` },
      { label: "ROUNDS PLAYED", value: `${finalRound}` }
    ];
    stats.forEach(s => {
      const span = document.createElement("span");
      span.innerHTML = `${s.label}<b>${s.value}</b>`;
      $("winnerStatsRow").append(span);
    });
  }

  const ranked = [...state.players].sort((a, b) => {
    if (winner && a.uid === winner.uid) return -1;
    if (winner && b.uid === winner.uid) return 1;
    if (a.status !== b.status) return a.status === "alive" ? -1 : 1;
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    return getAccuracy(b) - getAccuracy(a);
  });

  const lb = $("finalLeaderboard");
  lb.innerHTML = "";
  ranked.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = "rank-row";
    row.innerHTML = `
      <div><b>#${idx + 1}</b><span>${p.name}</span> <small style="color:#85899a">(${p.status === "alive" ? "SURVIVED" : "ELIMINATED"})</small></div>
      <div><strong>${p.score || 0} PTS</strong> • <small style="color:#a4a6b3">${getAccuracy(p)}% ACC</small></div>
    `;
    lb.append(row);
  });

  showScreen("winner");
}

async function backToLobbyFromMatch() {
  stopTimers();
  state.match.active = false;

  if (hasFirebaseSdk && roomRef && state.isHost) {
    const updates = {
      "meta/status": "waiting",
      "match": null,
      "submissions": null
    };
    state.players.forEach(p => {
      updates[`players/${p.uid}/lives`] = 3;
      updates[`players/${p.uid}/status`] = "alive";
      updates[`players/${p.uid}/score`] = 0;
      updates[`players/${p.uid}/correctCount`] = 0;
      updates[`players/${p.uid}/attempts`] = 0;
    });
    await roomRef.update(updates);
    return;
  }

  state.players.forEach(p => {
    p.lives = 3;
    p.status = "alive";
    p.score = 0;
    p.correctCount = 0;
    p.attempts = 0;
  });
  renderLobby();
  showScreen("lobby");
  showToast("Kembali ke lobby.");
}

// --- EVENT LISTENERS ---
$("playNowBtn").addEventListener("click", () => showScreen("entry"));
$("howToPlayBtn").addEventListener("click", () => $("howModal").classList.remove("hidden"));
document.querySelectorAll("[data-close-modal]").forEach(button => {
  button.addEventListener("click", () => $("howModal").classList.add("hidden"));
});
$("howModal").addEventListener("click", event => {
  if (event.target === $("howModal")) $("howModal").classList.add("hidden");
});
$("backHomeBtn").addEventListener("click", () => showScreen("landing"));
$("createRoomBtn").addEventListener("click", () => {
  console.log("TOMBOL CREATE ARENA BERHASIL DIKLIK!");
  alert("Tombol CREATE ARENA berfungsi!");
  createRoom();
});
$("joinRoomBtn").addEventListener("click", joinRoom);
$("leaveRoomBtn").addEventListener("click", leaveRoom);
$("addDemoBtn").addEventListener("click", addDemoPlayer);
$("startGameBtn").addEventListener("click", startMatch);
$("answerForm").addEventListener("submit", handleAnswerSubmit);
$("simBotTurnBtn").addEventListener("click", simulateBotTurn);
$("skipTurnBtn").addEventListener("click", forceTimeoutTurn);
$("abortMatchBtn").addEventListener("click", backToLobbyFromMatch);
$("playAgainBtn").addEventListener("click", backToLobbyFromMatch);
$("winnerHomeBtn").addEventListener("click", () => {
  leaveRoom();
  showScreen("landing");
});
$("copyCodeBtn").addEventListener("click", async () => {
  if (!state.roomCode) return;
  try {
    await navigator.clipboard.writeText(state.roomCode);
    showToast("Kode room berhasil disalin.");
  } catch {
    showToast(`Kode room: ${state.roomCode}`);
  }
});
$("roomCodeInput").addEventListener("input", event => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") $("howModal").classList.add("hidden");
});

initFirebase();