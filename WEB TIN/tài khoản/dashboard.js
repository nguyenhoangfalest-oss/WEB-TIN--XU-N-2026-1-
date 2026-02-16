import {
  subscribeAuthProfile,
  updateMyProfile,
  logout,
  makeEmojiAvatarDataUrl
} from "../common/firebase-auth.js";

const $ = (id) => document.getElementById(id);

const btnHome = $("btnHome");
const btnLogout = $("btnLogout");
const btnSaveProfile = $("btnSaveProfile");
const btnResetAvatar = $("btnResetAvatar");

const nameEl = $("name");
const emailEl = $("email");
const avatarEl = $("avatar");
const displayNameEl = $("displayName");
const avatarEmojiEl = $("avatarEmoji");
const msgEl = $("msg");

const coinsEl = $("coins");
const interactionsEl = $("interactions");
const achievementEl = $("achievement");

const notifList = $("notifList");
const notifText = $("notifText");
const btnAddNotif = $("btnAddNotif");
const btnClearNotif = $("btnClearNotif");

let currentSession = null;
let notifications = [];

function setMsg(text, isError = false) {
  if (!msgEl) return;
  msgEl.textContent = text || "";
  msgEl.style.color = isError ? "#ffd0d0" : "";
}

function renderNotifs() {
  if (!notifList) return;
  if (!notifications.length) {
    notifList.innerHTML = `<div class="muted">Chưa có thông báo nào.</div>`;
    return;
  }
  notifList.innerHTML = notifications
    .map((n) => `<div class="notifItem">${n}</div>`)
    .join("");
}

function renderSession(session) {
  if (!session?.user) {
    location.href = "./dangnhap.html";
    return;
  }
  currentSession = session;

  const profile = session.profile || {};
  const displayName = profile.displayName || session.user.displayName || "Người dùng";
  const avatarEmoji = profile.avatarEmoji || "🌸";

  if (nameEl) nameEl.textContent = `${avatarEmoji} ${displayName}`;
  if (emailEl) emailEl.textContent = session.user.email || "Tài khoản khách";
  if (avatarEl) avatarEl.src = makeEmojiAvatarDataUrl(avatarEmoji);
  if (displayNameEl) displayNameEl.value = displayName;
  if (avatarEmojiEl) avatarEmojiEl.value = avatarEmoji;

  if (coinsEl) coinsEl.textContent = String(profile.coins ?? 0);
  if (interactionsEl) interactionsEl.textContent = String(profile.interactions ?? 0);
  if (achievementEl) achievementEl.value = profile.achievement || "Chưa có thành tích.";

  notifications = Array.isArray(profile.notifications) ? profile.notifications : [];
  renderNotifs();
}

btnHome?.addEventListener("click", () => {
  location.href = "../../trangchur.html";
});

btnLogout?.addEventListener("click", async () => {
  await logout();
  location.href = "./dangnhap.html";
});

btnSaveProfile?.addEventListener("click", async () => {
  if (!currentSession?.user) return;
  const displayName = (displayNameEl?.value || "").trim();
  const avatarEmoji = (avatarEmojiEl?.value || "").trim();
  if (!displayName) {
    setMsg("Tên hiển thị không được để trống.", true);
    return;
  }
  setMsg("Đang lưu hồ sơ...");
  try {
    const updated = await updateMyProfile({ displayName, avatarEmoji });
    currentSession = updated;
    renderSession(updated);
    setMsg("Đã lưu hồ sơ.");
  } catch (err) {
    setMsg(err?.message || "Lưu hồ sơ thất bại.", true);
  }
});

btnResetAvatar?.addEventListener("click", async () => {
  if (!currentSession?.user) return;
  if (avatarEmojiEl) avatarEmojiEl.value = "🌸";
  try {
    const updated = await updateMyProfile({ avatarEmoji: "🌸" });
    currentSession = updated;
    renderSession(updated);
    setMsg("Đã đặt lại avatar emoji.");
  } catch (err) {
    setMsg(err?.message || "Không thể đặt lại avatar.", true);
  }
});

btnAddNotif?.addEventListener("click", async () => {
  if (!currentSession?.user) return;
  const text = (notifText?.value || "").trim();
  if (!text) return;
  notifications = [`${new Date().toLocaleString("vi-VN")} — ${text}`, ...notifications].slice(0, 20);
  if (notifText) notifText.value = "";
  renderNotifs();
  await updateMyProfile({ notifications });
});

btnClearNotif?.addEventListener("click", async () => {
  if (!currentSession?.user) return;
  notifications = [];
  renderNotifs();
  await updateMyProfile({ notifications });
});

subscribeAuthProfile((session) => {
  renderSession(session);
});
