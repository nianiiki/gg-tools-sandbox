import {
  loadState, saveState, resetAll,
  counts, addCodes, exportUnused,
  startSession, endSession, togglePause, setSessionCap,
  setDefaultCap, computeDefaultSessionCap,
  claimOne, setDistributorSetting,
  playerAlreadyClaimed, recordPlayerClaim, addReport
} from "./store.js";
import { uid, copyToClipboard, downloadText, escapeHtml } from "./utils.js";

const APP_VERSION = "MKXVII";

/** tiny DOM helpers (we intentionally do NOT use jQuery) **/
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));



function setVersionBadge() {
  const el = document.getElementById("versionBadge");
  if (el) el.textContent = APP_VERSION;
}
const view = $("#view");
if (!view) throw new Error("Missing #view container");

function goto(hash){
  const h = hash.startsWith("#") ? hash : "#" + hash;
  if (location.hash === h) route();
  else location.hash = h;
}

/** Icons **/
const Icons = {
  back: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>`,
  gear: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a7.7 7.7 0 0 0 .1-1 7.7 7.7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a8 8 0 0 0-1.7-1l-.4-2.6H10l-.4 2.6a8 8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.7 7.7 0 0 0-.1 1 7.7 7.7 0 0 0 .1 1l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 2.6h4l.4-2.6a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6Z"/></svg>`,
  people: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>`,
  bolt: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z"/></svg>`,
  trophy: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M5 6H3v2a4 4 0 0 0 4 4"/><path d="M19 6h2v2a4 4 0 0 1-4 4"/></svg>`,
  play: () => `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7-11-7Z"/></svg>`,
  pause: () => `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>`,
  stop: () => `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>`,
  link: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1L10 4.9"/><path d="M14 11a5 5 0 0 0-7.1 0L5.5 12.4a5 5 0 0 0 7.1 7.1L14 19.1"/></svg>`,

  external: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v7H3V3h7"/></svg>`,
  flag: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22V3"/><path d="M4 4h12l-1 5 5 2-2 6H4"/></svg>`,
  pencil: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>`,
  upload: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>`,
  download: () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>`
};

function readState(){
  return loadState();
}
function writeState(s){
  saveState(s);
  return s;
}

function header({ title="GG Meetup Tools", subtitle="", onBack=null, rightButtons=[] }){
  const logo = (() => {
    const s = readState();
    if (s.community.logoDataUrl) return `<img alt="logo" src="${s.community.logoDataUrl}">`;
    return `<span style="opacity:.9;font-weight:900">GG</span>`;
  })();
  const backBtn = onBack ? `<button class="iconBtn" id="btnBack" aria-label="Back">${Icons.back()}</button>` : `<div style="width:44px"></div>`;
  const right = rightButtons.map(b => `<button class="iconBtn" data-id="${b.id}" aria-label="${escapeHtml(b.label)}">${b.icon}</button>`).join("");
  return `
    <div class="header safe-top">
      ${backBtn}
      <div class="brand">
        <div class="logo">${logo}</div>
        <div class="grow" style="min-width:0">
          <h1>${escapeHtml(title)}</h1>
          <div class="sub">${escapeHtml(subtitle || "")}</div>
        </div>
      </div>
      <div class="iconRow">${right || `<div style="width:44px"></div>`}</div>
    </div>
  `;
}

function mount(html){
  view.innerHTML = html;
}

function mountModal(innerHtml){
  const el = document.createElement("div");
  el.className = "modalOverlay";
  el.innerHTML = `<div class="modal"><div class="cardInner">${innerHtml}</div></div>`;
  document.body.appendChild(el);
  return () => el.remove();
}

function toast(message){
  let t = document.getElementById("toast");
  if (!t){
    t = document.createElement("div");
    t.id = "toast";
    document.body.appendChild(t);
  }
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 1600);
}

function screenHome(){
  const s = readState();
  const communityLabel = s.community.name ? s.community.name : "My Community";
  const showWelcome = !(
    String(s.community.name||"").trim() ||
    String(s.community.campfireUrl||"").trim() ||
    String(s.community.instagramUrl||"").trim() ||
    String(s.community.note||"").trim() ||
    String(s.community.logoDataUrl||"").trim()
  );

  const tile = (id, icon, title, desc) => `
    <div class="card tile" data-goto="${id}">
      <div class="left">
        <div class="badge">${icon}</div>
        <div class="grow" style="min-width:0">
          <div class="title">${escapeHtml(title)}</div>
          <div class="muted">${escapeHtml(desc)}</div>
        </div>
      </div>
      <div class="chev">→</div>
    </div>
  `;

  mount(`
    ${header({
      title: "GG Meetup Tools",
      subtitle: communityLabel,
      onBack: null,
      rightButtons: [
        { id: "community", label: "Community settings", icon: Icons.gear() }
      ]
    })}
    <div class="stack">
      ${showWelcome ? tile("community", Icons.people(), "Welcome, Ambassador!", "Tap to set your Community Profile") : ""}
      ${tile("distributor", Icons.bolt(), "Code Distributor", "Queue-based distribution for promo codes.")}
      ${tile("raffle", Icons.trophy(), "Raffle Master", "Pick random winners from a list.")}
      <div style="height:6px"></div>
    </div>
  `);

  // handlers
  // Community Settings is accessible via the top-right gear; no redundant tile.
  $$("[data-goto]").forEach(el => el.addEventListener("click", () => goto(el.getAttribute("data-goto") || "")));
  $("[data-id='community']")?.addEventListener("click", () => goto("community"));
}

function screenCommunity(){
  const s = readState();
  mount(`
    ${header({ title: "Community Profile", subtitle: "Global settings for all tools", onBack: () => goto("") })}
    <div class="stack">
      <div class="card"><div class="cardInner">
        <div class="field">
          <label>Community Name</label>
          <input class="input" id="communityName" placeholder="Garden Grove PoGo" value="${escapeHtml(s.community.name)}">
        </div>
        <div style="height:14px"></div>
        <div class="field">
          <label>Campfire URL</label>
          <input class="input" id="campfireUrl" placeholder="https://campfire.onelink.me/..." value="${escapeHtml(s.community.campfireUrl)}">
          <div class="muted">This is used for a quick button in the player experience (no long URL shown).</div>
        </div>
        <div style="height:14px"></div>
        <div class="field">
          <label>Group Logo</label>
          <div class="row">
            <div class="badge" style="width:64px;height:64px;border-radius:22px;overflow:hidden;">
              ${s.community.logoDataUrl ? `<img alt="logo" src="${s.community.logoDataUrl}" style="width:100%;height:100%;object-fit:cover">` : Icons.people()}
            </div>
            <div class="grow"></div>
            <input type="file" id="logoFile" accept="image/*" style="display:none">
            <button class="smallBtn" id="btnUploadLogo">${Icons.upload()} Upload</button>
            <button class="smallBtn" id="btnRemoveLogo">Remove</button>
          </div>
        </div>
      </div></div>

      <button class="pillBtn primary" id="btnSaveCommunity">Save & Back</button>
    </div>
  `);

  $("#btnBack")?.addEventListener("click", () => goto(""));
  $("#btnUploadLogo")?.addEventListener("click", () => $("#logoFile")?.click());
  $("#logoFile")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => rej(new Error("read failed"));
      fr.readAsDataURL(file);
    });
    const st = readState();
    st.community.logoDataUrl = dataUrl;
    writeState(st);
    screenCommunity();
  });
  $("#btnRemoveLogo")?.addEventListener("click", () => {
    const st = readState();
    st.community.logoDataUrl = "";
    writeState(st);
    screenCommunity();
  });
  $("#btnSaveCommunity")?.addEventListener("click", () => {
    const st = readState();
    st.community.name = $("#communityName").value.trim();
    st.community.campfireUrl = $("#campfireUrl").value.trim();
    writeState(st);
    goto("");
  });
}

function distributorHeaderButtons(){
  return [
    { id: "distSettings", label: "Distributor settings", icon: Icons.gear() }
  ];
}

function screenDistributor(){
  const s = readState();
  const c = counts(s);
  const sessionActive = s.distributor.sessionActive;

  const defaultCap = String(s.distributor.defaultCap || "");
  const capLabel = defaultCap ? `Default cap: ${defaultCap}` : "Default cap: Full inventory";

  mount(`
    ${header({ title: "Distributor", subtitle: "Dashboard", onBack: () => goto(""), rightButtons: distributorHeaderButtons() })}
    <div class="stack">
      <div class="grid2">
        <div class="stat card">
          <div class="cardInner">
            <div class="num">${c.unused}</div>
            <div class="label">Unused (tap to manage)</div>
          </div>
        </div>
        <div class="stat card">
          <div class="cardInner">
            <div class="num">${c.redeemed}</div>
            <div class="label">Redeemed</div>
          </div>
        </div>
      </div>

      <div class="card"><div class="cardInner">
        <div class="row" style="justify-content:space-between">
          <div>
            <div class="title">Session</div>
            <div class="muted">${escapeHtml(capLabel)}</div>
          </div>
          <button class="smallBtn btnEditDefaultCap" id="btnEditDefaultCap">${Icons.pencil()} Edit</button>
        </div>
        <div style="height:12px"></div>
        ${sessionActive
          ? `<button class="pillBtn primary" id="btnGoLive">${Icons.bolt()} View Live Session</button>`
          : `<button class="pillBtn primary" id="btnStartSession">${Icons.play()} Start New Session</button>`
        }
      </div></div>

      <div class="card"><div class="cardInner">
        <div class="title">Add Codes</div>
        <div class="muted">Paste codes (one per line) or import a CSV file.</div>
        <div style="height:10px"></div>
        <textarea id="codesPaste" placeholder="Paste codes here..."></textarea>
        <div style="height:12px"></div>
        <div class="row">
          <button class="pillBtn" id="btnAddCodes">Add</button>
          <input type="file" id="codesFile" accept=".csv,text/csv,.txt,text/plain" style="display:none">
          <button class="smallBtn" id="btnImport">${Icons.upload()}</button>
        </div>
      </div></div>

      <button class="pillBtn" id="btnExport">${Icons.download()} Export Unused Codes</button>
      <button class="pillBtn danger" id="btnReset">${Icons.stop()} Reset Everything</button>
    </div>
  `);

  $("#btnBack")?.addEventListener("click", () => goto(""));
  $("[data-id='distSettings']")?.addEventListener("click", () => goto("distributor/settings"));

  $("#btnEditDefaultCap")?.addEventListener("click", () => {
    const st = readState();
    const computed = computeDefaultSessionCap(st);
    const close = mountModal(`
      <div class="title">Default Session Cap</div>
      <div class="muted">Leave blank for full unused inventory at session start.</div>
      <div style="height:12px"></div>
      <input class="input" id="capInput" inputmode="numeric" placeholder="Unlimited" value="${escapeHtml(st.distributor.defaultCap)}">
      <div style="height:14px"></div>
      <div class="banner">
        <div class="note"><div class="dot"></div><div>Current unused inventory: <b>${counts(st).unused}</b></div></div>
        <div class="note"><div class="dot"></div><div>If you started a session right now, the cap would be: <b>${computed}</b></div></div>
      </div>
      <div style="height:16px"></div>
      <div class="modalActions">
        <button class="pillBtn" id="btnCancel">Cancel</button>
        <button class="pillBtn primary" id="btnSave">Save</button>
      </div>
    `);
    $("#btnCancel")?.addEventListener("click", close);
    $("#btnSave")?.addEventListener("click", () => {
      let ns = setDefaultCap(readState(), $("#capInput").value);
      writeState(ns);
      close();
      screenDistributor();
    });
  });

  $("#btnStartSession")?.addEventListener("click", () => {
    const st = readState();
    if (counts(st).unused <= 0){
      mountModal(`
        <div class="title">No codes available</div>
        <div class="muted">Add codes to your unused inventory before starting a session.</div>
        <div style="height:16px"></div>
        <button class="pillBtn primary" id="ok">OK</button>
      `);
      $("#ok")?.addEventListener("click", () => document.querySelector(".modalOverlay")?.remove());
      return;
    }
    const id = uid(10);
    let ns = startSession(st, id);
    writeState(ns);
    goto("distributor/live");
  });

  $("#btnGoLive")?.addEventListener("click", () => goto("distributor/live"));

  $("#btnAddCodes")?.addEventListener("click", () => {
    const lines = $("#codesPaste").value.split(/\r?\n/);
    let st = readState();
    st = addCodes(st, lines);
    writeState(st);
    $("#codesPaste").value = "";
    screenDistributor();
  });

  $("#btnImport")?.addEventListener("click", () => $("#codesFile")?.click());
  $("#codesFile")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/);
    let st = readState();
    st = addCodes(st, lines);
    writeState(st);
    screenDistributor();
  });

  $("#btnExport")?.addEventListener("click", () => {
    const st = readState();
    const rows = exportUnused(st);
    downloadText("unused-codes.txt", rows.join("\n"));
  });

  $("#btnReset")?.addEventListener("click", () => {
    const close = mountModal(`
      <div class="title">Reset Everything</div>
      <div class="muted">This clears community info, code inventory, and any live session.</div>
      <div style="height:16px"></div>
      <div class="modalActions">
        <button class="pillBtn" id="btnCancel">Cancel</button>
        <button class="pillBtn danger" id="btnDo">Reset</button>
      </div>
    `);
    $("#btnCancel")?.addEventListener("click", close);
    $("#btnDo")?.addEventListener("click", () => {
      resetAll();
      close();
      goto("");
    });
  });
}

function screenDistributorSettings(){
  const st = readState();
  const capLabel = st.distributor.defaultCap ? st.distributor.defaultCap : "";
  const cfg = st.distributor.settings || {};

  const toggle = (id, label, desc, checked) => `
    <div class="toggleRow">
      <div class="grow" style="min-width:0">
        <div class="title" style="font-size:16px">${escapeHtml(label)}</div>
        <div class="muted">${escapeHtml(desc)}</div>
      </div>
      <label class="switch">
        <input type="checkbox" id="${escapeHtml(id)}" ${checked ? "checked" : ""}>
        <span class="slider"></span>
      </label>
    </div>
  `;

  mount(`
    ${header({ title: "Distributor Settings", subtitle: "Queue configuration & controls", onBack: () => goto("distributor") })}
    <div class="stack">
      <div class="card"><div class="cardInner">
        <div class="field">
          <label>Session Distribution Cap</label>
          <input class="input" id="defaultCap" inputmode="numeric" placeholder="Unlimited" value="${escapeHtml(capLabel)}">
          <div class="muted">Leave empty or 0 for unlimited (defaults to full unused inventory at session start).</div>
        </div>

        <div style="height:14px"></div>
        <div class="hr"></div>
        <div style="height:14px"></div>

        ${toggle("tRemoveDaily", "Remove Daily Limit", "If enabled, players can claim once per session (instead of once per day).", !!cfg.removeDailyLimit)}
        ${toggle("tIncognito", "Block Incognito", "If enabled, attempt to warn players using private browsing (best-effort).", !!cfg.blockIncognito)}
        ${toggle("tTestMode", "Test Mode", "Serve fake TEST-XXXXXX codes (does not consume inventory).", !!cfg.testMode)}
        ${toggle("tHaptics", "Haptic Vibration", "Vibrate on successful claim (mobile, if supported).", cfg.haptics !== false)}

        <div style="height:14px"></div>

        <div class="banner">
          <div class="row" style="gap:10px;align-items:flex-start">
            <div class="badge" style="width:40px;height:40px;border-radius:16px">${Icons.trophy()}</div>
            <div class="grow">
              <div class="title" style="font-size:16px">PoGO Limit Warning</div>
              <div class="muted">Pokémon GO Web Store often restricts accounts to 1 code per week. If you see “invalid” or “not eligible”, the code may still be valid — your account could be on cooldown.</div>
            </div>
          </div>
        </div>

        <div style="height:12px"></div>

        <button class="pillBtn" id="btnMetrics">${Icons.people()} Community Metrics</button>
      </div></div>

      <button class="pillBtn primary" id="btnSave">Save & Back</button>
    </div>
  `);

  $("#btnBack")?.addEventListener("click", () => goto("distributor"));
  $("#btnMetrics")?.addEventListener("click", () => toast("Community Metrics: coming soon"));

  $("#btnSave")?.addEventListener("click", () => {
    let s2 = setDefaultCap(readState(), $("#defaultCap").value);
    s2 = setDistributorSetting(s2, "removeDailyLimit", $("#tRemoveDaily").checked);
    s2 = setDistributorSetting(s2, "blockIncognito", $("#tIncognito").checked);
    s2 = setDistributorSetting(s2, "testMode", $("#tTestMode").checked);
    s2 = setDistributorSetting(s2, "haptics", $("#tHaptics").checked);
    writeState(s2);
    goto("distributor");
  });
}


function screenDistributorLive(){
  const st = readState();
  if (!st.distributor.sessionActive){
    goto("distributor");
    return;
  }
  const { sessionId, sessionCap, claimed, isPaused } = st.distributor;
  const remaining = Math.max(0, sessionCap - claimed);
  const playerUrl = `${location.origin}${location.pathname}#/claim/${sessionId}`;

  mount(`
    ${header({
      title: "Code Distributor",
      subtitle: "LIVE",
      onBack: () => goto("distributor"),
      rightButtons: [
        { id: "editCap", label: "Edit session cap", icon: Icons.pencil() }
      ]
    })}
    <div class="stack">
      <div class="card"><div class="cardInner">
        <div class="qrWrap">
          <div id="qrcode" style="width:220px;height:220px"></div>
          <h2>Scan to Claim</h2>
          <div class="muted" style="color:rgba(10,10,10,.65)">Waiting for scans…</div>
          <div class="qrTools">
            <button class="smallBtn" id="btnFullscreen">Fullscreen</button>
            <button class="smallBtn" id="btnCopyLink">${Icons.link()} Copy Link</button>
            <button class="smallBtn" id="btnOpenClaim">${Icons.external()} Open</button>
          </div>
        </div>
      </div></div>

      <div class="card"><div class="cardInner">
        <div class="splitBar">
          <div class="stat">
            <div class="num">${remaining}</div>
            <div class="label">Remaining</div>
          </div>
          <div class="stat">
            <div class="num">${claimed}</div>
            <div class="label">Claimed</div>
          </div>
        </div>
        <div style="height:10px"></div>
        <div class="muted">Session cap: <b>${sessionCap}</b></div>
      </div></div>

      <div class="row">
        <button class="pillBtn" id="btnPause">${isPaused ? Icons.play() : Icons.pause()} ${isPaused ? "Resume" : "Pause"}</button>
        <button class="smallBtn" id="btnPrint" title="Print QR + link">Print</button>
        <button class="smallBtn" id="btnNfc" title="Write session link to NFC tag (if supported)">NFC</button>
        <button class="smallBtn" id="btnSimClaim" title="Simulate a player claim (for testing)">+1</button>
      </div>

      <button class="pillBtn danger" id="btnEnd">${Icons.stop()} End Session</button>
    </div>
  `);

  // build QR
  const qrEl = $("#qrcode");
  qrEl.innerHTML = "";
  // eslint-disable-next-line no-undef
  new QRCode(qrEl, { text: playerUrl, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });

  $("#btnBack")?.addEventListener("click", () => goto("distributor"));

  const doCopy = async () => {
    try{
      await copyToClipboard(playerUrl);
      toast("Link copied");
    }catch{
      // Fallback for browsers that block clipboard APIs
      toast("Copy failed — showing link");
      window.prompt("Copy this link", playerUrl);
    }
  };

  $("[data-id='share']")?.addEventListener("click", doCopy);
  $("[data-id='editCap']")?.addEventListener("click", () => openEditSessionCap());

  $("#btnCopyLink")?.addEventListener("click", doCopy);
  $("#btnOpenClaim")?.addEventListener("click", () => window.open(playerUrl, "_blank"));
  $("#btnFullscreen")?.addEventListener("click", async () => {
    const wrap = $(".qrWrap");
    if (!wrap) return;
    try{
      await wrap.requestFullscreen();
    }catch{}
  });

  $("#btnPrint")?.addEventListener("click", () => window.print());

  $("#btnNfc")?.addEventListener("click", async () => {
    // Best-effort NFC write (Chrome/Android)
    if (!("NDEFReader" in window)){
      toast("NFC not supported on this device");
      return;
    }
    try{
      // eslint-disable-next-line no-undef
      const ndef = new NDEFReader();
      await ndef.write({ records: [{ recordType: "url", data: playerUrl }] });
      toast("NFC written");
    }catch{
      toast("NFC write canceled");
    }
  });

  $("#btnPause")?.addEventListener("click", () => {
    let s2 = togglePause(readState());
    writeState(s2);
    screenDistributorLive();
  });

  $("#btnEnd")?.addEventListener("click", () => {
    let s2 = endSession(readState());
    writeState(s2);
    goto("distributor");
  });

  $("#btnSimClaim")?.addEventListener("click", () => {
    // for testing from host device
    let res = claimOne(readState());
    writeState(res.state);
    if (!res.ok && res.reason === "cap"){
      mountModal(`
        <div class="title">Cap reached</div>
        <div class="muted">Remaining is now 0. Players will see “session ended”.</div>
        <div style="height:16px"></div>
        <button class="pillBtn primary" id="ok">OK</button>
      `);
      $("#ok")?.addEventListener("click", () => document.querySelector(".modalOverlay")?.remove());
    }
    screenDistributorLive();
  });

  function openEditSessionCap(){
    const cur = readState().distributor.sessionCap;
    const close = mountModal(`
      <div class="title">Edit Session Cap</div>
      <div class="muted">Update the cap while the session is live. Remaining updates instantly.</div>
      <div style="height:12px"></div>
      <input class="input" id="capNow" inputmode="numeric" value="${escapeHtml(String(cur))}">
      <div style="height:16px"></div>
      <div class="modalActions">
        <button class="pillBtn" id="btnCancel">Cancel</button>
        <button class="pillBtn primary" id="btnSave">Save</button>
      </div>
    `);
    $("#btnCancel")?.addEventListener("click", close);
    $("#btnSave")?.addEventListener("click", () => {
      let s2 = setSessionCap(readState(), $("#capNow").value);
      writeState(s2);
      close();
      screenDistributorLive();
    });
  }
}

