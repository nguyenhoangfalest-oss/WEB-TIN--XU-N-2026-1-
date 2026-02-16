import {
  registerWithEmail,
  loginGuest,
  logout,
  subscribeAuthProfile,
  makeEmojiAvatarDataUrl
} from "../common/firebase-auth.js";

const $ = (id) => document.getElementById(id);

const emailEl = $("email");
const passEl = $("password");
const displayNameEl = $("displayName");
const msgEl = $("msg");

const btnRegister = $("btnRegister");
const btnGuest = $("btnGuest");
const btnLogout = $("btnLogout");

const loggedOut = $("loggedOut");
const loggedIn = $("loggedIn");
const avatar = $("avatar");
const nameEl = $("name");
const userEmail = $("userEmail");

const AVATARS = ["🌸", "🧧", "🎊", "🐉", "⭐", "🍀"];

function pickAvatar() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

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

btnRegister?.addEventListener("click", async () => {
  const email = (emailEl?.value || "").trim().toLowerCase();
  const password = (passEl?.value || "").trim();
  const displayName = (displayNameEl?.value || "").trim();
  if (!email || !password || !displayName) {
    setMsg("Vui lòng nhập đủ email, mật khẩu và tên hiển thị.", true);
    return;
  }
  if (password.length < 6) {
    setMsg("Mật khẩu cần tối thiểu 6 ký tự.", true);
    return;
  }

  setMsg("Đang tạo tài khoản...");
  try {
    await registerWithEmail({
      email,
      password,
      displayName,
      avatarEmoji: pickAvatar()
    });
    goDashboard();
  } catch (err) {
    setMsg(err?.message || "Đăng ký thất bại.", true);
  }
});

btnGuest?.addEventListener("click", async () => {
  const displayName = (displayNameEl?.value || "").trim();
  if (!displayName) {
    setMsg("Chế độ khách yêu cầu nhập Tên hiển thị.", true);
    return;
  }
  setMsg("Đang vào chế độ khách...");
  try {
    await loginGuest(displayName, "🎉");
    goDashboard();
  } catch (err) {
    setMsg(err?.message || "Không thể vào chế độ khách.", true);
  }
});

btnLogout?.addEventListener("click", async () => {
  await logout();
});

subscribeAuthProfile((session) => {
  renderSession(session);
});
