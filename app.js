import { loadState, saveState, addCodes, counts, deleteCode, updateCodeText } from "./store.js";
import { downloadText, formatLocal, parseCodesFromText, shareText } from "./utils.js";

// --- Derived selectors (avoid stale function names) ---
const getUnusedCount = (s = state) => counts(s).unused;
const getRedeemedCount = (s = state) => counts(s).redeemed;


const view = document.getElementById("view");
let state = loadState();
let routeQuery = new URLSearchParams();

function setAccent(accentVar){
  document.documentElement.style.setProperty("--accent", `var(${accentVar})`);
}

function nav(hash){
  location.hash = hash;
}

function topbar({ title, subtitle, onBack, rightActions = [] }){
  const backBtn = onBack
    ? `<button class="pill-btn" data-act="back" aria-label="Back"><span class="ico">←</span></button>`
    : `<button class="pill-btn" data-act="noop" aria-hidden="true" style="opacity:0;pointer-events:none;">←</button>`;

  const right = rightActions.map(a => {
    return `<button class="pill-btn" data-act="${a.act}" aria-label="${a.label}"><span class="ico">${a.icon}</span></button>`;
  }).join("");

  return `
    <header class="topbar">
      <div class="left">${backBtn}</div>
      <div class="title-wrap">
        <div class="h1"><span class="accent-title">${title}</span></div>
        ${subtitle ? `<div class="sub">${subtitle}</div>` : ``}
      </div>
      <div class="right">${right || `<span style="width:44px;height:44px;display:block;"></span>`}</div>
    </header>
  `;
}

/* ================
   Screens
   ================ */

function screenHub(){
  setAccent("--gg-blue");

  const hasProfile = Boolean(
    (state.community.name && String(state.community.name).trim()) ||
    (state.community.campfireUrl && String(state.community.campfireUrl).trim()) ||
    (state.community.logoDataUrl && String(state.community.logoDataUrl).trim())
  );

  const communityName = (state.community.name && String(state.community.name).trim()) ? state.community.name.trim() : "My Community";

  const avatar = state.community.logoDataUrl
    ? `<img src="${state.community.logoDataUrl}" alt="Logo" />`
    : `<span class="ico" style="font-size:22px;opacity:0.85;">🌿</span>`;

  const welcomeCard = hasProfile ? "" : `
    <a class="card card-hero" href="#/community">
      <div class="card-row">
        <div class="card-ico"><span class="ico">✨</span></div>
        <div class="card-main">
          <div class="card-title">Welcome, Ambassador!</div>
          <div class="card-sub">Tap to set your Community Profile</div>
        </div>
        <div class="chev">→</div>
      </div>
    </a>
  `;

  view.innerHTML = `
    <div class="col">
      <div class="hub-header">
        <div class="hub-avatar">${avatar}</div>
        <div class="hub-title">
          <div class="hub-name">GG Meetup Tools</div>
          <div class="hub-sub"><span class="ico">👥</span> ${escapeHtml(communityName)}</div>
        </div>
      </div>

      <div class="stack">
        ${welcomeCard}

        <a class="card card-distrib" href="#/distributor">
          <div class="card-row">
            <div class="card-ico"><span class="ico">🎫</span></div>
            <div class="card-main">
              <div class="card-title">Code Distributor</div>
              <div class="card-sub">Queue-based distribution for promo codes.</div>
            </div>
            <div class="chev">→</div>
          </div>
        </a>

        <a class="card card-raffle" href="#/raffle">
          <div class="card-row">
            <div class="card-ico"><span class="ico">🏆</span></div>
            <div class="card-main">
              <div class="card-title">Raffle Master</div>
              <div class="card-sub">Pick random winners from a list.</div>
            </div>
            <div class="chev">→</div>
          </div>
        </a>

        <a class="btn wide" href="#/community"><span class="ico">⚙️</span> Community Settings</a>
      </div>
    </div>
  `;

  // No extra listeners needed (anchors handle navigation)
}


