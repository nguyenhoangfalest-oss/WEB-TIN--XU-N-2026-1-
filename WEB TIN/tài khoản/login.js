import {
  loginWithEmail,
  loginWithGoogle,
  logout,
  subscribeAuthProfile,
  makeEmojiAvatarDataUrl
} from "../common/firebase-auth.js";

const $ = (id) => document.getElementById(id);

const emailEl = $("email");
const passEl = $("password");
const msgEl = $("msg");

const btnLogin = $("btnLogin");
const btnGoogle = $("btnGoogle");
const btnLogout = $("btnLogout");

const loggedOut = $("loggedOut");
const loggedIn = $("loggedIn");
const avatar = $("avatar");
const nameEl = $("name");
const userEmail = $("userEmail");

function setMsg(text, isError = false) {
  if (!msgEl) return;
  msgEl.textContent = text || "";
  msgEl.classList.toggle("danger", !!isError);
}

function goDashboard() {
  location.href = "./giaodien.html";
}

function renderSession(session) {
  const logged = !!session?.user;
  if (loggedOut) loggedOut.classList.toggle("hidden", logged);
  if (loggedIn) loggedIn.classList.toggle("hidden", !logged);
  if (!logged) return;

  const displayName = session.profile?.displayName || session.user.displayName || "Người dùng";
  const emoji = session.profile?.avatarEmoji || "🌸";
  if (avatar) avatar.src = makeEmojiAvatarDataUrl(emoji);
  if (nameEl) nameEl.textContent = `${emoji} ${displayName}`;
  if (userEmail) userEmail.textContent = session.user.email || "Tài khoản khách";
}

btnLogin?.addEventListener("click", async () => {
  const email = (emailEl?.value || "").trim().toLowerCase();
  const password = (passEl?.value || "").trim();
  if (!email || !password) {
    setMsg("Vui lòng nhập email và mật khẩu.", true);
    return;
  }
  setMsg("Đang đăng nhập...");
  try {
    await loginWithEmail({ email, password });
    goDashboard();
  } catch (err) {
    setMsg(err?.message || "Đăng nhập thất bại.", true);
  }
});

btnGoogle?.addEventListener("click", async () => {
  setMsg("Đang mở đăng nhập Google...");
  try {
    await loginWithGoogle();
    goDashboard();
  } catch (err) {
    setMsg(err?.message || "Đăng nhập Google thất bại.", true);
  }
});

btnLogout?.addEventListener("click", async () => {
  await logout();
});

subscribeAuthProfile((session) => {
  renderSession(session);
});
