// app.js — Photobooth (C1: Base64 in Realtime Database, no Storage)
import { auth, db } from "./firebasephoto.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* =========================
   Helpers
========================= */
const $ = (q) => document.querySelector(q);
const $$ = (q) => [...document.querySelectorAll(q)];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

function slugRoom() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "TET-";
  for (let i = 0; i < 4; i++) s += chars[(Math.random() * chars.length) | 0];
  return s;
}

function toast(el, text, good = true) {
  if (!el) return;
  el.style.display = "block";
  el.textContent = text;
  el.style.color = good ? "" : "#b91c1c";
}

async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

/* =========================
   Auth sync UI
========================= */
const btnLogout = $("#btnLogout");
const userAvt = $("#userAvt");
const userName = $("#userName");

let CURRENT_USER = null;
let PROFILE = { name: "Khách", avatar: "🧧" };

async function loadProfile(uid) {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
}

onAuthStateChanged(auth, async (u) => {
  CURRENT_USER = u;

  if (!u) {
    if (userAvt) userAvt.textContent = "👤";
    if (userName) userName.textContent = "Chưa đăng nhập";
    if (btnLogout) btnLogout.style.display = "none";
    // vẫn cho xem gate nhưng sẽ báo khi create/join
    return;
  }

  if (btnLogout) btnLogout.style.display = "inline-flex";

  let p = null;
  try { p = await loadProfile(u.uid); } catch { /* ignore */ }

  PROFILE = {
    name: p?.name || u.displayName || "Người dùng",
    avatar: p?.avatar || "🧧"
  };

  if (userAvt) userAvt.textContent = PROFILE.avatar;
  if (userName) userName.textContent = PROFILE.name;

  // lastSeen (không bắt buộc)
  try {
    await update(ref(db, `users/${u.uid}`), { lastSeen: Date.now() });
  } catch { /* ignore */ }
});

btnLogout?.addEventListener("click", async () => {
  await signOut(auth);
  location.reload();
});

/* =========================
   Gate: create / join
========================= */
const gate = $("#gate");
const roomSec = $("#room");

const btnCreate = $("#btnCreate");
const btnJoin = $("#btnJoin");
const roomInput = $("#roomInput");
const createdHint = $("#createdHint");
const joinHint = $("#joinHint");

const roomCodeEl = $("#roomCode");
const btnCopyRoom = $("#btnCopyRoom");
const btnLeave = $("#btnLeave");

let ROOM_ID = null;

btnCreate?.addEventListener("click", async () => {
  if (!CURRENT_USER) {
    toast(createdHint, "Bạn chưa đăng nhập. Hãy đăng nhập từ web chính rồi quay lại.", false);
    return;
  }
  const code = slugRoom();
  await createRoom(code);
  await enterRoom(code);
  toast(createdHint, `Đã tạo phòng ${code}. Share mã này cho bạn bè nhé!`);
});

btnJoin?.addEventListener("click", async () => {
  const code = (roomInput.value || "").trim().toUpperCase();
  if (!code) {
    toast(joinHint, "Nhập mã phòng trước đã nha.", false);
    return;
  }
  if (!CURRENT_USER) {
    toast(joinHint, "Bạn chưa đăng nhập. Hãy đăng nhập từ web chính rồi quay lại.", false);
    return;
  }

  const ok = await roomExists(code);
  if (!ok) {
    toast(joinHint, "Không thấy phòng này. Kiểm tra mã phòng nha.", false);
    return;
  }
  await enterRoom(code);
});

async function roomExists(code) {
  const snap = await get(ref(db, `photoboothRooms/${code}/meta`));
  return snap.exists();
}

async function createRoom(code) {
  await set(ref(db, `photoboothRooms/${code}/meta`), {
    createdAt: Date.now(),
    createdBy: CURRENT_USER.uid,
    layout: "3x4",
    frame: "gold",
    caption: "",
    updatedAt: serverTimestamp()
  });
}

async function enterRoom(code) {
  ROOM_ID = code;

  if (gate) gate.style.display = "none";
  if (roomSec) roomSec.style.display = "block";
  if (roomCodeEl) roomCodeEl.textContent = code;

  // join member
  await set(ref(db, `photoboothRooms/${code}/members/${CURRENT_USER.uid}`), {
    name: PROFILE.name,
    avatar: PROFILE.avatar,
    joinedAt: Date.now(),
    lastSeen: Date.now()
  });

  bindRoom(code);
  bindMembers(code);
}