function screenClaim(sessionId){
  const st0 = readState();

  // Build campfire button (no long URL visible)
  const campfireUrl = (st0.community.campfireUrl || "").trim();
  const hasCampfire = !!campfireUrl;

  const cfg = st0.distributor.settings || {};
  const sid = String(sessionId || "");

  const openCampfire = () => {
    if (hasCampfire) window.open(campfireUrl, "_blank");
  };

  const showEnded = (subtitleText) => {
    const s = readState();
    mount(`
      ${header({ title: "Code Claim", subtitle: subtitleText, onBack: null })}
      <div class="stack">
        <div class="card"><div class="cardInner">
          <div class="title">Session Ended</div>
          <div class="muted">There isn't an active code session right now, or all codes allotted for this session have been claimed.</div>
        </div></div>
        ${hasCampfire ? `<button class="pillBtn primary" id="btnCampfire">${Icons.people()} Campfire Group</button>` : ""}
      </div>
    `);
    $("#btnCampfire")?.addEventListener("click", openCampfire);
  };

  // Validate session
  if (!st0.distributor.sessionActive || st0.distributor.sessionId !== sid){
    showEnded(st0.community.name || "My Community");
    return;
  }

  // If cap reached, treat as ended for players
  if (st0.distributor.sessionEnded || st0.distributor.claimed >= st0.distributor.sessionCap){
    showEnded(st0.community.name || "My Community");
    return;
  }

  // Best-effort incognito warning
  const incognitoWarn = !!cfg.blockIncognito;

  // Enforce "1 Code Only"
  const already = playerAlreadyClaimed(st0, sid);
  if (already.already){
    const reason = already.reason === "day" ? "You can only claim 1 code per day." : "You can only claim 1 code per session.";
    mount(`
      ${header({ title: "Code Claim", subtitle: st0.community.name || "My Community", onBack: null })}
      <div class="stack">
        <div class="card"><div class="cardInner">
          <div class="title">1 Code Only</div>
          <div class="muted">${escapeHtml(reason)}</div>
          <div style="height:12px"></div>
          <div class="banner">
            <div class="muted">If you think this is a mistake, ask an Ambassador for help.</div>
          </div>
        </div></div>
        ${hasCampfire ? `<button class="pillBtn primary" id="btnCampfire">${Icons.people()} Campfire Group</button>` : ""}
      </div>
    `);
    $("#btnCampfire")?.addEventListener("click", openCampfire);
    return;
  }

  // Paused?
  if (st0.distributor.isPaused){
    mount(`
      ${header({ title: "Code Claim", subtitle: st0.community.name || "My Community", onBack: null })}
      <div class="stack">
        <div class="card"><div class="cardInner">
          <div class="title">Temporarily Paused</div>
          <div class="muted">Please wait a moment and try scanning again.</div>
        </div></div>
        ${hasCampfire ? `<button class="pillBtn primary" id="btnCampfire">${Icons.people()} Campfire Group</button>` : ""}
      </div>
    `);
    $("#btnCampfire")?.addEventListener("click", openCampfire);
    return;
  }

  const subtitle = st0.community.name || "My Community";

  const renderReveal = () => {
    const st = readState();
    const remaining = Math.max(0, st.distributor.sessionCap - st.distributor.claimed);
    mount(`
      ${header({ title: "Code Claim", subtitle, onBack: null })}
      <div class="stack">
        <div class="card"><div class="cardInner">
          <div class="row" style="justify-content:center">
            <div class="badge" style="width:74px;height:74px;border-radius:26px;background:rgba(255,255,255,.14)">
              ${st.community.logoDataUrl ? `<img alt="logo" src="${st.community.logoDataUrl}" style="width:100%;height:100%;object-fit:cover">` : Icons.people()}
            </div>
          </div>
          <div style="height:12px"></div>
          <div class="title" style="text-align:center">Reveal Reward</div>
          <div class="muted" style="text-align:center">Tap below to unlock your promo code.</div>

          ${incognitoWarn ? `
            <div style="height:14px"></div>
            <div class="banner">
              <div class="title" style="font-size:16px">Private Browsing Notice</div>
              <div class="muted">If you're using Incognito/Private mode, your claim may not “stick”. For best results, use a normal browser tab.</div>
            </div>
          ` : ""}

          <div style="height:14px"></div>
          <button class="pillBtn primary" id="btnReveal">${Icons.bolt()} Reveal Reward</button>
          <div style="height:10px"></div>
          <div class="muted" style="text-align:center">Remaining in this session: <b>${remaining}</b></div>
        </div></div>

        ${hasCampfire ? `<button class="pillBtn" id="btnCampfire">${Icons.people()} Campfire Group</button>` : ""}
      </div>
    `);

    $("#btnCampfire")?.addEventListener("click", openCampfire);
    $("#btnReveal")?.addEventListener("click", () => {
      // Perform claim at reveal moment
      const stA = readState();

      // Re-check constraints at click time
      const already2 = playerAlreadyClaimed(stA, sid);
      if (already2.already){
        screenClaim(sid);
        return;
      }
      if (!stA.distributor.sessionActive || stA.distributor.sessionId !== sid) { showEnded(subtitle); return; }
      if (stA.distributor.sessionEnded || stA.distributor.claimed >= stA.distributor.sessionCap) { showEnded(subtitle); return; }
      if (stA.distributor.isPaused) { screenClaim(sid); return; }

      const result = claimOne(stA);
      let stB = result.state;

      if (!result.ok){
        writeState(stB);
        if (result.reason === "cap" || result.reason === "empty") showEnded(subtitle);
        else screenClaim(sid);
        return;
      }

      // record local claim for "1 Code Only"
      stB = recordPlayerClaim(stB, sid, result.code);
      writeState(stB);

      if (cfg.haptics !== false && navigator.vibrate) navigator.vibrate(30);

      renderUnlocked(result.code);
    });
  };

  const renderUnlocked = (code) => {
    const st = readState();
    mount(`
      ${header({ title: "Code Claim", subtitle, onBack: null })}
      <div class="stack">
        <div class="card"><div class="cardInner">
          <div class="banner">
            <div class="title" style="text-align:center">Code Unlocked</div>
            <div style="height:10px"></div>
            <div class="codeBox">
              <div class="kicker">CODE</div>
              <div class="codeText">${escapeHtml(code)}</div>
            </div>

            <div style="height:12px"></div>

            <button class="pillBtn primary" id="btnRedeem">Redeem at Web Store</button>

            <div style="height:12px"></div>

            <div class="row">
              <button class="pillBtn" id="btnCopy">Copy Code</button>
              <button class="pillBtn" id="btnShare">Share Code</button>
            </div>

            <div style="height:12px"></div>

            <button class="pillBtn danger" id="btnReport">${Icons.flag()} Report issue</button>
          </div>
        </div></div>

        ${hasCampfire ? `<button class="pillBtn" id="btnCampfire">${Icons.people()} Campfire Group</button>` : ""}
      </div>
    `);

    $("#btnCampfire")?.addEventListener("click", openCampfire);

    $("#btnRedeem")?.addEventListener("click", () => window.open("https://store.pokemongolive.com/", "_blank"));

    $("#btnCopy")?.addEventListener("click", async () => {
      try { await copyToClipboard(code); toast("Copied"); }
      catch { window.prompt("Copy this code", code); }
    });

    $("#btnShare")?.addEventListener("click", async () => {
      if (navigator.share){
        try { await navigator.share({ text: code }); toast("Shared"); }
        catch {}
      }else{
        try { await copyToClipboard(code); toast("Copied"); }
        catch { window.prompt("Copy this code", code); }
      }
    });

    $("#btnReport")?.addEventListener("click", () => {
      const close = mountModal(`
        <div class="title">Report an issue</div>
        <div class="muted">Tell us what went wrong (ex: “Web Store says not eligible”).</div>
        <div style="height:12px"></div>
        <textarea id="reportMsg" placeholder="What happened?"></textarea>
        <div style="height:16px"></div>
        <div class="modalActions">
          <button class="pillBtn" id="btnCancel">Cancel</button>
          <button class="pillBtn danger" id="btnSend">Send</button>
        </div>
      `);
      $("#btnCancel")?.addEventListener("click", close);
      $("#btnSend")?.addEventListener("click", () => {
        let st2 = addReport(readState(), { sessionId: sid, code, message: $("#reportMsg").value });
        writeState(st2);
        close();
        toast("Reported. Thank you!");
      });
    });
  };

  renderReveal();
}