function screenCommunity(){
  setAccent("--gg-green");

  view.innerHTML = `
    <div class="col">
      ${topbar({
        title: "Community Profile",
        subtitle: "Global settings for all tools",
        onBack: () => nav("#/hub"),
        rightActions: []
      })}

      <div class="card pad">
        <div class="col" style="gap:12px;">
          <label class="small">Community Name</label>
          <input id="communityName" class="input" placeholder="e.g. Garden Grove GO" value="${escapeHtml(state.community.name)}"/>

          <label class="small">Campfire URL</label>
          <input id="campfireUrl" class="input" placeholder="https://campfire.onelink.me/..." value="${escapeHtml(state.community.campfireUrl)}"/>

          <label class="small">Group Logo</label>
          <div class="row" style="gap:12px;">
            <div class="tile" style="width:86px;height:86px;display:flex;align-items:center;justify-content:center;">
              ${state.community.logoDataUrl
                ? `<img src="${state.community.logoDataUrl}" alt="Logo" style="width:72px;height:72px;border-radius:16px;object-fit:cover;" />`
                : `<span class="ico" style="opacity:0.5;">🖼️</span>`
              }
            </div>
            <div class="col" style="flex:1;">
              <input id="logoUpload" type="file" accept="image/*" style="display:none;" />
              <button class="btn" id="btnUploadLogo"><span class="ico">⬆️</span> Upload Logo</button>
              ${state.community.logoDataUrl ? `<button class="btn" id="btnClearLogo"><span class="ico">✖</span> Remove</button>` : ``}
            </div>
          </div>
        </div>
      </div>

      <div class="card accent pad" style="--accent: var(--gg-blue);">
        <div style="font-weight:900;font-size:16px;margin-bottom:6px;">Customize the Player Experience</div>
        <div class="small">
          If set, players see your logo + this note alongside the code screen.
        </div>
        <div class="hr"></div>
        <textarea id="welcomeNote" class="textarea" placeholder="Thank players for coming...">${escapeHtml(state.community.welcomeNote)}</textarea>
        <div class="small" style="margin-top:8px;opacity:0.85;">
          Leave empty to skip straight to code.
        </div>
      </div>

      <button class="btn primary wide" id="saveCommunity"><span class="ico">💾</span> Save & Back</button>
    </div>
  `;

  bindCommon();

  const logoUpload = view.querySelector("#logoUpload");
  view.querySelector("#btnUploadLogo").addEventListener("click", () => logoUpload.click());

  logoUpload.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    state.community.logoDataUrl = dataUrl;
    saveState(state);
    screenCommunity();
  });

  view.querySelector("#btnClearLogo")?.addEventListener("click", () => {
    state.community.logoDataUrl = "";
    saveState(state);
    screenCommunity();
  });

  view.querySelector("#saveCommunity").addEventListener("click", () => {
    state.community.name = view.querySelector("#communityName").value.trim();
    state.community.campfireUrl = view.querySelector("#campfireUrl").value.trim();
    state.community.welcomeNote = view.querySelector("#welcomeNote").value.trim();
    saveState(state);
    nav("#/hub");
  });
}

