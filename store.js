const KEY = "gg-tools-sandbox:v3";

const DEFAULT = {
  community: {
    name: "",
    campfireUrl: "",
    logoDataUrl: ""
  },
  codes: {
    unused: [],
    redeemed: []
  },
  distributor: {
    defaultCap: "",       // "" means "use full unused inventory"
    sessionActive: false,
    sessionId: "",
    sessionCap: 0,
    claimed: 0,
    isPaused: false
  }
};

function safeParse(raw){
  try { return JSON.parse(raw); } catch { return null; }
}

function mergeDefaults(obj, defaults){
  if (!obj || typeof obj !== "object") return structuredClone(defaults);
  const out = structuredClone(defaults);
  // shallow merge + nested merges we care about
  out.community = { ...defaults.community, ...(obj.community || {}) };
  out.codes = { ...defaults.codes, ...(obj.codes || {}) };
  out.codes.unused = Array.isArray(out.codes.unused) ? out.codes.unused : [];
  out.codes.redeemed = Array.isArray(out.codes.redeemed) ? out.codes.redeemed : [];
  out.distributor = { ...defaults.distributor, ...(obj.distributor || {}) };
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
  saveState(structuredClone(DEFAULT));
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
  s.distributor.sessionId = sessionId;
  s.distributor.sessionCap = cap;
  s.distributor.claimed = 0;
  s.distributor.isPaused = false;
  return s;
}

export function endSession(state){
  const s = mergeDefaults(state, DEFAULT);
  s.distributor.sessionActive = false;
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
  // ensure claimed isn't above cap (keep claimed, remaining can go 0)
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

export function togglePause(state){
  const s = mergeDefaults(state, DEFAULT);
  s.distributor.isPaused = !s.distributor.isPaused;
  return s;
}

export function claimOne(state){
  const s = mergeDefaults(state, DEFAULT);
  if (!s.distributor.sessionActive) return { state: s, ok: false, reason: "inactive" };
  if (s.distributor.isPaused) return { state: s, ok: false, reason: "paused" };
  if (s.distributor.claimed >= s.distributor.sessionCap) return { state: s, ok: false, reason: "cap" };
  s.distributor.claimed += 1;
  return { state: s, ok: true, reason: "ok" };
}