btnCopyRoom?.addEventListener("click", async () => {
  if (!ROOM_ID) return;
  const ok = await copyText(ROOM_ID);
  alert(ok ? `Đã copy mã phòng: ${ROOM_ID}` : `Mã phòng: ${ROOM_ID}`);
});

btnLeave?.addEventListener("click", async () => {
  await leaveRoom();
});

async function leaveRoom() {
  if (!ROOM_ID || !CURRENT_USER) return;

  try {
    await remove(ref(db, `photoboothRooms/${ROOM_ID}/members/${CURRENT_USER.uid}`));
  } catch { /* ignore */ }

  // reset local state
  unbindRoom();
  ROOM_ID = null;

  if (roomSec) roomSec.style.display = "none";
  if (gate) gate.style.display = "block";
}

window.addEventListener("beforeunload", async () => {
  if (ROOM_ID && CURRENT_USER) {
    try {
      await update(ref(db, `photoboothRooms/${ROOM_ID}/members/${CURRENT_USER.uid}`), { lastSeen: Date.now() });
    } catch { /* ignore */ }
  }
});

/* =========================
   Board / Slots (Base64)
========================= */
const board = $("#board");
const layoutSelect = $("#layoutSelect");
const frameSelect = $("#frameSelect");
const captionInput = $("#captionInput");

const btnPickSlot = $("#btnPickSlot");
const btnUpload = $("#btnUpload");
const btnClearMine = $("#btnClearMine");
const fileInput = $("#fileInput");

let LAYOUT = "3x4";
let FRAME = "gold";
let CAPTION = "";
let SLOTS = {}; // slotId -> { uid,name,avatar,dataUrl }
let MY_SLOT = null;

const LAYOUT_MAP = {
  "3x4": { cols: 3, rows: 4 },
  "4x4": { cols: 4, rows: 4 },
  "2x3": { cols: 2, rows: 3 }
};

function buildBoard() {
  const { cols, rows } = LAYOUT_MAP[LAYOUT] || LAYOUT_MAP["3x4"];
  board.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

  const total = cols * rows;
  board.innerHTML = "";

  for (let i = 1; i <= total; i++) {
    const slotId = `s${String(i).padStart(2, "0")}`;
    const el = document.createElement("div");
    el.className = "slot";
    el.dataset.slot = slotId;

    el.addEventListener("click", () => selectSlot(slotId));
    board.appendChild(el);
  }

  renderSlotsToBoard();
}

function selectSlot(slotId) {
  if (!CURRENT_USER) {
    alert("Bạn chưa đăng nhập.");
    return;
  }

  const cur = SLOTS?.[slotId];
  if (cur?.uid && cur.uid !== CURRENT_USER.uid) {
    alert("Ô này đã có người khác rồi. Chọn ô khác nha!");
    return;
  }
  MY_SLOT = slotId;
  highlightSelected();
}

function highlightSelected() {
  $$(".slot").forEach((s) => s.classList.toggle("selected", s.dataset.slot === MY_SLOT));
}

function frameBorderStyle() {
  if (FRAME === "gold") return "rgba(255,218,106,.85)";
  if (FRAME === "red") return "rgba(200,29,43,.65)";
  return "rgba(255,255,255,.65)";
}

function renderSlotsToBoard() {
  const borderCol = frameBorderStyle();

  $$(".slot").forEach((el, idx) => {
    el.style.borderColor = borderCol;
    const slotId = el.dataset.slot;
    const data = SLOTS?.[slotId];

    el.innerHTML = "";
    el.classList.toggle("selected", slotId === MY_SLOT);

    if (!data || !data.dataUrl) {
      const ph = document.createElement("div");
      ph.className = "ph";
      ph.innerHTML = `<div>Ô #${idx + 1}<br><span style="font-size:12px; font-weight:800;">Bấm để chọn</span></div>`;
      el.appendChild(ph);
      return;
    }

    const img = document.createElement("img");
    img.src = data.dataUrl;
    img.alt = "photo slot";
    el.appendChild(img);

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = `${data.avatar || "🧧"} ${data.name || "Bạn"}`;
    el.appendChild(badge);
  });

  highlightSelected();
}

btnPickSlot?.addEventListener("click", () => {
  if (!CURRENT_USER) {
    alert("Bạn chưa đăng nhập.");
    return;
  }
  const ids = $$(".slot").map((s) => s.dataset.slot);
  const empty = ids.find((id) => !SLOTS?.[id]?.uid);
  if (!empty) {
    alert("Hết ô trống rồi. Đổi layout lớn hơn nha!");
    return;
  }
  MY_SLOT = empty;
  highlightSelected();
});