function screenDistributor(){
  setAccent("--gg-orange");

  const unused = getUnusedCount();
  const redeemed = getRedeemedCount();
  const active = Boolean(state.distributor.sessionActive && state.distributor.sessionId);

  view.innerHTML = `
    <div class="col">
      ${topbar({
        title: "Distributor",
        subtitle: "Dashboard",
        onBack: ()=>goto("#/"),
        rightActions: [
          ...(active ? [{act:"share", icon:"🔗", label:"Share"}] : []),
          {act:"settings", icon:"⚙️", label:"Settings"}
        ]
      })}

      <div class="grid2">
        <div class="stat" data-act="manageUnused">
          <div class="stat-num">${unused}</div>
          <div class="stat-lbl">UNUSED <span class="muted">(TAP TO MANAGE)</span></div>
        </div>
        <div class="stat" data-act="viewRedeemed">
          <div class="stat-num">${redeemed}</div>
          <div class="stat-lbl">REDEEMED <span class="muted">(TAP TO VIEW)</span></div>
        </div>
      </div>

      ${active ? `
        <div class="card panel">
          <div class="panel-title"><span class="ico">🟢</span> Live Session</div>
          <div class="panel-sub">A session is currently active. Share the QR for trainers to claim.</div>
          <div class="row gap">
            <button class="btn primary" data-act="viewLive"><span class="ico">🔳</span> View QR Screen</button>
            <button class="btn danger" data-act="endFromDash"><span class="ico">⛔</span> End Session</button>
          </div>
        </div>
      ` : `
        <div class="card panel">
          <div class="panel-title"><span class="ico">🎯</span> Session Cap</div>
          <div class="panel-sub">Optional. Leave empty to default to the full unused inventory (${unused}).</div>
          <div class="row gap">
            <input id="preCapInput" class="input" type="number" inputmode="numeric" min="0" placeholder="Default: ${unused}" />
            <button class="btn primary" data-act="startSession"><span class="ico">▶️</span> Start New Session</button>
          </div>
        </div>
      `}

      <div class="card panel">
        <div class="panel-title"><span class="ico">＋</span> Add Codes</div>
        <div class="panel-sub">Paste codes (one per line) or import a file.</div>
        <textarea id="codePaste" class="textarea" placeholder="Paste codes here..."></textarea>
        <div class="row gap">
          <button class="btn" id="btnAddCodes"><span class="ico">✓</span> Add</button>
          <label class="btn icon" for="fileCodes" title="Import file"><span class="ico">⬆️</span></label>
          <input id="fileCodes" type="file" accept=".txt,.csv" style="display:none" />
        </div>
      </div>

      <button class="btn wide" id="btnExportUnused"><span class="ico">⬇️</span> Export Unused Codes</button>
      <button class="btn wide danger-outline" id="btnResetAll"><span class="ico">🗑️</span> Reset Everything</button>

      <div class="spacer"></div>
    </div>
  `;

  view.querySelector('[data-act="back"]')?.addEventListener("click", ()=>goto("#/"));
  view.querySelector('[data-act="settings"]')?.addEventListener("click", ()=>goto("#/distributor/settings"));

  view.querySelector('[data-act="share"]')?.addEventListener("click", ()=>{
    const sid = state.distributor.sessionId;
    if(!sid){ toast("No live session to share."); return; }
    const url = location.origin + location.pathname + "#/player?sid=" + encodeURIComponent(sid);
    const cap = getSessionCap(sid) ?? getUnusedCount();
    const claimed = getClaimedInSession(sid);
    const remaining = Math.max(0, cap - claimed);
    const msg = `GGPG Code Session\nRemaining: ${remaining} / Cap: ${cap}\n${url}`;
    copyText(msg).then(()=>toast("Session link copied!"));
  });

  view.querySelector('[data-act="viewLive"]')?.addEventListener("click", ()=>goto(`#/distributor/session?sid=${encodeURIComponent(state.distributor.sessionId)}`));
  view.querySelector('[data-act="endFromDash"]')?.addEventListener("click", ()=>{
    if(confirm("End the current session? Trainers will no longer be able to claim.")){
      endSession();
      toast("Session ended.");
      screenDistributor();
    }
  });

  $("#btnAddCodes")?.addEventListener("click", ()=>{
    const raw = $("#codePaste").value || "";
    const lines = raw.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if(!lines.length) return toast("Paste at least one code.");
    addCodes(lines);
    $("#codePaste").value = "";
    toast(`Added ${lines.length} code(s).`);
    screenDistributor();
  });

  $("#fileCodes")?.addEventListener("change", async (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const txt = await f.text();
    const lines = txt.split(/\r?\n|,|;/).map(s=>s.trim()).filter(Boolean);
    if(!lines.length) return toast("No codes found in file.");
    addCodes(lines);
    toast(`Imported ${lines.length} code(s).`);
    e.target.value = "";
    screenDistributor();
  });

  $("#btnExportUnused")?.addEventListener("click", exportUnusedCodes);
  $("#btnResetAll")?.addEventListener("click", ()=>{
    if(confirm("Reset everything? This clears codes, receipts, and settings.")){
      resetAll();
      toast("Reset complete.");
      goto("#/");
    }
  });

  view.querySelector('[data-act="startSession"]')?.addEventListener("click", ()=>{
    const unusedNow = getUnusedCount();
    if(unusedNow<=0) return toast("No unused codes available.");
    const raw = ($("#preCapInput")?.value || "").trim();
    let capManual = raw==="" ? null : parseInt(raw,10);
    if(Number.isNaN(capManual) || capManual===0) capManual = null;

    const cap = capManual ? Math.min(capManual, unusedNow) : unusedNow;

    startSession(cap);
  });

  view.querySelector('[data-act="manageUnused"]')?.addEventListener("click", ()=>goto("#/distributor/inventory"));
  view.querySelector('[data-act="viewRedeemed"]')?.addEventListener("click", ()=>goto("#/distributor/redeemed"));
}



