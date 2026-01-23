import {
  loadState, saveState, resetAll,
  counts, addCodes, exportUnused,
  startSession, endSession, togglePause, setSessionCap,
  setDefaultCap, computeDefaultSessionCap, claimOne
} from "./store.js";
import { uid, copyToClipboard, downloadText, escapeHtml } from "./utils.js";

/** tiny DOM helpers (we intentionally do NOT use jQuery) **/
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

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

function screenHome(){
  const s = readState();
  const communityLabel = s.community.name ? s.community.name : "My Community";
  const showWelcome = !(String(s.community.name||"").trim() || String(s.community.campfireUrl||"").trim() || String(s.community.logoDataUrl||"").trim());

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
      <button class="pillBtn" id="btnCommunityBottom">${Icons.gear()} Community Settings</button>
    </div>
  `);

  // handlers
  $("#btnCommunityBottom")?.addEventListener("click", () => goto("community"));
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
          <button class="smallBtn" id="btnEditDefaultCap">${Icons.pencil()} Edit</button>
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
        <div class="banner">
          <div class="title" style="font-size:16px">⚠️ PoGO Limit Warning</div>
          <div class="muted">PoGO often restricts accounts to 1 code per week. If the Web Store says “code is invalid” or “you do not qualify”, the code may still be valid — your account could be on cooldown.</div>
        </div>
      </div></div>
      <button class="pillBtn primary" id="btnSave">Save & Back</button>
    </div>
  `);

  $("#btnBack")?.addEventListener("click", () => goto("distributor"));
  $("#btnSave")?.addEventListener("click", () => {
    let s2 = setDefaultCap(readState(), $("#defaultCap").value);
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
        { id: "share", label: "Copy link", icon: Icons.link() },
        { id: "editCap", label: "Edit session cap", icon: Icons.pencil() }
      ]
    })}
    <div class="stack">
      <div class="card"><div class="cardInner">
        <div class="qrWrap">
          <div id="qrcode" style="width:220px;height:220px"></div>
          <h2>Scan to Claim</h2>
          <div class="qrTools">
            <button class="smallBtn" id="btnFullscreen">Fullscreen</button>
            <button class="smallBtn" id="btnCopyLink">${Icons.link()} Copy Link</button>
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
  $("[data-id='share']")?.addEventListener("click", () => copyToClipboard(playerUrl));
  $("[data-id='editCap']")?.addEventListener("click", () => openEditSessionCap());

  $("#btnCopyLink")?.addEventListener("click", () => copyToClipboard(playerUrl));
  $("#btnFullscreen")?.addEventListener("click", async () => {
    const wrap = $(".qrWrap");
    if (!wrap) return;
    try{
      await wrap.requestFullscreen();
    }catch{}
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
  const st = readState();

  // Build campfire button (no long URL visible)
  const campfireUrl = (st.community.campfireUrl || "").trim();
  const hasCampfire = !!campfireUrl;

  // Validate session
  if (!st.distributor.sessionActive || st.distributor.sessionId !== sessionId){
    mount(`
      ${header({ title: "Code Claim", subtitle: st.community.name || "Garden Grove PoGo", onBack: null })}
      <div class="stack">
        <div class="card"><div class="cardInner">
          <div class="title">Session Ended</div>
          <div class="muted">There isn't an active code session right now. Please check back later.</div>
        </div></div>
        ${hasCampfire ? `<button class="pillBtn primary" id="btnCampfire">${Icons.people()} GGPG Campfire Group</button>` : ""}
      </div>
    `);
    $("#btnCampfire")?.addEventListener("click", () => window.open(campfireUrl, "_blank"));
    return;
  }

  // Attempt claim
  let result = claimOne(st);
  writeState(result.state);

  const s2 = result.state;
  const ended = !result.ok && (result.reason === "cap");
  const paused = !result.ok && (result.reason === "paused");

  if (ended){
    mount(`
      ${header({ title: "Code Claim", subtitle: s2.community.name || "Garden Grove PoGo", onBack: null })}
      <div class="stack">
        <div class="card"><div class="cardInner">
          <div class="title">Session Ended</div>
          <div class="muted">All codes allotted for this session have been claimed. Please check back later.</div>
        </div></div>
        ${hasCampfire ? `<button class="pillBtn primary" id="btnCampfire">${Icons.people()} GGPG Campfire Group</button>` : ""}
      </div>
    `);
    $("#btnCampfire")?.addEventListener("click", () => window.open(campfireUrl, "_blank"));
    return;
  }

  if (paused){
    mount(`
      ${header({ title: "Code Claim", subtitle: s2.community.name || "Garden Grove PoGo", onBack: null })}
      <div class="stack">
        <div class="card"><div class="cardInner">
          <div class="title">Temporarily Paused</div>
          <div class="muted">Please wait a moment and try scanning again.</div>
        </div></div>
        ${hasCampfire ? `<button class="pillBtn primary" id="btnCampfire">${Icons.people()} GGPG Campfire Group</button>` : ""}
      </div>
    `);
    $("#btnCampfire")?.addEventListener("click", () => window.open(campfireUrl, "_blank"));
    return;
  }

  // Success (front-end placeholder code)
  const blurb = "🥳 Thanks for coming out, Trainer! If you’re not already in our Campfire community, join us for future meetups, raids, and event updates.";
  mount(`
    ${header({ title: "Code Claim", subtitle: s2.community.name || "Garden Grove PoGo", onBack: null })}
    <div class="stack">
      <div class="card"><div class="cardInner">
        <div class="row" style="justify-content:center">
          <div class="badge" style="width:74px;height:74px;border-radius:26px;background:rgba(255,255,255,.14)">
            ${s2.community.logoDataUrl ? `<img alt="logo" src="${s2.community.logoDataUrl}" style="width:100%;height:100%;object-fit:cover">` : Icons.people()}
          </div>
        </div>
        <div style="height:12px"></div>
        <div class="banner">
          <div class="title" style="text-align:center">Welcome!</div>
          <div class="muted" style="text-align:center">${escapeHtml(blurb)}</div>
          ${hasCampfire ? `<div style="height:12px"></div><button class="pillBtn primary" id="btnCampfire">${Icons.people()} GGPG Campfire Group</button>` : ""}
        </div>

        <div style="height:14px"></div>

        <div class="banner">
          <div class="title" style="text-align:center">Code Unlocked!</div>
          <div style="height:10px"></div>
          <div class="qrWrap" style="background:rgba(0,0,0,.18);color:rgba(255,255,255,.95);border:1px solid rgba(255,255,255,.18)">
            <div class="kicker">CODE</div>
            <div style="font-size:22px;font-weight:850;letter-spacing:.2em">CODE</div>
          </div>
          <div style="height:12px"></div>
          <div class="row">
            <button class="pillBtn" id="btnCopy">Copy</button>
            <button class="pillBtn" id="btnShare">Share</button>
          </div>
          <div style="height:12px"></div>
          <button class="pillBtn primary" id="btnRedeem">Redeem at Web Store</button>
        </div>
      </div></div>
    </div>
  `);

  $("#btnCampfire")?.addEventListener("click", () => window.open(campfireUrl, "_blank"));
  $("#btnCopy")?.addEventListener("click", () => copyToClipboard("CODE"));
  $("#btnShare")?.addEventListener("click", async () => {
    if (navigator.share){
      try{ await navigator.share({ text: "CODE" }); }catch{}
    }else{
      copyToClipboard("CODE");
    }
  });
  $("#btnRedeem")?.addEventListener("click", () => window.open("https://store.pokemongolive.com/", "_blank"));
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