btnUpload?.addEventListener("click", () => {
  if (!CURRENT_USER) {
    alert("Bạn chưa đăng nhập.");
    return;
  }
  if (!MY_SLOT) {
    alert("Bạn chưa chọn ô. Bấm 'Chọn ô' hoặc bấm trực tiếp vào ô trống.");
    return;
  }
  fileInput.click();
});

fileInput?.addEventListener("change", async () => {
  const f = fileInput.files?.[0];
  if (!f) return;
  if (!ROOM_ID || !MY_SLOT || !CURRENT_USER) return;

  // ✅ Convert to square JPEG dataURL (base64), resized to keep DB light
  const dataUrl = await fileToSquareDataURL(f, 640, 0.82);

  await set(ref(db, `photoboothRooms/${ROOM_ID}/slots/${MY_SLOT}`), {
    uid: CURRENT_USER.uid,
    name: PROFILE.name,
    avatar: PROFILE.avatar,
    dataUrl,
    updatedAt: Date.now()
  });

  fileInput.value = "";
});

btnClearMine?.addEventListener("click", async () => {
  if (!ROOM_ID || !MY_SLOT || !CURRENT_USER) return;

  const cur = SLOTS?.[MY_SLOT];
  if (cur?.uid && cur.uid !== CURRENT_USER.uid) {
    alert("Ô này không phải của bạn.");
    return;
  }
  await remove(ref(db, `photoboothRooms/${ROOM_ID}/slots/${MY_SLOT}`));
});

/* =========================
   Room bind (realtime)
========================= */
function bindRoom(code) {
  // meta realtime
  onValue(ref(db, `photoboothRooms/${code}/meta`), (snap) => {
    const meta = snap.val() || {};
    LAYOUT = meta.layout || "3x4";
    FRAME = meta.frame || "gold";
    CAPTION = meta.caption || "";

    if (layoutSelect) layoutSelect.value = LAYOUT;
    if (frameSelect) frameSelect.value = FRAME;
    if (captionInput) captionInput.value = CAPTION;

    buildBoard();
  });

  // slots realtime
  onValue(ref(db, `photoboothRooms/${code}/slots`), (snap) => {
    SLOTS = snap.val() || {};
    renderSlotsToBoard();

    // auto select if you already have a slot
    if (CURRENT_USER && !MY_SLOT) {
      const mine = Object.entries(SLOTS).find(([sid, v]) => v?.uid === CURRENT_USER.uid);
      if (mine) MY_SLOT = mine[0];
    }
    highlightSelected();
  });
}

function unbindRoom() {
  SLOTS = {};
  MY_SLOT = null;
}

/* =========================
   Members list
========================= */
function bindMembers(code) {
  const membersEl = $("#members");
  if (!membersEl) return;

  onValue(ref(db, `photoboothRooms/${code}/members`), (snap) => {
    const m = snap.val() || {};
    const arr = Object.entries(m).map(([uid, v]) => ({ uid, ...v }));
    arr.sort((a, b) => (b.joinedAt || 0) - (a.joinedAt || 0));

    membersEl.innerHTML = "";
    arr.forEach((x) => {
      const el = document.createElement("div");
      el.className = "member";
      el.innerHTML = `
        <div class="avt">${x.avatar || "🧧"}</div>
        <div>
          <div class="nm">
            ${escapeHtml(x.name || "Bạn")}
            ${CURRENT_USER && x.uid === CURRENT_USER.uid ? ' <span style="color:var(--muted); font-weight:900;">(bạn)</span>' : ""}
          </div>
          <div class="st">tham gia: ${new Date(x.joinedAt || Date.now()).toLocaleString()}</div>
        </div>
      `;
      membersEl.appendChild(el);
    });
  });
}

/* =========================
   Update meta controls
========================= */
layoutSelect?.addEventListener("change", async () => {
  if (!ROOM_ID) return;
  await update(ref(db, `photoboothRooms/${ROOM_ID}/meta`), {
    layout: layoutSelect.value,
    updatedAt: serverTimestamp()
  });
});

frameSelect?.addEventListener("change", async () => {
  if (!ROOM_ID) return;
  await update(ref(db, `photoboothRooms/${ROOM_ID}/meta`), {
    frame: frameSelect.value,
    updatedAt: serverTimestamp()
  });
});

let capT = null;
captionInput?.addEventListener("input", () => {
  clearTimeout(capT);
  capT = setTimeout(async () => {
    if (!ROOM_ID) return;
    await update(ref(db, `photoboothRooms/${ROOM_ID}/meta`), {
      caption: captionInput.value.trim(),
      updatedAt: serverTimestamp()
    });
  }, 350);
});