function screenDistributorPlayer(){
  setAccent("--accent-distributor");

  const sid = routeQuery.get("sid") || "session";
  const paused = getSessionPaused(sid);
  let cap = getSessionCap(sid);
  const capFromUrl = routeQuery.get("cap");
  if((cap === null || cap === undefined) && capFromUrl){
    const n = parseInt(capFromUrl, 10);
    if(!Number.isNaN(n)) cap = n;
  }
  const claimed = getSessionClaimed(sid);
  const remaining = Math.max(0, (cap ?? 0) - claimed);

  const communityName = state.community.name?.trim() || "My Community";
  const note = state.community.welcomeNote?.trim() || "";
  const campfire = state.community.campfireUrl?.trim() || "";

  // If the player is not on the host device, they won't have inventory stored locally.
  // For now (front-end-only), we still present the full UI; backend will later power real distribution.
  const localInventoryCount = counts(state).unused;

  if (paused){
    view.innerHTML = `
      <div class="col">
        ${topbar({ title: "Code Claim", subtitle: communityName, onBack: () => nav("#/hub") })}
        <div class="card accent pad" style="--accent: var(--accent-distributor);">
          <div style="font-weight:900;font-size:18px;">Distribution is on hold</div>
          <div class="small" style="margin-top:6px;">Please check back in a moment.</div>
        </div>
      </div>
    `;
    bindCommon();
    return;
  }

  if (!cap || remaining <= 0){
    view.innerHTML = `
      <div class="col">
        ${topbar({ title: "Code Claim", subtitle: communityName, onBack: () => nav("#/hub") })}
        <div class="card pad">
          <div style="font-weight:900;font-size:18px;">Session ended</div>
          <div class="small" style="margin-top:6px;">There are no further codes left to claim at this time.</div>
          <div class="small" style="margin-top:10px; opacity:0.85;">If you need help, please reach out to a Community Ambassador.</div>
        </div>
      </div>
    `;
    bindCommon();
    return;
  }

  if (hasDeviceClaimedThisSession(sid)){
    view.innerHTML = `
      <div class="col">
        ${topbar({ title: "Code Claim", subtitle: communityName, onBack: () => nav("#/hub") })}
        <div class="card pad">
          <div style="font-weight:900;font-size:18px;">Already claimed</div>
          <div class="small" style="margin-top:6px;">This device has already claimed a code for this session.</div>
          <div class="small" style="margin-top:10px; opacity:0.85;">If you need help, please reach out to a Community Ambassador.</div>
        </div>
      </div>
    `;
    bindCommon();
    return;
  }

  const logo = state.community.logoDataUrl
    ? `<img src="${state.community.logoDataUrl}" alt="Logo" style="width:82px;height:82px;border-radius:22px;object-fit:cover; border:1px solid rgba(255,255,255,0.12);" />`
    : `<div class="icon-tile" style="width:82px;height:82px;border-radius:24px;"><span class="ico">🌿</span></div>`;

  view.innerHTML = `
    <div class="col">
      ${topbar({ title: "Code Claim", subtitle: communityName, onBack: () => nav("#/hub") })}

      <div class="card pad">
        <div class="center col" style="gap:12px;">
          ${logo}
          <div style="font-weight:900;font-size:20px;">Ready to claim?</div>
          <div class="small" style="text-align:center; opacity:0.82;">Tap below to get your reward code.</div>
          <button class="btn primary distributor" style="width:100%;" data-act="claim">🎁 Claim Code</button>

          ${localInventoryCount === 0 ? `
            <div class="small" style="margin-top:8px; opacity:0.70; text-align:center;">
              (Front-end sandbox note: this device has no local code inventory loaded.)
            </div>
          ` : ``}
        </div>
      </div>

      <div class="small" style="text-align:center; opacity:0.70; margin-top: 8px;">
        Session remaining: <b>${remaining}</b>
      </div>
    </div>
  `;

  view.querySelector('[data-act="claim"]').addEventListener("click", () => {
    const inv = loadState(); // fresh
    const next = inv.codes.find(c => c.status === "unused");
    if (!next){
      alert(`No codes available on this device.

For true live distribution across devices, a backend is needed.`);
      return;
    }

    // Mark claimed in inventory
    next.status = "claimed";
    next.claimedAt = new Date().toISOString();
    next.claimedSessionId = sid;
    saveState(inv);
    state = inv; // keep in-memory in sync

    // Update session counters (Option A rules already enforced host-side for cap edits)
    const curClaimed = getSessionClaimed(sid);
    setSessionClaimed(sid, curClaimed + 1);
    markDeviceClaimedThisSession(sid);

    // Render code screen
    const code = next.codeText;
    const redeemUrl = `https://store.pokemongo.com/offer-redemption?passcode=${encodeURIComponent(code)}`;

    view.innerHTML = `
      <div class="col">
        ${topbar({ title: "Your Reward", subtitle: communityName, onBack: () => nav("#/hub") })}

        <div class="card pad">
          <div class="card-title">🎁 Your Code</div>

          ${note ? `
            <div class="host-note">
              <div class="host-note-title">Message from the host</div>
              <div class="host-note-body">${escapeHtml(note)}</div>
              ${campfire ? `
                <div style="margin-top:10px;">
                  <a class="btn-mini" href="${campfire}" target="_blank" rel="noopener noreferrer">🔥 GGPG Campfire Group</a>
                </div>
              ` : ``}
            </div>
          ` : (campfire ? `
            <div style="margin: 10px 0 14px;">
              <a class="btn-mini" href="${campfire}" target="_blank" rel="noopener noreferrer">🔥 GGPG Campfire Group</a>
            </div>
          ` : ``)}

          <div class="code-box">${escapeHtml(code)}</div>

          <div class="row" style="gap:10px; margin-top:12px;">
            <button class="btn" data-act="copy">⧉ Copy</button>
            <button class="btn primary distributor" data-act="redeem">🛒 Redeem</button>
          </div>

          <div class="small" style="margin-top:12px; opacity:0.75;">
            If the code shows as invalid, please reach out to a Community Ambassador.
          </div>
        </div>
      </div>
    `;

    view.querySelector('[data-act="copy"]').addEventListener("click", async () => {
      try{
        await navigator.clipboard.writeText(code);
        toast("Copied.");
      }catch{
        toast("Copy failed.");
      }
    });

    view.querySelector('[data-act="redeem"]').addEventListener("click", () => {
      window.open(redeemUrl, "_blank", "noopener,noreferrer");
    });

    if (navigator.vibrate) navigator.vibrate(25);
  });

  bindCommon();
}


