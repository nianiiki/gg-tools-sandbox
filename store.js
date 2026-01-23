const KEY = "gg-tools-sandbox:v3";

const DEFAULT = {
  community: {
    name: "",
    campfireUrl: "",
    logoDataUrl: ""
  },
  codes: {
    unused: [],
    redeemed: [],
    redeemedLog: [] // [{ code, sessionId, claimedAt }]
  },
  distributor: {
    defaultCap: "",       // "" means "use full unused inventory"
    sessionActive: false,
    sessionEnded: false,
    sessionId: "",
    sessionCap: 0,
    claimed: 0,
    isPaused: false,

    // Settings (mirrors reference app toggles)
    settings: {
      removeDailyLimit: false,
      blockIncognito: false,
      testMode: false,
      haptics: true
    }
  },
  player: {
    // local-only claim history to enforce "1 Code Only"
    // claimsBySession: { [sessionId]: { code, claimedAt, dayKey } }
    claimsBySession: {},
    lastClaimDayKey: "" // yyyy-mm-dd (for daily limit)
  },
  reports: [] // [{ sessionId, code, message, createdAt }]
};

function safeParse(raw){
  try { return JSON.parse(raw); } catch { return null; }
}

function clone(v){
  // structuredClone is not supported in some older/mobile browsers.
  if (typeof structuredClone === "function") return structuredClone(v);
  return JSON.parse(JSON.stringify(v));
}

function mergeDefaults(obj, defaults){
  if (!obj || typeof obj !== "object") return clone(defaults);
  const out = clone(defaults);

  out.community = { ...defaults.community, ...(obj.community || {}) };

  out.codes = { ...defaults.codes, ...(obj.codes || {}) };
  out.codes.unused = Array.isArray(out.codes.unused) ? out.codes.unused : [];
  out.codes.redeemed = Array.isArray(out.codes.redeemed) ? out.codes.redeemed : [];
  out.codes.redeemedLog = Array.isArray(out.codes.redeemedLog) ? out.codes.redeemedLog : [];

  out.distributor = { ...defaults.distributor, ...(obj.distributor || {}) };
  out.distributor.settings = { ...defaults.distributor.settings, ...((obj.distributor||{}).settings || {}) };

  out.player = { ...defaults.player, ...(obj.player || {}) };
  out.player.claimsBySession = out.player.claimsBySession && typeof out.player.claimsBySession === "object"
    ? out.player.claimsBySession
    : {};

  out.reports = Array.isArray(obj.reports) ? obj.reports : clone(defaults.reports);

  return out;
}

export function loadState(){
  const raw = localStorage.getItem(KEY);
  const parsed = safeParse(raw);
  return mergeDefaults(parsed, DEFAULT);
}

