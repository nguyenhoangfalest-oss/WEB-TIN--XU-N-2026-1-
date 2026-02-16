import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDfZPIg6Nif_Mx_Wwyl0byM6vJCd5BLgo8",
  authDomain: "xuanbinhngo-2026.firebaseapp.com",
  projectId: "xuanbinhngo-2026",
  storageBucket: "xuanbinhngo-2026.appspot.com",
  messagingSenderId: "910448630867",
  appId: "1:910448630867:web:2b48e0b859e355aa0efaa6",
  measurementId: "G-FN0BFL9FQQ",

  // ✅ RTDB URL
  databaseURL: "https://xuanbinhngo-2026-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
