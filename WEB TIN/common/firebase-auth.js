import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDfZPIg6Nif_Mx_Wwyl0byM6vJCd5BLgo8",
  authDomain: "xuanbinhngo-2026.firebaseapp.com",
  projectId: "xuanbinhngo-2026",
  storageBucket: "xuanbinhngo-2026.appspot.com",
  messagingSenderId: "910448630867",
  appId: "1:910448630867:web:2b48e0b859e355aa0efaa6",
  measurementId: "G-FN0BFL9FQQ"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

const persistenceReady = setPersistence(auth, browserLocalPersistence).catch(() => {});
const provider = new GoogleAuthProvider();

const DEFAULT_AVATARS = ["🌸", "🧧", "🐉", "🎋", "🎊", "🍀", "⭐", "🌼"];

function pickAvatar() {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
}

function cleanName(input, fallback = "Người dùng") {
  const name = String(input || "").trim();
  return name || fallback;
}

function cleanEmoji(input) {
  const s = String(input || "").trim();
  if (!s) return pickAvatar();
  return Array.from(s)[0];
}

function profileRef(uid) {
  return ref(db, `profiles/${uid}`);
}

export function makeEmojiAvatarDataUrl(emoji) {
  const em = cleanEmoji(emoji);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="100%" height="100%" rx="128" fill="#fff4dd"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-size="140">${em}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function getUserProfile(uid) {
  const snap = await get(profileRef(uid));
  return snap.exists() ? snap.val() : null;
}

export async function ensureUserProfile(user, patch = {}) {
  const existing = await getUserProfile(user.uid);
  const displayName = cleanName(
    patch.displayName || existing?.displayName || user.displayName || user.email?.split("@")[0] || "Người dùng"
  );
  const avatarEmoji = cleanEmoji(patch.avatarEmoji || existing?.avatarEmoji || "🌸");
  const now = Date.now();

  const profile = {
    uid: user.uid,
    email: user.email || "",
    displayName,
    avatarEmoji,
    updatedAt: now,
    createdAt: existing?.createdAt || now
  };

  if (!existing) {
    await set(profileRef(user.uid), profile);
  } else {
    await update(profileRef(user.uid), profile);
  }

  if (user.displayName !== displayName) {
    try { await updateProfile(user, { displayName }); } catch {}
  }

  return profile;
}

export async function updateMyProfile(patch = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Bạn chưa đăng nhập.");
  const profile = await ensureUserProfile(user, patch);
  return { user, profile };
}

export async function registerWithEmail({ email, password, displayName, avatarEmoji }) {
  await persistenceReady;
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: cleanName(displayName, email.split("@")[0]) });
  await ensureUserProfile(cred.user, { displayName, avatarEmoji: cleanEmoji(avatarEmoji) });
  return cred.user;
}

export async function loginWithEmail({ email, password }) {
  await persistenceReady;
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function loginWithGoogle() {
  await persistenceReady;
  const cred = await signInWithPopup(auth, provider);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function loginGuest(displayName = "Khách", avatarEmoji = "🎉") {
  await persistenceReady;
  const cred = await signInAnonymously(auth);
  await ensureUserProfile(cred.user, { displayName, avatarEmoji });
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export function subscribeAuthProfile(handler) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      handler(null);
      return;
    }
    try {
      const profile = await ensureUserProfile(user);
      handler({ user, profile });
    } catch (err) {
      console.error("Profile sync error:", err);
      handler({ user, profile: null });
    }
  });
}