function screenDistributorSettings() {
  const state = getState();
  const s = state.distributorSettings || {};
  const view = el(`
    <div class="shell">
      ${topbar({ title: "Distributor Settings", back: "#/distributor", tone: "distributor" })}
      <div class="content">
        <div class="panel">
          <div class="panel-title">Behavior</div>

          <label class="row">
            <div class="row-main">
              <div class="row-title">Haptics</div>
              <div class="row-sub">Vibrate lightly on key actions (supported devices only).</div>
            </div>
            <input id="setHaptics" type="checkbox" ${s.haptics ? "checked" : ""} />
          </label>

          <label class="row">
            <div class="row-main">
              <div class="row-title">Test Mode</div>
              <div class="row-sub">Generates fake codes so you can demo without real inventory.</div>
            </div>
            <input id="setTestMode" type="checkbox" ${s.testMode ? "checked" : ""} />
          </label>

          <label class="row">
            <div class="row-main">
              <div class="row-title">Daily Cooldown</div>
              <div class="row-sub">Limit each device to 1 code per day (local-only).</div>
            </div>
            <input id="setCooldown" type="checkbox" ${s.dailyCooldown ? "checked" : ""} />
          </label>
        </div>

        <div class="panel">
          <div class="panel-title">Session Cap</div>

          <label class="row">
            <div class="row-main">
              <div class="row-title">Enable Cap</div>
              <div class="row-sub">Stop dispensing after X successful claims.</div>
            </div>
            <input id="setCapEnabled" type="checkbox" ${s.sessionCapEnabled ? "checked" : ""} />
          </label>

          <div class="row" style="align-items:center; gap:12px;">
            <div class="row-main">
              <div class="row-title">Max Claims</div>
              <div class="row-sub">Set to 0 to disable.</div>
            </div>
            <input id="setCap" class="input" inputmode="numeric" pattern="[0-9]*" style="width:120px;" value="${Number(s.sessionCap || 0)}" />
          </div>
        </div>

        <button id="btnSave" class="btn primary distributor" style="width:100%;">💾 Save</button>

        <div class="hint" style="margin-top:12px;">
          Notes:
          <ul>
            <li>Cooldown + cap are enforced in the <b>Player Screen</b> (the page players open).</li>
            <li>Everything here is stored locally in your browser (GitHub Pages has no server).</li>
          </ul>
        </div>
      </div>
    </div>
  `);

  mount(view);

  view.querySelector("#btnSave").addEventListener("click", () => {
    const next = {
      haptics: !!view.querySelector("#setHaptics").checked,
      testMode: !!view.querySelector("#setTestMode").checked,
      dailyCooldown: !!view.querySelector("#setCooldown").checked,
      sessionCapEnabled: !!view.querySelector("#setCapEnabled").checked,
      sessionCap: Math.max(0, parseInt(view.querySelector("#setCap").value || "0", 10) || 0)
    };
    setState({ distributorSettings: next });
    toast("Saved.");
    location.hash = "#/distributor";
  });
}


