import { loadState, saveState, addCodes, counts, deleteCode, updateCodeText } from "./store.js";
import { downloadText, formatLocal, parseCodesFromText, shareText } from "./utils.js";

const view = document.getElementById("view");
let state = loadState();

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

  const communityName = state.community.name?.trim() || "My Community";

  const avatar = state.community.logoDataUrl
    ? `<img src="${state.community.logoDataUrl}" alt="Logo" />`
    : `<span class="ico" style="font-size:22px;opacity:0.85;">🌿</span>`;

  view.innerHTML = `
    <div class="col">
      <div class="hub-header">
        <div class="hub-brand">
          <div class="brand-avatar">${avatar}</div>
          <div class="brand-meta">
            <h1 class="hub-title"><span class="accent-title">GG Meetup Tools</span></h1>
            <div class="hub-sub"><span class="ico">👥</span> ${escapeHtml(communityName)}</div>
          </div>
        </div>
</div>

      <div class="card accent pad" style="--accent: var(--gg-blue); cursor:pointer;" data-go="#/community">
        <div class="row space-between">
          <div class="row" style="gap:12px;">
            <div class="icon-tile" style="border-color: rgba(255,255,255,0.12);">
              <span class="ico">✨</span>
            </div>
            <div>
              <div style="font-weight:900;font-size:18px;">Welcome, Ambassador!</div>
              <div class="small">Tap to set your Community Profile</div>
            </div>
          </div>
          <div class="ico" style="opacity:0.75;">→</div>
        </div>
      </div>

      <div class="tool-card" data-go="#/distributor" style="
        border-color: color-mix(in srgb, var(--gg-orange) 46%, rgba(255,255,255,0.10));
        box-shadow: 0 0 26px rgba(248,102,13,0.10), inset 0 1px 0 rgba(255,255,255,0.04);
      ">
        <div class="icon-tile"><span class="ico">⌁</span></div>
        <div class="meta">
          <p class="t">Code Distributor</p>
          <p class="d">Queue-based distribution for promo codes.</p>
        </div>
        <div class="chev">→</div>
      </div>

      <div class="tool-card" data-go="#/raffle" style="
        border-color: color-mix(in srgb, var(--gg-blue) 46%, rgba(255,255,255,0.10));
        box-shadow: 0 0 26px rgba(0,152,214,0.10), inset 0 1px 0 rgba(255,255,255,0.04);
      ">
        <div class="icon-tile"><span class="ico">🏆</span></div>
        <div class="meta">
          <p class="t">Raffle Master</p>
          <p class="d">Pick random winners from a list.</p>
        </div>
        <div class="chev">→</div>
      </div>

      <div class="tool-card locked" aria-disabled="true">
        <div class="icon-tile"><span class="ico">🧠</span></div>
        <div class="meta">
          <p class="t">Trivia Master</p>
          <p class="d">Host a live game show on the big screen.</p>
        </div>
        <div class="chev">🔒</div>
      </div>

      <button class="btn wide" data-go="#/community">
        <span class="ico">⚙️</span> Community Settings
      </button>
    </div>
  `;

  bindCommon();
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
          If set, players see your logo + this note before the code screen.
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
  setAccent("--accent-distributor");
  const c = counts(state);

  view.innerHTML = `
    <div class="col">
      ${topbar({
        title: "Distributor",
        subtitle: "Dashboard",
        onBack: () => nav("#/hub"),
        rightActions: [
          { act: "share", label: "Share", icon: "⤴︎" },
          { act: "settings", label: "Settings", icon: "⚙️" }
        ]
      })}

      <div class="row">
        <div class="tile" style="flex:1; cursor:pointer;" data-go="#/distributor/unused">
          <div style="font-size:40px;font-weight:900;line-height:1;">${c.unused}</div>
          <div class="small" style="letter-spacing:0.14em; margin-top:8px;">UNUSED (TAP TO MANAGE)</div>
        </div>
        <div class="tile" style="flex:1; opacity:0.65;">
          <div style="font-size:40px;font-weight:900;line-height:1;">${c.redeemed}</div>
          <div class="small" style="letter-spacing:0.14em; margin-top:8px;">REDEEMED (TAP TO VIEW)</div>
        </div>
      </div>

      <div class="card accent pad" style="--accent: var(--accent-distributor);">
        <div style="font-weight:900;font-size:16px;"><span class="ico">＋</span> Add Codes</div>
        <div class="small" style="margin-top:6px;">Paste codes (one per line) or import a file.</div>
        <div style="height:10px;"></div>

        <textarea id="codesPaste" class="textarea" placeholder="Paste codes here..."></textarea>

        <div class="row" style="margin-top:12px;">
          <button class="btn" style="flex:1;" id="btnAdd"><span class="ico">✓</span> Add</button>

          <input id="fileImport" type="file" accept=".csv,text/csv,.txt,text/plain" style="display:none;" />
          <button class="btn" style="width:56px;" id="btnImport" aria-label="Import file"><span class="ico">⬆️</span></button>
        </div>

        <div class="small" id="addMsg" style="margin-top:10px; min-height:18px;"></div>
      </div>

      <div class="card pad">
        <div class="row space-between">
          <div>
            <div style="font-weight:900;">LIVE SESSION</div>
            <div class="small">Control dispensing state.</div>
          </div>
          <div class="chip" style="border-color: color-mix(in srgb, var(--accent-distributor) 55%, rgba(255,255,255,0.12));">
            ${state.distributor.isPaused ? "PAUSED" : "RUNNING"}
          </div>
        </div>

        <div class="row" style="margin-top:12px;">
          <div class="tile" style="flex:1;">
            <div class="small">CLAIMED</div>
            <div style="font-size:26px;font-weight:900;margin-top:4px;">${c.redeemed}</div>
          </div>
          <div class="tile" style="flex:1;">
            <div class="small">CAP</div>
            <div style="font-size:26px;font-weight:900;margin-top:4px;">${state.distributor.cap ?? "—"}</div>
          </div>
        </div>

        <div class="row" style="margin-top:12px;">
          <button class="btn primary" id="btnTogglePause" style="flex:1;">
            <span class="ico">${state.distributor.isPaused ? "▶" : "⏸"}</span>
            ${state.distributor.isPaused ? "Resume" : "Pause"}
          </button>
          <button class="btn" id="btnSetCap" style="width:120px;">Set Cap</button>
        </div>
      </div>

      <div class="card pad">
        <div style="font-weight:900;">Player Preview</div>
        <div class="small">Optional: quick peek at what players would see.</div>
        <div style="height:10px;"></div>
        <button class="btn wide" data-go="#/distributor/player"><span class="ico">📱</span> Open Player Screen</button>
      </div>
    </div>
  `;

  bindCommon();

  view.querySelector('[data-act="share"]').addEventListener("click", async () => {
    const url = `${location.origin}${location.pathname}#/distributor/player`;
    const res = await shareText({
      title: "GG Code Distributor",
      text: "Scan or tap to claim a code:",
      url
    });
    toast(res.ok ? (res.fallback === "copied" ? "Link copied." : "Shared.") : "Share canceled.");
  });

  view.querySelector('[data-act="settings"]').addEventListener("click", () => {
    toast("Settings page can be added next (toggles, haptics, etc.).");
  });

  view.querySelector("#btnAdd").addEventListener("click", () => {
    const raw = view.querySelector("#codesPaste").value;
    const codes = parseCodesFromText(raw);
    addCodes(state, codes);
    saveState(state);
    view.querySelector("#codesPaste").value = "";
    screenDistributor();
  });

  const fileInput = view.querySelector("#fileImport");
  view.querySelector("#btnImport").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const codes = parseCodesFromText(text);
    addCodes(state, codes);
    saveState(state);
    toast("Imported.");
    screenDistributor();
  });

  view.querySelector("#btnTogglePause").addEventListener("click", () => {
    state.distributor.isPaused = !state.distributor.isPaused;
    saveState(state);
    screenDistributor();
  });

  view.querySelector("#btnSetCap").addEventListener("click", () => {
    const cur = state.distributor.cap ?? "";
    const v = prompt("Session cap (blank for unlimited):", String(cur));
    if (v === null) return;
    const num = v.trim() === "" ? null : Number(v.trim());
    state.distributor.cap = Number.isFinite(num) ? num : null;
    saveState(state);
    screenDistributor();
  });
}