/* =========================
   Export collage to PNG
========================= */
const btnExport = $("#btnExport");
const exportCanvas = $("#exportCanvas");

btnExport?.addEventListener("click", async () => {
  if (!ROOM_ID) return;

  const { cols, rows } = LAYOUT_MAP[LAYOUT] || LAYOUT_MAP["3x4"];
  const cell = 520;   // px
  const pad = 18;
  const gap = 14;
  const headerH = 140;

  const W = pad * 2 + cols * cell + (cols - 1) * gap;
  const H = headerH + pad + rows * cell + (rows - 1) * gap + 70;

  exportCanvas.width = W;
  exportCanvas.height = H;
  const ctx = exportCanvas.getContext("2d");

  // bg
  ctx.fillStyle = "#3b0a0f";
  ctx.fillRect(0, 0, W, H);

  // top ribbon
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#c81d2b");
  grad.addColorStop(0.5, "#ffda6a");
  grad.addColorStop(1, "#9b111e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 10);

  // header text
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "900 38px ui-sans-serif,system-ui";
  ctx.fillText("TẾT PHOTOBOOTH", pad, 72);

  ctx.fillStyle = "rgba(255,255,255,.78)";
  ctx.font = "700 18px ui-sans-serif,system-ui";
  ctx.fillText(`Phòng: ${ROOM_ID}`, pad, 104);

  const cap = (CAPTION || "").trim();
  if (cap) {
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.font = "800 20px ui-sans-serif,system-ui";
    ctx.fillText(cap, pad, 134);
  }

  const borderCol =
    FRAME === "gold" ? "rgba(255,218,106,.9)" :
    FRAME === "red"  ? "rgba(200,29,43,.85)" :
                       "rgba(255,255,255,.85)";

  const startY = headerH;

  // slot ids in order
  const slotIds = [];
  for (let i = 1; i <= cols * rows; i++) slotIds.push(`s${String(i).padStart(2, "0")}`);

  for (let idx = 0; idx < slotIds.length; idx++) {
    const sid = slotIds[idx];
    const r = Math.floor(idx / cols);
    const c = idx % cols;

    const x = pad + c * (cell + gap);
    const y = startY + pad + r * (cell + gap);

    // frame
    roundRect(ctx, x, y, cell, cell, 26);
    ctx.fillStyle = "rgba(255,255,255,.06)";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = borderCol;
    ctx.stroke();

    const data = SLOTS?.[sid];
    if (data?.dataUrl) {
      const img = await loadImage(data.dataUrl);
      const crop = centerCrop(img.width, img.height);

      ctx.save();
      roundRect(ctx, x + 10, y + 10, cell - 20, cell - 20, 22);
      ctx.clip();
      ctx.drawImage(
        img,
        crop.sx, crop.sy, crop.sw, crop.sh,
        x + 10, y + 10, cell - 20, cell - 20
      );
      ctx.restore();

      // badge
      ctx.fillStyle = "rgba(0,0,0,.55)";
      roundRect(ctx, x + 14, y + 14, Math.min(cell - 28, 280), 36, 18);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.font = "900 16px ui-sans-serif,system-ui";
      ctx.fillText(`${data.avatar || "🧧"} ${data.name || ""}`, x + 26, y + 38);
    } else {
      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.font = "900 18px ui-sans-serif,system-ui";
      ctx.fillText("Trống", x + cell / 2 - 26, y + cell / 2 + 6);
    }
  }

  // footer
  ctx.fillStyle = "rgba(255,255,255,.55)";
  ctx.font = "800 14px ui-sans-serif,system-ui";
  ctx.fillText("Made with TetVerse • Chúc mừng năm mới 🧧", pad, H - 26);

  // download
  const a = document.createElement("a");
  a.href = exportCanvas.toDataURL("image/png");
  a.download = `tet-photobooth_${ROOM_ID}.png`;
  a.click();
});

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url; // base64 dataURL ok
  });
}

/* =========================
   Theme + Music FAB
========================= */
const fabTheme = $("#fabTheme");
const fabMusic = $("#fabMusic");
let MUSIC_ON = false;

fabTheme?.addEventListener("click", () => {
  const html = document.documentElement;
  const cur = html.getAttribute("data-theme") || "light";
  const next = cur === "light" ? "dark" : "light";
  html.setAttribute("data-theme", next);
  fabTheme.textContent = next === "dark" ? "☀️" : "🌙";
});

// YouTube iframe API command via postMessage
function ytCmd(func) {
  const frame = document.getElementById("ytPlayer");
  frame?.contentWindow?.postMessage(JSON.stringify({
    event: "command",
    func,
    args: []
  }), "*");
}