function screenDistributorSession(){
  setAccent("--accent-distributor");

  const sid = routeQuery.get("sid") || state.distributor.sessionId || "";
  if (!sid){
    toast("No active session. Start a new session first.");
    return nav("#/distributor");
  }

  const claimed = getSessionClaimed(sid);
  let cap = getSessionCap(sid);
  if(cap === null || cap === undefined){
    cap = getUnusedCount() + claimed;
    setSessionCap(sid, cap);
  }
  const remaining = Math.max(0, cap - claimed);
  const paused = getSessionPaused(sid);

  const claimUrl = `${location.origin}${location.pathname}#/distributor/player?sid=${encodeURIComponent(sid)}`;

  view.innerHTML = `
    <div class="col">
      ${topbar({
        title: "Code Distributor",
        subtitle: "LIVE SESSION",
        onBack: () => nav("#/distributor")
      })}

      <div class="qr-card">
        <div class="qr-frame"><div id="qr"></div></div>
        <div class="qr-help">SCAN TO CLAIM</div>

        <div class="row" style="margin-top:14px; gap:10px;">
          <button class="btn" data-act="full">⛶ Fullscreen</button>
          <button class="btn" data-act="copy">⧉ Copy Link</button>
        </div>

        <div class="stats-row">
          <div class="stat-tile">
            <div class="stat-label">REMAINING</div>
            <div class="stat-value">${remaining}</div>
            <div class="stat-sub">Session remaining</div>
          </div>

          <div class="stat-tile">
            <div class="stat-label">
              <span>CLAIMED</span>
              <button class="pill-btn" style="padding:6px 10px;" data-act="editCap" aria-label="Edit session cap">✎</button>
            </div>
            <div class="stat-value">${claimed}</div>
            <div class="stat-sub">CAP: ${safeCap}</div>
          </div>
        </div>

        <div class="small" style="text-align:center; margin-top: 12px; opacity:0.78;">
          ${paused ? "Distribution is currently paused." : "Waiting for scans…"}
        </div>

        <div class="row" style="margin-top:14px; gap:10px;">
          <button class="btn" data-act="pause">${paused ? "▶︎ Resume" : "⏸ Pause"}</button>
          <button class="btn" data-act="print">🖨 Print</button>
          <button class="btn" data-act="nfc">📳 NFC</button>
        </div>

        <button class="btn danger wide" style="margin-top:12px;" data-act="end">⏹ End Session</button>
      </div>
    </div>
  `;

  // Render QR
  const qrEl = view.querySelector("#qr");
  try{
    qrEl.innerHTML = "";
    // QRCode is provided by qrcodejs (CDN in index.html)
    new QRCode(qrEl, {
      text: claimUrl,
      width: 240,
      height: 240,
      correctLevel: QRCode.CorrectLevel.M
    });
  }catch(e){
    qrEl.innerHTML = `<div style="color:#111; font-weight:800; text-align:center;">(QR unavailable)</div>`;
  }

  view.querySelector('[data-act="copy"]').addEventListener("click", async () => {
    try{
      await navigator.clipboard.writeText(claimUrl);
      toast("Link copied.");
    }catch{
      toast("Copy failed.");
    }
  });

  view.querySelector('[data-act="full"]').addEventListener("click", () => {
    const card = view.querySelector(".qr-card");
    if (card.requestFullscreen) card.requestFullscreen();
  });

  view.querySelector('[data-act="pause"]').addEventListener("click", () => {
    const next = !getSessionPaused(sid);
    setSessionPaused(sid, next);
    toast(next ? "Paused." : "Resumed.");
    route();
  });

  view.querySelector('[data-act="end"]').addEventListener("click", () => {
    if (!confirm("End this session? Codes not used will remain unused.")) return;
    // Clear session fields in state (inventory stays)
    state.distributor.sessionId = "";
    state.distributor.sessionActive = false;
    state.distributor.sessionCap = null;
    state.distributor.sessionClaimed = 0;
    saveState(state);
    toast("Session ended.");
    nav("#/distributor");
  });

  // Edit cap modal (Option A: clamp to claimed)
  view.querySelector('[data-act="editCap"]').addEventListener("click", () => {
    const current = getSessionCap(sid) ?? 0;
    openDialog(`
      <h3>Edit Session Cap</h3>
      <div class="sub">Set the maximum number of codes to dispense for this session.</div>

      <label class="small" style="display:block; margin-bottom:6px; letter-spacing:0.12em;">SESSION CAP</label>
      <input id="capInput" class="input" inputmode="numeric" pattern="[0-9]*" placeholder="Unlimited" value="${current || ""}" />

      <div class="sub" style="margin-top:10px;">If you set a cap lower than already claimed, it will be automatically adjusted up.</div>

      <div class="actions">
        <button class="btn" data-act="dlgClose">Cancel</button>
        <button class="btn primary distributor" data-act="saveCap">Save</button>
      </div>
    `);

    document.querySelector('[data-act="saveCap"]').addEventListener("click", () => {
      const raw = document.getElementById("capInput").value.trim();
      const nextCap = raw === "" ? 0 : Math.max(0, parseInt(raw,10) || 0);
      const already = getSessionClaimed(sid);
      const clamped = Math.max(nextCap, already);
      setSessionCap(sid, clamped);
      closeDialog();
      toast("Cap updated.");
      route();
    }, { once:true });
  });
}


function screenRaffleStub(){
  setAccent("--accent-raffle");
  view.innerHTML = `
    <div class="col">
      ${topbar({
        title: "Raffle Master",
        subtitle: "Sandbox stub",
        onBack: () => nav("#/hub"),
        rightActions: []
      })}
      <div class="card accent pad" style="--accent: var(--accent-raffle);">
        <div style="font-weight:900;font-size:18px;">Raffle Master coming next</div>
        <div class="small" style="margin-top:8px;">
          We can clone the 3-step wizard + participant join flow + winner confetti screen using realtime later.
        </div>
        <div class="hr"></div>
        <button class="btn wide" data-go="#/hub">Back to Hub</button>
      </div>
    </div>
  `;
  bindCommon();
}