function screenDistributorUnused(){
  setAccent("--accent-distributor");

  const unused = state.codes.filter(c => c.status === "unused");
  view.innerHTML = `
    <div class="col">
      ${topbar({
        title: "Unused Codes",
        subtitle: "",
        onBack: () => nav("#/distributor"),
        rightActions: []
      })}

      <div class="card pad">
        <input id="search" class="input" placeholder="Search codes..." />
        <div style="height:12px;"></div>
        <button class="btn wide" id="exportTxt"><span class="ico">⬇️</span> Export Unused (TXT)</button>
      </div>

      <div class="col" id="list" style="gap:12px;"></div>
    </div>
  `;

  bindCommon();

  const list = view.querySelector("#list");
  const renderList = (query = "") => {
    const q = query.trim().toUpperCase();
    const rows = unused
      .filter(item => item.codeText.includes(q))
      .map(item => `
        <div class="list-row" data-id="${item.id}">
          <div style="min-width:0;">
            <div class="main">${escapeHtml(item.codeText)}</div>
            <div class="subline">Uploaded: ${escapeHtml(formatLocal(item.uploadedAt))}</div>
          </div>
          <div class="row" style="gap:10px;">
            <button class="icon-btn" data-act="edit" aria-label="Edit"><span class="ico">✎</span></button>
            <button class="icon-btn" data-act="del" aria-label="Delete"><span class="ico">🗑</span></button>
          </div>
        </div>
      `)
      .join("");

    list.innerHTML = rows || `<div class="small" style="opacity:0.75; text-align:center; margin-top:10px;">No matches.</div>`;
  };

  renderList();

  view.querySelector("#search").addEventListener("input", (e) => renderList(e.target.value));

  view.querySelector("#exportTxt").addEventListener("click", () => {
    const txt = unused.map(c => c.codeText).join("\n");
    downloadText("unused-codes.txt", txt);
  });

  list.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    const row = e.target.closest(".list-row");
    if (!btn || !row) return;
    const id = row.dataset.id;

    if (btn.dataset.act === "del"){
      if (confirm("Delete this code?")){
        deleteCode(state, id);
        saveState(state);
        screenDistributorUnused();
      }
    }

    if (btn.dataset.act === "edit"){
      const item = state.codes.find(c => c.id === id);
      if (!item) return;
      const v = prompt("Edit code text:", item.codeText);
      if (v === null) return;
      updateCodeText(state, id, v);
      saveState(state);
      screenDistributorUnused();
    }
  });
}

