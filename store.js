import { nowISO } from "./utils.js";

const KEY = "gg-tools-sandbox:v1";

const defaultState = {
  community: {
    name: "",
    campfireUrl: "",
    logoDataUrl: "",   // optional base64
    welcomeNote: ""
  },
  distributor: {
    isPaused: false,
    cap: null, // number or null
    haptics: true,
  },
  codes: [] // { id, codeText, status, uploadedAt, claimedAt? }
};

function uid(){
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

export function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(defaultState), ...parsed };
  }catch{
    return structuredClone(defaultState);
  }
}

export function saveState(state){
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function addCodes(state, codeTexts){
  const existing = new Set(state.codes.map(c => c.codeText.toUpperCase()));
  const added = [];
  for (const codeText of codeTexts){
    const k = codeText.toUpperCase();
    if (existing.has(k)) continue;
    existing.add(k);
    const item = {
      id: uid(),
      codeText: k,
      status: "unused",
      uploadedAt: nowISO()
    };
    state.codes.push(item);
    added.push(item);
  }
  return added;
}

export function updateCodeText(state, id, newText){
  const target = state.codes.find(c => c.id === id);
  if (!target) return false;
  target.codeText = newText.toUpperCase().trim();
  return true;
}

export function deleteCode(state, id){
  const idx = state.codes.findIndex(c => c.id === id);
  if (idx === -1) return false;
  state.codes.splice(idx, 1);
  return true;
}

export function counts(state){
  const unused = state.codes.filter(c => c.status === "unused").length;
  const redeemed = state.codes.filter(c => c.status === "claimed").length;
  return { unused, redeemed, total: state.codes.length };
}
