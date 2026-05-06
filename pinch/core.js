/**
 * PINCH — shared core module.
 * Mode definitions + backend abstraction (Firebase / localStorage).
 *
 * To enable public leaderboards, paste your Firebase web-app config into
 * window.PINCH_FIREBASE_CONFIG before this module loads. See README at the
 * top of any HTML page for setup steps. Without config, scores save locally.
 */

export const MODES = {
  classic: {
    id: "classic",
    name: "Classic",
    tagline: "5 colored balls. Fastest match wins.",
    description: "Five balls scattered. Match them to their colored bins. Don't stop the clock.",
    ballCount: 5,
    timeLimit: null,        // null → no timer, ends when all placed
    metric: "time",         // lower is better
    scoreLabel: "Time",
    accent: "#6fb4ff",
  },
  sprint: {
    id: "sprint",
    name: "Sprint",
    tagline: "10 balls. No mercy.",
    description: "Ten balls (two of each color). Bins recycle. Fastest time wins.",
    ballCount: 10,
    timeLimit: null,
    metric: "time",
    scoreLabel: "Time",
    accent: "#ff9d3a",
  },
  timeattack: {
    id: "timeattack",
    name: "Time Attack",
    tagline: "Sixty seconds. Place as many as you can.",
    description: "60-second clock. Each placed ball respawns elsewhere. Score = balls placed.",
    ballCount: 5,            // # active at once
    timeLimit: 60,
    metric: "score",         // higher is better
    scoreLabel: "Placed",
    accent: "#c690ff",
  },
};

export const MODE_ORDER = ["classic", "sprint", "timeattack"];

/* ─────────────────────────────────────────────
   BACKENDS
   Both expose: { mode, uid, username, signInAs, submitScore, getLeaderboard }
   Score row: { uid, name, mode, time?, score?, ts }
   ───────────────────────────────────────────── */

function LocalBackend() {
  const KEY_PREFIX = "pinch.scores.v2.";
  const ME = "pinch.uid.v2";
  let uid = localStorage.getItem(ME);
  if (!uid) {
    uid = "local-" + Math.random().toString(36).slice(2, 11);
    localStorage.setItem(ME, uid);
  }
  function read(modeId) {
    try { return JSON.parse(localStorage.getItem(KEY_PREFIX + modeId) || "[]"); } catch { return []; }
  }
  function write(modeId, rows) { localStorage.setItem(KEY_PREFIX + modeId, JSON.stringify(rows)); }

  return {
    mode: "local",
    uid,
    username: null,
    async signInAs(name) { this.username = name; },
    async submitScore({ mode, time, score }) {
      const rows = read(mode);
      rows.push({ uid, name: this.username, mode, time, score, ts: Date.now() });
      const m = MODES[mode];
      if (m.metric === "time") rows.sort((a, b) => a.time - b.time);
      else                     rows.sort((a, b) => b.score - a.score);
      write(mode, rows.slice(0, 50));
    },
    async getLeaderboard(modeId) {
      const m = MODES[modeId];
      const rows = read(modeId);
      if (m.metric === "time") rows.sort((a, b) => a.time - b.time);
      else                     rows.sort((a, b) => b.score - a.score);
      return rows.slice(0, 10);
    },
  };
}

async function FirebaseBackend(config) {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js");
  const { getAuth, signInAnonymously } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js");
  const { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } =
    await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");

  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const cred = await signInAnonymously(auth);
  const uid = cred.user.uid;

  return {
    mode: "public",
    uid,
    username: null,
    async signInAs(name) { this.username = name; },
    async submitScore({ mode, time, score }) {
      await addDoc(collection(db, `pinch_${mode}`), {
        uid,
        name: this.username,
        mode,
        time: time ?? null,
        score: score ?? null,
        created_at: serverTimestamp(),
      });
    },
    async getLeaderboard(modeId) {
      const m = MODES[modeId];
      const field = m.metric === "time" ? "time" : "score";
      const dir = m.metric === "time" ? "asc" : "desc";
      const q = query(collection(db, `pinch_${modeId}`), orderBy(field, dir), limit(10));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ ...d.data(), ts: d.data().created_at?.toMillis?.() ?? Date.now() }));
    },
  };
}

let backendPromise = null;
export function getBackend() {
  if (!backendPromise) {
    backendPromise = (async () => {
      const cfg = window.PINCH_FIREBASE_CONFIG;
      const hasFirebase = cfg && cfg.apiKey && cfg.projectId;
      try {
        if (hasFirebase) return await FirebaseBackend(cfg);
        return LocalBackend();
      } catch (e) {
        console.warn("[pinch] Firebase init failed; falling back to local mode", e);
        return LocalBackend();
      }
    })();
  }
  return backendPromise;
}

/* ─────────────────────────────────────────────
   USERNAME PERSISTENCE
   ───────────────────────────────────────────── */
const NAME_KEY = "pinch.username.v2";
export function getStoredName() { return localStorage.getItem(NAME_KEY) || ""; }
export function setStoredName(n) { localStorage.setItem(NAME_KEY, n); }

/* ─────────────────────────────────────────────
   FORMATTERS
   ───────────────────────────────────────────── */
export function fmtTime(sec) {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
}
export function fmtScore(modeId, row) {
  const m = MODES[modeId];
  if (m.metric === "time") return fmtTime(row.time);
  return `${row.score} placed`;
}
export function escapeHtml(str) {
  return String(str ?? "—").replace(/[<>&"]/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;",
  }[c]));
}

/* ─────────────────────────────────────────────
   NAV (renders the shared top bar)
   ───────────────────────────────────────────── */
export function renderNav(activePage) {
  const links = [
    { id: "home",   label: "Home",        href: "./index.html" },
    { id: "modes",  label: "Modes",       href: "./modes.html" },
    { id: "play",   label: "Play",        href: "./modes.html" },
    { id: "lb",     label: "Leaderboard", href: "./leaderboard.html" },
  ];
  return `
    <nav class="nav">
      <a class="brand" href="./index.html">◆ PINCH</a>
      <div class="links">
        ${links
          .filter((l) => l.id !== "play" || activePage === "play")
          .map((l) => `<a href="${l.href}" class="${activePage === l.id ? "active" : ""}">${l.label}</a>`)
          .join("")}
      </div>
    </nav>
  `;
}