function route(){
  state = loadState();
  const h = location.hash || "#/hub";
  const raw = h.replace(/^#/, "");
  const [path, qs] = raw.split("?");
  routeQuery = new URLSearchParams(qs || "");

  if (path === "/hub") return screenHub();
  if (path === "/community") return screenCommunity();
  if (path === "/distributor") return screenDistributor();
  if (path === "/distributor/unused") return screenDistributorUnused();
  if (path === "/distributor/player") return screenDistributorPlayer();
  if (path === "/distributor/session") return screenDistributorSession();
  if (path === "/raffle") return screenRaffleStub();

  nav("#/hub");
}

window.addEventListener("hashchange", route);
window.addEventListener("storage", (e) => {
  if (e.key && e.key.startsWith("gg-tools-sandbox")) {
    state = loadState();
    route();
  }
});
route();

/* =========================
   Menu modal (real)
   ========================= */
const menuModal = document.createElement("div");
menuModal.className = "modal";
menuModal.innerHTML = `
  <div class="backdrop" data-act="closeMenu"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Menu">
    <div class="handle"></div>
    <div class="content">
      <h3>Menu</h3>
      <div class="menu-list">
        <div class="menu-item" data-act="menuAbout">
          <div class="left">
            <div class="icon-tile" style="width:42px;height:42px;border-radius:14px;"><span class="ico">ℹ️</span></div>
            <div style="min-width:0;">
              <div class="label">About</div>
              <div class="desc">What this sandbox is + quick tips</div>
            </div>
          </div>
          <div class="chev">→</div>
        </div>

        <div class="menu-item" data-act="menuExport">
          <div class="left">
            <div class="icon-tile" style="width:42px;height:42px;border-radius:14px;"><span class="ico">⬇️</span></div>
            <div style="min-width:0;">
              <div class="label">Export Data (JSON)</div>
              <div class="desc">Backup local sandbox state</div>
            </div>
          </div>
          <div class="chev">→</div>
        </div>

        <div class="menu-item" data-act="menuImport">
          <div class="left">
            <div class="icon-tile" style="width:42px;height:42px;border-radius:14px;"><span class="ico">⬆️</span></div>
            <div style="min-width:0;">
              <div class="label">Import Data (JSON)</div>
              <div class="desc">Restore a previous backup</div>
            </div>
          </div>
          <div class="chev">→</div>
        </div>

        <div class="menu-item" data-act="menuReset" style="border-color: rgba(248,102,13,0.35);">
          <div class="left">
            <div class="icon-tile" style="width:42px;height:42px;border-radius:14px;border-color: rgba(248,102,13,0.35);"><span class="ico">🧨</span></div>
            <div style="min-width:0;">
              <div class="label">Reset Sandbox</div>
              <div class="desc">Clears localStorage for this site</div>
            </div>
          </div>
          <div class="chev">→</div>
        </div>

        <button class="btn wide" data-act="closeMenu"><span class="ico">✕</span> Close</button>
      </div>
      <input id="menuImportFile" type="file" accept="application/json" style="display:none;" />
    </div>
  </div>
`;
document.body.appendChild(menuModal);
// Center dialog overlay (for cap prompts, etc.)
const dialogOverlay = document.createElement("div");
dialogOverlay.className = "dialog-overlay";
dialogOverlay.innerHTML = `
  <div class="backdrop" data-act="dlgClose"></div>
  <div class="dialog" role="dialog" aria-modal="true">
    <div class="content" id="dlgContent"></div>
  </div>
`;
document.body.appendChild(dialogOverlay);

function openDialog(html){
  document.getElementById("dlgContent").innerHTML = html;
  dialogOverlay.classList.add("open");
}
function closeDialog(){
  dialogOverlay.classList.remove("open");
}
dialogOverlay.addEventListener("click", (e) => {
  if (e.target.closest('[data-act="dlgClose"]')) closeDialog();
});


function openMenu(){
  menuModal.classList.add("open");
}
function closeMenu(){
  menuModal.classList.remove("open");
}

menuModal.addEventListener("click", async (e) => {
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (!act) return;

  if (act === "closeMenu"){
    closeMenu();
    return;
  }

  if (act === "menuAbout"){
    closeMenu();
    alert(
      "GG Tools Sandbox\\n\\n" +
      "• Vanilla HTML/CSS/JS (no framework)\\n" +
      "• Data is stored locally in your browser (localStorage)\\n" +
      "• Use Export/Import to backup state\\n\\n" +
      "Tip: On iOS Safari, Share → Add to Home Screen for an app-like feel."
    );
    return;
  }

  if (act === "menuExport"){
    // Lazy import to avoid circular deps here
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gg-tools-sandbox-backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Exported.");
    return;
  }

  if (act === "menuImport"){
    document.getElementById("menuImportFile").click();
    return;
  }

  if (act === "menuReset"){
    closeMenu();
    if (confirm("Reset sandbox data? This clears local settings and codes.")){
      localStorage.clear();
      state = loadState();
      toast("Reset.");
      route();
    }
    return;
  }
});

document.getElementById("menuImportFile").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try{
    const text = await file.text();
    const parsed = JSON.parse(text);
    // basic merge safety
    state = { ...loadState(), ...parsed };
    saveState(state);
    toast("Imported.");
    closeMenu();
    route();
  }catch{
    toast("Import failed (invalid JSON).");
  }finally{
    e.target.value = "";
  }
});