function screenDistributorPlayer(){
  setAccent("--accent-distributor");

  const next = state.codes.find(c => c.status === "unused");
  const note = state.community.welcomeNote?.trim();
  const hasNote = Boolean(note);

  view.innerHTML = `
    <div class="col">
      ${topbar({
        title: "Code Claim",
        subtitle: state.community.name?.trim() || "My Community",
        onBack: () => nav("#/distributor"),
        rightActions: []
      })}

      ${state.distributor.isPaused ? `
        <div class="card accent pad" style="--accent: var(--accent-distributor);">
          <div style="font-weight:900;font-size:18px;">Distribution is on hold</div>
          <div class="small" style="margin-top:6px;">Please check back in a moment.</div>
        </div>
      ` : `
        <div class="card pad">
          <div class="center col" style="gap:12px;">
            ${state.community.logoDataUrl
              ? `<img src="${state.community.logoDataUrl}" alt="Logo" style="width:82px;height:82px;border-radius:22px;object-fit:cover; border:1px solid rgba(255,255,255,0.12);" />`
              : `<div class="icon-tile" style="width:82px;height:82px;border-radius:24px;"><span class="ico">🌿</span></div>`
            }

            ${hasNote ? `
              <div class="card accent pad" style="--accent: var(--gg-green); width:100%;">
                <div style="font-weight:900;margin-bottom:6px;">Welcome!</div>
                <div class="small">${escapeHtml(note)}</div>
              </div>
            ` : ``}

            <div class="card accent pad" style="--accent: var(--accent-distributor); width:100%;">
              <div style="font-weight:900;">Code Unlocked!</div>
              <div style="height:10px;"></div>
              <div class="tile" style="display:flex;justify-content:center;">
                <div style="font-weight:900; letter-spacing:0.12em;">${next ? escapeHtml(next.codeText) : "NO CODES"}</div>
              </div>

              <div class="row" style="margin-top:12px;">
                <button class="btn" style="flex:1;" id="btnCopy"><span class="ico">⧉</span> Copy</button>
                <button class="btn" style="flex:1;" id="btnShare"><span class="ico">⤴︎</span> Share</button>
              </div>

              <button class="btn green wide" id="btnRedeem" style="margin-top:12px;">
                <span class="ico">🛒</span> Redeem at Web Store
              </button>

              <div class="hr"></div>
              <div class="tile" style="display:flex;align-items:center;justify-content:space-between; gap:10px;">
                <div style="min-width:0;">
                  <div style="font-weight:900;">Want More Rewards?</div>
                  <div class="small">Please check-in to our Campfire</div>
                </div>
                <button class="btn" id="btnCampfire" style="padding:10px 12px;">Open</button>
              </div>

              <div style="height:10px;"></div>
              <button class="btn wide" id="btnFlag"><span class="ico">🚩</span> Report an Issue</button>
            </div>
          </div>
        </div>
      `}
    </div>
  `;

  bindCommon();

  if (state.distributor.isPaused) return;

  view.querySelector("#btnCopy")?.addEventListener("click", async () => {
    if (!next) return toast("No codes available.");
    await navigator.clipboard?.writeText(next.codeText);
    toast("Copied.");
  });

  view.querySelector("#btnShare")?.addEventListener("click", async () => {
    if (!next) return toast("No codes available.");
    const url = `https://store.pokemongo.com/offer-redemption?passcode=${encodeURIComponent(next.codeText)}`;
    const res = await shareText({ title: "Pokemon GO Passcode", text: next.codeText, url });
    toast(res.ok ? "Shared." : "Share canceled.");
  });

  view.querySelector("#btnRedeem")?.addEventListener("click", () => {
    if (!next) return toast("No codes available.");
    const url = `https://store.pokemongo.com/offer-redemption?passcode=${encodeURIComponent(next.codeText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  });

  view.querySelector("#btnCampfire")?.addEventListener("click", () => {
    const url = state.community.campfireUrl?.trim();
    if (!url) return toast("No Campfire URL set.");
    window.open(url, "_blank", "noopener,noreferrer");
  });

  view.querySelector("#btnFlag")?.addEventListener("click", () => {
    alert(
      "PoGO Limit Warning:\n\n" +
      "Pokémon GO may restrict accounts to limited redemptions.\n" +
      "If the Web Store says your code is invalid or you do not qualify, your account may be on cooldown.\n\n" +
      "Please reach out to a Community Ambassador for assistance."
    );
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
  const path = h.replace(/^#/, "");

  if (path === "/hub") return screenHub();
  if (path === "/community") return screenCommunity();
  if (path === "/distributor") return screenDistributor();
  if (path === "/distributor/unused") return screenDistributorUnused();
  if (path === "/distributor/player") return screenDistributorPlayer();
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

function fileToDataURL(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