export function saveState(s){
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function resetAll(){
  saveState(clone(DEFAULT));
  return loadState();
}

export function counts(s){
  const state = mergeDefaults(s, DEFAULT);
  return {
    unused: state.codes.unused.length,
    redeemed: state.codes.redeemed.length
  };
}

export function normalizeCodes(lines){
  // Accept pasted text (one per line) OR CSV with codes in first column.
  const out = [];
  for (const raw of lines){
    const v = String(raw ?? "").trim();
    if (!v) continue;
    // if looks like CSV row, take first cell
    const first = v.includes(",") ? v.split(",")[0].trim() : v;
    if (first) out.push(first);
  }
  // de-dupe while keeping order
  const seen = new Set();
  return out.filter(c => (seen.has(c) ? false : (seen.add(c), true)));
}

export function addCodes(state, codes){
  const s = mergeDefaults(state, DEFAULT);
  const incoming = normalizeCodes(codes);
  const existing = new Set(s.codes.unused);
  const existingR = new Set(s.codes.redeemed);
  for (const c of incoming){
    if (existing.has(c) || existingR.has(c)) continue;
    s.codes.unused.push(c);
    existing.add(c);
  }
  return s;
}

export function exportUnused(state){
  const s = mergeDefaults(state, DEFAULT);
  return s.codes.unused.slice();
}

// Session helpers (front-end simulation)
export function computeDefaultSessionCap(state){
  const s = mergeDefaults(state, DEFAULT);
  const { unused } = counts(s);
  const dc = String(s.distributor.defaultCap ?? "").trim();
  if (!dc) return unused;
  const n = Math.max(0, parseInt(dc, 10) || 0);
  if (n <= 0) return unused;
  return Math.min(unused, n);
}

export function startSession(state, sessionId){
  const s = mergeDefaults(state, DEFAULT);
  const cap = computeDefaultSessionCap(s);
  s.distributor.sessionActive = true;
  s.distributor.sessionEnded = false;
  s.distributor.sessionId = sessionId;
  s.distributor.sessionCap = cap;
  s.distributor.claimed = 0;
  s.distributor.isPaused = false;
  return s;
}

export function endSession(state){
  const s = mergeDefaults(state, DEFAULT);
  s.distributor.sessionActive = false;
  s.distributor.sessionEnded = false;
  s.distributor.sessionId = "";
  s.distributor.sessionCap = 0;
  s.distributor.claimed = 0;
  s.distributor.isPaused = false;
  return s;
}

export function setSessionCap(state, cap){
  const s = mergeDefaults(state, DEFAULT);
  const n = Math.max(0, parseInt(String(cap ?? "").trim() || "0", 10) || 0);
  s.distributor.sessionCap = n;

  // If cap lowered below claimed, remaining becomes 0 and session is effectively ended.
  if (s.distributor.claimed >= s.distributor.sessionCap) s.distributor.sessionEnded = true;

  return s;
}

export function setDefaultCap(state, cap){
  const s = mergeDefaults(state, DEFAULT);
  const v = String(cap ?? "").trim();
  // allow blank; normalize "0" -> blank
  if (!v || v === "0") s.distributor.defaultCap = "";
  else s.distributor.defaultCap = String(Math.max(0, parseInt(v,10) || 0));
  return s;
}

export function setDistributorSetting(state, key, value){
  const s = mergeDefaults(state, DEFAULT);
  if (!s.distributor.settings) s.distributor.settings = clone(DEFAULT.distributor.settings);
  if (key in s.distributor.settings) s.distributor.settings[key] = !!value;
  return s;
}

export function togglePause(state){
  const s = mergeDefaults(state, DEFAULT);
  if (s.distributor.sessionEnded) return s;
  s.distributor.isPaused = !s.distributor.isPaused;
  return s;
}

export function dayKeyNow(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

export function playerAlreadyClaimed(state, sessionId){
  const s = mergeDefaults(state, DEFAULT);
  const sid = String(sessionId || "");
  const has = !!s.player.claimsBySession?.[sid];

  // default behavior: daily limit on (one code per day) unless Remove Daily Limit is enabled.
  const removeDailyLimit = !!s.distributor.settings?.removeDailyLimit;
  if (removeDailyLimit) return { already: has, reason: has ? "session" : "none" };

  const today = dayKeyNow();
  const daily = (s.player.lastClaimDayKey === today);
  if (daily) return { already: true, reason: has ? "session" : "day" };
  return { already: false, reason: "none" };
}

export function recordPlayerClaim(state, sessionId, code){
  const s = mergeDefaults(state, DEFAULT);
  const sid = String(sessionId || "");
  const now = Date.now();
  const dk = dayKeyNow();
  s.player.claimsBySession[sid] = { code, claimedAt: now, dayKey: dk };
  s.player.lastClaimDayKey = dk;
  return s;
}

export function addReport(state, { sessionId, code, message }){
  const s = mergeDefaults(state, DEFAULT);
  s.reports.unshift({
    sessionId: String(sessionId || ""),
    code: String(code || ""),
    message: String(message || "").slice(0, 800),
    createdAt: Date.now()
  });
  return s;
}

// Claim logic (local-only simulation):
// - Enforces session cap
// - Moves a code from unused -> redeemed
// - Returns { ok, code, reason, state }
export function claimOne(state){
  const s = mergeDefaults(state, DEFAULT);

  if (!s.distributor.sessionActive) return { state: s, ok: false, reason: "inactive" };
  if (s.distributor.sessionEnded) return { state: s, ok: false, reason: "cap" };
  if (s.distributor.isPaused) return { state: s, ok: false, reason: "paused" };

  if (s.distributor.claimed >= s.distributor.sessionCap){
    s.distributor.sessionEnded = true;
    return { state: s, ok: false, reason: "cap" };
  }

  // inventory check (should usually be covered by cap, but keep safe)
  if (s.codes.unused.length <= 0){
    s.distributor.sessionEnded = true;
    return { state: s, ok: false, reason: "empty" };
  }

  // Test Mode: issue fake codes without consuming inventory
  const testMode = !!s.distributor.settings?.testMode;
  const code = testMode ? `TEST-${Math.random().toString(36).slice(2,8).toUpperCase()}` : s.codes.unused.shift();

  s.distributor.claimed += 1;

  if (!testMode){
    s.codes.redeemed.push(code);
    s.codes.redeemedLog.unshift({ code, sessionId: s.distributor.sessionId, claimedAt: Date.now() });
  }

  if (s.distributor.claimed >= s.distributor.sessionCap) s.distributor.sessionEnded = true;

  return { state: s, ok: true, reason: "ok", code };
}