function bindCommon(){
  view.querySelector('[data-act="back"]')?.addEventListener("click", () => history.back());
  view.querySelectorAll("[data-go]").forEach(el => {
    el.addEventListener("click", () => nav(el.getAttribute("data-go")));
  });
  }

function toast(msg){
  const t = document.createElement("div");
  t.textContent = msg;
  Object.assign(t.style, {
    position: "fixed",
    left: "50%",
    bottom: "24px",
    transform: "translateX(-50%)",
    padding: "10px 14px",
    borderRadius: "999px",
    background: "rgba(0,0,0,0.75)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.92)",
    zIndex: 9999,
    maxWidth: "90vw",
    fontSize: "14px",
    boxShadow: "0 12px 28px rgba(0,0,0,0.45)"
  });
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1400);
}

function escapeHtml(s){
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}


function sessionKey(sid, suffix){
  return `ggtools:dist:session:${sid}:${suffix}`;
}
function getSessionClaimed(sid){
  try { return parseInt(localStorage.getItem(sessionKey(sid,"claimed")) || "0", 10) || 0; } catch(e){ return 0; }
}
function setSessionClaimed(sid, n){
  localStorage.setItem(sessionKey(sid,"claimed"), String(n));
}
function getSessionPaused(sid){
  try { return (localStorage.getItem(sessionKey(sid,"paused")) || "0") === "1"; } catch(e){ return false; }
}
function setSessionPaused(sid, v){
  localStorage.setItem(sessionKey(sid,"paused"), v ? "1" : "0");
}
function getSessionCap(sid){
  const raw = localStorage.getItem(sessionKey(sid,"cap"));
  if (raw === null || raw === undefined || raw === "") return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}
function setSessionCap(sid, n){
  localStorage.setItem(sessionKey(sid,"cap"), String(n));
}
function hasDeviceClaimedThisSession(sid){
  return (localStorage.getItem(sessionKey(sid,"deviceClaimed")) || "0") === "1";
}
function markDeviceClaimedThisSession(sid){
  localStorage.setItem(sessionKey(sid,"deviceClaimed"), "1");
}

function newSessionId(){
  return Math.random().toString(36).slice(2,8).toUpperCase();
}

function startSession(cap){
  const unusedNow = getUnusedCount();
  if(unusedNow<=0) return toast("No unused codes available.");
  const sid = newSessionId();
  const safeCap = Math.max(0, Math.min(Number(cap)||unusedNow, unusedNow));
  setSessionCap(sid, safeCap);
  setSessionPaused(sid, false);
  setSessionClaimed(sid, 0);

  setState({
    distributor: {
      ...state.distributor,
      sessionId: sid,
      sessionActive: true,
      isPaused: false
    }
  });

  goto(`#/distributor/session?sid=${encodeURIComponent(sid)}`);
}

function endSession(){
  const sid = state.distributor.sessionId;
  // Keep per-session keys (cap/paused/claimed) so history doesn't break.
  setState({
    distributor: {
      ...state.distributor,
      sessionId: "",
      sessionActive: false,
      isPaused: true
    }
  });
}


function escapeAttr(s){
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}
function stripUrlsMultiline(s){
  const lines = (s ?? "").toString().split(/\r?\n/);
  const cleaned = lines.map(l => l.replace(/https?:\/\/\S+/g,"").trim()).filter(Boolean);
  return cleaned.join("\n");
}
function wrapEmojis(s){
  // Wrap most emoji glyphs in a subtle pill so they stay readable on colorful backgrounds.
  // NOTE: This intentionally over-matches some symbols; visually it's fine.
  return (s ?? "").toString().replace(/([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])/gu, '<span class="emoji-pill">$1</span>');
}



function fileToDataURL(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}