function screenRaffle(){
  mount(`
    ${header({ title: "Raffle Master", subtitle: "Coming next", onBack: () => goto("") })}
    <div class="stack">
      <div class="card"><div class="cardInner">
        <div class="title">Next up</div>
        <div class="muted">Once Code Distributor is dialed in, we'll build the raffle workflow here.</div>
      </div></div>
      <button class="pillBtn" id="btnBackHome">Back</button>
    </div>
  `);
  $("#btnBack")?.addEventListener("click", () => goto(""));
  $("#btnBackHome")?.addEventListener("click", () => goto(""));
}

function route(){
  const hash = (location.hash || "#").replace(/^#/, "");
  const parts = hash.split("/").filter(Boolean);

  // Home
  if (parts.length === 0){
    screenHome();
    return;
  }

  if (parts[0] === "community"){
    screenCommunity();
    return;
  }

  if (parts[0] === "distributor"){
    if (parts[1] === "settings") { screenDistributorSettings(); return; }
    if (parts[1] === "live") { screenDistributorLive(); return; }
    screenDistributor();
    return;
  }

  if (parts[0] === "claim" && parts[1]){
    screenClaim(parts[1]);
    return;
  }

  if (parts[0] === "raffle"){
    screenRaffle();
    return;
  }

  // fallback
  goto("");
}

window.addEventListener("hashchange", route);
route();