fabMusic?.addEventListener("click", () => {
  MUSIC_ON = !MUSIC_ON;
  if (MUSIC_ON) {
    ytCmd("playVideo");
    fabMusic.textContent = "🔇";
  } else {
    ytCmd("pauseVideo");
    fabMusic.textContent = "🎵";
  }
});

/* =========================
   Tết Canvas FX (petals + glitter)
========================= */
(function initTetFX() {
  const c = document.getElementById("tetFX");
  if (!c) return;
  const ctx = c.getContext("2d");

  let W = 0, H = 0, DPR = 1;

  const resize = () => {
    DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    W = c.clientWidth = window.innerWidth;
    H = c.clientHeight = window.innerHeight;
    c.width = Math.floor(W * DPR);
    c.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };

  window.addEventListener("resize", resize, { passive: true });
  resize();

  const petals = [], glits = [];
  const PET = Math.min(90, Math.max(45, Math.floor((W * H) / 23000)));
  const GLI = Math.min(130, Math.max(70, Math.floor((W * H) / 18000)));
  const PC = ["rgba(255,120,160,.9)", "rgba(255,210,122,.9)", "rgba(255,245,223,.82)"];

  function spPet(init = false) {
    const s = rand(6, 14);
    petals.push({
      x: rand(0, W),
      y: init ? rand(0, H) : rand(-60, -10),
      r: s,
      vx: rand(-0.4, 0.9),
      vy: rand(0.7, 1.7),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.03, 0.03),
      ph: rand(0, Math.PI * 2),
      sw: rand(0.6, 1.8),
      col: pick(PC),
      a: rand(0.55, 0.95)
    });
  }

  function spG(init = false) {
    glits.push({
      x: rand(0, W),
      y: init ? rand(0, H) : rand(-80, -10),
      s: rand(1, 2.3),
      vy: rand(0.8, 2.0),
      vx: rand(-0.25, 0.25),
      t: rand(0, Math.PI * 2),
      tw: rand(0.02, 0.08),
      a: rand(0.22, 0.60)
    });
  }

  for (let i = 0; i < PET; i++) spPet(true);
  for (let i = 0; i < GLI; i++) spG(true);

  function drawPet(p) {
    ctx.save();
    ctx.globalAlpha = p.a;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);

    ctx.beginPath();
    ctx.ellipse(0, 0, p.r * 0.85, p.r * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.col;
    ctx.fill();

    ctx.globalAlpha *= 0.35;
    ctx.beginPath();
    ctx.ellipse(-p.r * 0.15, -p.r * 0.1, p.r * 0.35, p.r * 0.22, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.fill();

    ctx.restore();
  }

  function drawG(g) {
    g.t += g.tw;
    const blink = 0.35 + 0.65 * Math.abs(Math.sin(g.t));
    ctx.globalAlpha = g.a * blink;
    ctx.fillStyle = "rgba(255,218,106,.95)";
    ctx.fillRect(g.x, g.y, g.s, g.s);
  }

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(34, now - last);
    last = now;

    ctx.clearRect(0, 0, W, H);

    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.ph += 0.01 * dt;
      p.x += (p.vx + Math.sin(p.ph) * 0.35 * p.sw) * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.rot += p.vr * (dt / 16);

      drawPet(p);

      if (p.y > H + 80 || p.x < -120 || p.x > W + 120) {
        petals.splice(i, 1);
        spPet(false);
      }
    }

    for (let i = glits.length - 1; i >= 0; i--) {
      const g = glits[i];
      g.x += g.vx * (dt / 16);
      g.y += g.vy * (dt / 16);

      drawG(g);

      if (g.y > H + 100) {
        glits.splice(i, 1);
        spG(false);
      }
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

/* =========================
   Base64 image utilities (C1)
========================= */
async function fileToSquareDataURL(file, outSize = 640, quality = 0.82) {
  const img = await fileToImage(file);
  const crop = centerCrop(img.width, img.height);

  const c = document.createElement("canvas");
  c.width = outSize;
  c.height = outSize;
  const ctx = c.getContext("2d");

  // nền trắng nhẹ (đỡ bệt màu khi nén JPG)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outSize, outSize);

  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, outSize, outSize);

  // JPEG dataURL nhỏ hơn PNG nhiều
  return c.toDataURL("image/jpeg", quality);
}

function fileToImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
    img.src = url;
  });
}

function centerCrop(w, h) {
  const s = Math.min(w, h);
  return { sx: (w - s) / 2, sy: (h - s) / 2, sw: s, sh: s };
}


