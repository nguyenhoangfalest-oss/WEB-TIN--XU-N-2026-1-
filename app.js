import {
  loginWithEmail,
  registerWithEmail,
  logout as firebaseLogout,
  subscribeAuthProfile
} from "./common/firebase-auth.js";
/* =========================
   Helpers
========================= */
const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => Array.from(root.querySelectorAll(q));

function pad2(n){ return String(n).padStart(2,"0"); }
function clamp01(x){ return Math.max(0, Math.min(1, x)); }

function formatSolar(d){
  return `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`;
}

/* =========================
   Smooth scroll + ScrollSpy
========================= */
function setActiveLink(hash){
  const links = $$(".navlink");
  links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === hash));
}

function setupSmoothScroll(){
  const links = $$(".navlink");
  links.forEach(a=>{
    const href = a.getAttribute("href");
    if(!href || !href.startsWith("#")) return;

    a.addEventListener("click", (e)=>{
      e.preventDefault();
      const el = $(href);
      if(!el) return;

      el.scrollIntoView({ behavior: "smooth", block: "start" });

      // close mobile drawer if open
      closeMobileDrawer();
      setActiveLink(href);
      history.replaceState(null, "", href);
    });
  });
}

function setupScrollSpy(){
  const sections = ["#home","#feed","#tetnay","#camnang","#games","#ketnoi"]
    .map(id => $(id))
    .filter(Boolean);

  const obs = new IntersectionObserver((entries)=>{
    // choose the most visible entry
    const visible = entries
      .filter(e=>e.isIntersecting)
      .sort((a,b)=>b.intersectionRatio - a.intersectionRatio)[0];
    if(!visible) return;
    setActiveLink(`#${visible.target.id}`);
  }, { root: null, threshold: [0.25, 0.4, 0.55, 0.7] });

  sections.forEach(s => obs.observe(s));
}

/* =========================
   Mobile menu
========================= */
const hamburger = $("#hamburger");
const mobileDrawer = $("#mobileDrawer");

function openMobileDrawer(){
  mobileDrawer.classList.add("open");
  hamburger.setAttribute("aria-expanded", "true");
  mobileDrawer.setAttribute("aria-hidden", "false");
}
function closeMobileDrawer(){
  mobileDrawer.classList.remove("open");
  hamburger.setAttribute("aria-expanded", "false");
  mobileDrawer.setAttribute("aria-hidden", "true");
}

function setupMobileMenu(){
  if(!hamburger) return;
  hamburger.addEventListener("click", ()=>{
    mobileDrawer.classList.contains("open") ? closeMobileDrawer() : openMobileDrawer();
  });
  mobileDrawer.addEventListener("click", (e)=>{
    // click outside menu closes
    if(e.target === mobileDrawer) closeMobileDrawer();
  });
}

/* =========================
   Theme toggle + localStorage
========================= */
const THEME_KEY = "tetverse_theme";
const themeSwitch = $("#themeSwitch");

function applyTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  // checkbox: checked = light
  if(themeSwitch) themeSwitch.checked = (theme === "light");
}

function setupTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  const initial = saved === "light" || saved === "dark"
    ? saved
    : "dark";
  applyTheme(initial);

  if(themeSwitch){
    themeSwitch.addEventListener("change", ()=>{
      applyTheme(themeSwitch.checked ? "light" : "dark");
    });
  }
}

/* =========================
   Reveal on scroll
========================= */
function setupReveal(){
  const els = $$(".reveal");
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add("show");
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.14 });
  els.forEach(el=>obs.observe(el));
}

/* =========================
   Countdown + Lunar
========================= */
/**
 * Set milestones here (easy change)
 * - Tết 2026: set a date/time in local time.
 * - THPT exam 2026: set a date/time.
 */
const milestones = {
  tet: {
    label: "Tết 2026",
    // You can change date easily:
    date: new Date("2026-02-17T00:00:00"),
    start: new Date("2025-01-01T00:00:00"),
    els: { d:"#tetD", h:"#tetH", m:"#tetM", s:"#tetS", bar:"#tetBar", pct:"#tetPct" }
  },
  exam: {
    label: "Thi THPT 2026",
    date: new Date("2026-06-11T07:30:00"),
    start: new Date("2025-06-11T00:00:00"),
    els: { d:"#examD", h:"#examH", m:"#examM", s:"#examS", bar:"#examBar", pct:"#examPct" }
  }
};

function updateTodayDates(){
  const d = new Date();
  const solar = $("#todaySolar");
  const lunar = $("#todayLunar");
  if(solar) solar.textContent = formatSolar(d);

  if(!lunar) return;

  try{
    if(window.solarlunar && typeof window.solarlunar.solar2lunar === "function"){
      const r = window.solarlunar.solar2lunar(d.getFullYear(), d.getMonth()+1, d.getDate());
      lunar.textContent = `${pad2(r.lDay)}/${pad2(r.lMonth)}/${r.lYear}`;
    } else {
      lunar.textContent = "Âm lịch (chưa tải solarlunar)";
    }
  } catch (err){
    lunar.textContent = "Âm lịch (lỗi)";
    console.error("Lunar error:", err);
  }
}

function tickCountdown(cfg){
  const now = new Date();
  let diff = cfg.date.getTime() - now.getTime();
  if(diff < 0) diff = 0;

  let s = Math.floor(diff/1000);
  const days = Math.floor(s/(3600*24)); s %= (3600*24);
  const hrs  = Math.floor(s/3600);      s %= 3600;
  const mins = Math.floor(s/60);
  const secs = s%60;

  const dEl = $(cfg.els.d), hEl = $(cfg.els.h), mEl = $(cfg.els.m), sEl = $(cfg.els.s);
  if(dEl) dEl.textContent = days;
  if(hEl) hEl.textContent = pad2(hrs);
  if(mEl) mEl.textContent = pad2(mins);
  if(sEl) sEl.textContent = pad2(secs);

  // progress % based on [start .. date]
  const total = Math.max(1, cfg.date.getTime() - cfg.start.getTime());
  const done = clamp01((now.getTime() - cfg.start.getTime()) / total);
  const pct = Math.round(done * 100);

  const bar = $(cfg.els.bar);
  const pctEl = $(cfg.els.pct);
  if(bar) bar.style.width = `${pct}%`;
  if(pctEl) pctEl.textContent = `${pct}%`;
}

function setupCountdown(){
  updateTodayDates();
  setInterval(updateTodayDates, 60*1000);

  const motiv = $("#examMotivation");
  const lines = [
    "Bạn đang làm tốt!",
    "Giữ nhịp đều mỗi ngày 👌",
    "Hít thở sâu — làm từng bước.",
    "Sai thì sửa, chậm mà chắc.",
    "Tết vui nhưng vẫn kỷ luật ✨"
  ];
  let i = 0;

  setInterval(()=>{
    tickCountdown(milestones.tet);
    tickCountdown(milestones.exam);

    // rotate motivation
    if(motiv){
      i = (i+1) % lines.length;
      motiv.textContent = lines[i];
    }
  }, 1000);
}

/* =========================
   AUTH (Firebase)
========================= */
const authModal = $("#authModal");
const authTitle = $("#authTitle");
const authEmail = $("#authEmail");
const authPass  = $("#authPass");
const authSubmit= $("#authSubmit");
const authHint  = $("#authHint");
const closeAuth = $("#closeAuth");
const authCancel= $("#authCancel");

const authBtn = $("#authBtn");
const authBtnMobile = $("#authBtnMobile");
const navUser = $("#navUser");
const userPill = $("#userPill");
const logoutBtn = $("#logoutBtn");
const mobileUser = $("#mobileUser");
const userPillMobile = $("#userPillMobile");
const logoutBtnMobile = $("#logoutBtnMobile");

let authMode = "login"; // login | register
let currentUser = null;
let currentProfile = null;

function openAuth(mode="login"){
  authMode = mode;
  if(authTitle) authTitle.textContent = (mode === "login" ? "Đăng nhập" : "Đăng ký");
  $$(".tab2").forEach(b=>b.classList.toggle("active", b.dataset.auth === mode));
  if(authHint) authHint.textContent = "Đăng nhập bằng Firebase.";
  if(authModal){
    authModal.classList.add("show");
    authModal.setAttribute("aria-hidden", "false");
  }
  setTimeout(()=>authEmail?.focus(), 50);
}

function closeAuthModal(){
  authModal?.classList.remove("show");
  authModal?.setAttribute("aria-hidden","true");
}

function setCurrentSession(user, profile){
  currentUser = user;
  currentProfile = profile;
  renderAuthUI();
}

function getDisplayName(){
  if(currentProfile?.displayName) return currentProfile.displayName;
  if(currentUser?.displayName) return currentUser.displayName;
  if(currentUser?.email) return currentUser.email.split("@")[0];
  return "Bạn";
}

function getAvatarEmoji(){
  return currentProfile?.avatarEmoji || "🌸";
}

function renderAuthUI(){
  const logged = !!currentUser;
  const label = logged ? `${getAvatarEmoji()} ${getDisplayName()}` : "—";

  if(authBtn) authBtn.hidden = logged;
  if(navUser) navUser.hidden = !logged;
  if(userPill) userPill.textContent = label;

  if(authBtnMobile) authBtnMobile.hidden = logged;
  if(mobileUser) mobileUser.hidden = !logged;
  if(userPillMobile) userPillMobile.textContent = label;

  const composerHint = $("#composerHint");
  const postText = $("#postText");
  const postBtn = $("#postBtn");
  if(postText) postText.disabled = !logged;
  if(postBtn) postBtn.disabled = !logged;
  if(composerHint){
    composerHint.textContent = logged
      ? "Bạn đã đăng nhập — đăng bài thôi!"
      : "Bạn cần đăng nhập để đăng bài.";
  }
}

function setupAuth(){
  renderAuthUI();

  subscribeAuthProfile((session)=>{
    if(!session){
      setCurrentSession(null, null);
      return;
    }
    setCurrentSession(session.user, session.profile);
  });

  authBtn?.addEventListener("click", ()=>{
    location.href = "./t%C3%A0i%20kho%E1%BA%A3n/dangnhap.html";
  });
  authBtnMobile?.addEventListener("click", ()=>{
    location.href = "./t%C3%A0i%20kho%E1%BA%A3n/dangnhap.html";
  });

  logoutBtn?.addEventListener("click", async ()=>{
    await firebaseLogout();
    closeMobileDrawer();
  });
  logoutBtnMobile?.addEventListener("click", async ()=>{
    await firebaseLogout();
    closeMobileDrawer();
  });

  closeAuth?.addEventListener("click", closeAuthModal);
  authCancel?.addEventListener("click", closeAuthModal);

  authModal?.addEventListener("click", (e)=>{
    if(e.target === authModal) closeAuthModal();
  });

  $$(".tab2").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      openAuth(btn.dataset.auth);
    });
  });

  authSubmit?.addEventListener("click", async ()=>{
    const email = (authEmail?.value || "").trim().toLowerCase();
    const pass  = (authPass?.value || "").trim();
    if(!email || !pass){
      if(authHint) authHint.textContent = "Vui lòng nhập email + password.";
      return;
    }

    try{
      if(authMode === "register"){
        const displayName = email.split("@")[0] || "Người dùng";
        await registerWithEmail({ email, password: pass, displayName, avatarEmoji: "🌸" });
      }else{
        await loginWithEmail({ email, password: pass });
      }
      closeAuthModal();
    }catch(err){
      if(authHint) authHint.textContent = err?.message || "Đăng nhập/đăng ký thất bại.";
    }
  });
}
/* =========================
   FEED: posts + like/comment + lightbox
========================= */
const postsEl = $("#posts");
const lightbox = $("#lightbox");
const lbImg = $("#lbImg");
const lbClose = $("#lbClose");

let posts = [
  {
    id: "p1",
    author: "An",
    time: "1 giờ trước",
    text: "Chúc mọi người một mùa Tết ấm áp! Sĩ tử nhớ giữ nhịp học đều nha 📚✨",
    img: null,
    likes: 12,
    liked: false,
    comments: [
      { by: "B", text: "Đúng rồi, giữ nhịp là thắng!" }
    ]
  },
  {
    id: "p2",
    author: "Bình",
    time: "3 giờ trước",
    text: "Gợi ý playlist nhạc Tết: mở nhẹ lúc dọn nhà, vibe lên liền 🎵",
    img: null,
    likes: 7,
    liked: false,
    comments: []
  },
  {
    id: "p3",
    author: "Chi",
    time: "Hôm qua",
    text: "Ai muốn làm photobooth nhóm? Mình muốn khung đỏ-vàng nhìn ‘lụm tim’ 😆",
    img: null,
    likes: 4,
    liked: false,
    comments: [
      { by: "A", text: "Mình join!" },
      { by: "D", text: "Cho xin room nha!" }
    ]
  }
];

function avatarLetter(name){
  return (name?.trim()?.[0] || "?").toUpperCase();
}

function ensureLogged(actionText="Bạn cần đăng nhập để thực hiện thao tác này."){
  if(currentUser) return true;
  openAuth("login");
  // hint in modal
  if(authHint) authHint.textContent = actionText;
  return false;
}

function openLightbox(src){
  if(!lightbox || !lbImg) return;
  lbImg.src = src;
  lightbox.classList.add("show");
  lightbox.setAttribute("aria-hidden","false");
}
function closeLightbox(){
  lightbox?.classList.remove("show");
  lightbox?.setAttribute("aria-hidden","true");
  if(lbImg) lbImg.src = "";
}

function renderPosts(){
  if(!postsEl) return;

  postsEl.innerHTML = posts.map(p=>{
    const hasImg = !!p.img;
    const commentsCount = p.comments.length;

    return `
      <article class="card post" data-post="${p.id}">
        <div class="avatar" aria-hidden="true">${avatarLetter(p.author)}</div>

        <div>
          <div class="post-head">
            <div>
              <div class="post-name">${p.author}</div>
              <div class="post-meta">${p.time}</div>
            </div>
            <span class="pill">🧧</span>
          </div>

          <div class="post-text">${escapeHtml(p.text)}</div>

          ${hasImg ? `
            <div class="post-img" data-img="${p.img}">
              <img src="${p.img}" alt="Ảnh bài đăng" />
            </div>
          ` : ""}

          <div class="actions">
            <button class="action-btn" data-like type="button">
              ❤️ <span>Like</span> <b data-likecount>${p.likes}</b>
            </button>

            <button class="action-btn" data-togglecmt type="button">
              💬 <span>Comment</span> <b>${commentsCount}</b>
            </button>
          </div>

          <div class="comment-box" data-cbox hidden>
            <div class="row">
              <input data-cinput placeholder="Viết bình luận..." />
              <button class="btn small primary" data-csend type="button">Gửi</button>
            </div>
            <div class="comment-list" data-clist>
              ${p.comments.map(c=>`
                <div class="comment"><b>${escapeHtml(c.by)}:</b> ${escapeHtml(c.text)}</div>
              `).join("")}
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  // Bind events
  postsEl.querySelectorAll("[data-like]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(!ensureLogged("Đăng nhập để Like bài viết.")) return;

      const postId = btn.closest("[data-post]")?.dataset.post;
      const post = posts.find(x=>x.id === postId);
      if(!post) return;

      if(post.liked) return; // only once
      post.liked = true;
      post.likes += 1;
      const countEl = btn.querySelector("[data-likecount]");
      if(countEl) countEl.textContent = String(post.likes);
      btn.disabled = true;
    });
  });

  postsEl.querySelectorAll("[data-togglecmt]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(!ensureLogged("Đăng nhập để bình luận.")) return;

      const root = btn.closest("[data-post]");
      const box = root?.querySelector("[data-cbox]");
      if(box) box.hidden = !box.hidden;
    });
  });

  postsEl.querySelectorAll("[data-csend]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(!ensureLogged("Đăng nhập để bình luận.")) return;

      const root = btn.closest("[data-post]");
      const postId = root?.dataset.post;
      const post = posts.find(x=>x.id === postId);
      if(!post) return;

      const input = root.querySelector("[data-cinput]");
      const text = (input?.value || "").trim();
      if(!text) return;

      const by = (currentUser?.email || "Bạn").split("@")[0].slice(0,10) || "Bạn";
      post.comments.push({ by, text });
      if(input) input.value = "";
      renderPosts();
      // reopen comment box
      const newRoot = postsEl.querySelector(`[data-post="${postId}"]`);
      newRoot?.querySelector("[data-cbox]")?.removeAttribute("hidden");
    });
  });

  postsEl.querySelectorAll(".post-img").forEach(div=>{
    div.addEventListener("click", ()=>{
      const src = div.dataset.img;
      if(src) openLightbox(src);
    });
  });
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function setupLightbox(){
  lbClose?.addEventListener("click", closeLightbox);
  lightbox?.addEventListener("click", (e)=>{
    if(e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape") closeLightbox();
  });
}

/* Post composer */
function setupComposer(){
  const postText = $("#postText");
  const postBtn = $("#postBtn");
  const postImage = $("#postImage");

  postBtn?.addEventListener("click", async ()=>{
    if(!ensureLogged("Đăng nhập để đăng bài.")) return;

    const text = (postText?.value || "").trim();
    if(!text){
      $("#composerHint").textContent = "Bạn chưa nhập nội dung bài đăng.";
      return;
    }

    let imgData = null;
    const file = postImage?.files?.[0] || null;
    if(file){
      imgData = await fileToDataURL(file);
    }

    const author = (currentUser.email.split("@")[0] || "Bạn").slice(0,12);
    posts = [
      {
        id: "p" + Math.random().toString(36).slice(2,8),
        author,
        time: "Vừa xong",
        text,
        img: imgData,
        likes: 0,
        liked: false,
        comments: []
      },
      ...posts
    ];

    if(postText) postText.value = "";
    if(postImage) postImage.value = "";
    $("#composerHint").textContent = "Đã đăng! ✨";
    renderPosts();
  });
}

function fileToDataURL(file){
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = ()=>resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* Online list demo */
function setupOnlineList(){
  const list = $("#onlineList");
  if(!list) return;
  const names = ["An", "Bình", "Chi", "Duy", "Lan", "Minh", "Trang", "Huy"];
  list.innerHTML = names.map((n,i)=>`
    <div class="li"><b>${n}</b> <span style="opacity:.8">•</span> <span>${i%2===0?"Online":"Vừa rời"}</span></div>
  `).join("");
}

/* =========================
   Cẩm nang tabs + wish generator
========================= */
function setupTabs(){
  const tabs = $$(".tab");
  tabs.forEach(t=>{
    t.addEventListener("click", ()=>{
      tabs.forEach(x=>x.classList.remove("active"));
      t.classList.add("active");

      const key = t.dataset.tab;
      const panes = {
        wish: $("#pane-wish"),
        tuvi: $("#pane-tuvi"),
        mau: $("#pane-mau"),
        meo: $("#pane-meo"),
      };

      Object.values(panes).forEach(p=>p?.classList.remove("active"));
      if(key === "wish") panes.wish?.classList.add("active");
      if(key === "tuvi") panes.tuvi?.classList.add("active");
      if(key === "mau") panes.mau?.classList.add("active");
      if(key === "meo") panes.meo?.classList.add("active");
    });
  });
}

function setupWishGenerator(){
  const btn = $("#genWish");
  const out = $("#wishOut");
  btn?.addEventListener("click", ()=>{
    const target = $("#wishTarget")?.value || "banbe";
    const name = ($("#wishName")?.value || "").trim();

    const pool = {
      giadinh: [
        "Chúc {name} năm mới sức khỏe dồi dào, nhà cửa ấm êm, vạn sự hanh thông.",
        "Tết đến, chúc {name} bình an – sum vầy – niềm vui trọn vẹn.",
        "Mong {name} một năm mới an khang thịnh vượng, cười nhiều hơn lo."
      ],
      banbe: [
        "Chúc {name} Tết này vui hết nấc, tiền vào như nước, may mắn ngập tràn!",
        "Năm mới rực rỡ nha {name}! Học/việc đều ‘đỉnh’, tâm trạng luôn ‘chill’.",
        "Chúc {name} mọi kế hoạch đều trúng – mọi deadline đều qua – mọi điều tốt đều tới!"
      ],
      thayco: [
        "Kính chúc {name} năm mới an khang, luôn mạnh khỏe, hạnh phúc và thành công.",
        "Chúc {name} một năm mới bình an, vạn điều như ý, tiếp tục truyền cảm hứng cho học trò.",
        "Tết đến, kính chúc {name} nhiều sức khỏe, niềm vui và mọi điều tốt đẹp."
      ]
    };

    const list = pool[target] || pool.banbe;
    const tpl = list[Math.floor(Math.random()*list.length)];
    const who = name || (target==="thayco" ? "thầy/cô" : target==="giadinh" ? "cả nhà" : "bạn");
    if(out) out.textContent = tpl.replace("{name}", who);
  });
}

/* =========================
   Kết nối: chat + dm modal + photobooth mock
========================= */
const communityChat = $("#communityChat");
const chatInput = $("#chatInput");
const chatSend = $("#chatSend");

function appendChat(el, who, msg){
  if(!el) return;
  const div = document.createElement("div");
  div.className = "chatmsg";
  div.innerHTML = `<b>${escapeHtml(who)}:</b> ${escapeHtml(msg)}`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function setupCommunityChat(){
  const demo = [
    ["Admin","Chào mừng đến TẾTVERSE 2026!"],
    ["Lan","Ai có tip ôn thi Toán không ạ 😭"],
    ["Minh","Đều đặn mỗi ngày 30p là ổn!"],
  ];
  demo.forEach(([w,m])=>appendChat(communityChat, w, m));

  chatSend?.addEventListener("click", ()=>{
    if(!ensureLogged("Đăng nhập để chat.")) return;
    const msg = (chatInput?.value || "").trim();
    if(!msg) return;
    const who = (currentUser.email.split("@")[0] || "Bạn").slice(0,12);
    appendChat(communityChat, who, msg);
    if(chatInput) chatInput.value = "";
  });
}

/* DM modal mock */
const dmModal = $("#dmModal");
const dmTitle = $("#dmTitle");
const closeDm = $("#closeDm");
const dmChat = $("#dmChat");
const dmInput = $("#dmInput");
const dmSend = $("#dmSend");
let dmWith = "—";

function openDm(name){
  if(!ensureLogged("Đăng nhập để chat riêng.")) return;

  dmWith = name;
  if(dmTitle) dmTitle.textContent = `Chat với ${name}`;
  if(dmChat) dmChat.innerHTML = "";
  appendChat(dmChat, name, "Hello! Tết này bạn làm gì nè?");
  appendChat(dmChat, "Bạn", "Mình đang test UI chat 😆");

  dmModal?.classList.add("show");
  dmModal?.setAttribute("aria-hidden","false");
  setTimeout(()=>dmInput?.focus(), 50);
}
function closeDmModal(){
  dmModal?.classList.remove("show");
  dmModal?.setAttribute("aria-hidden","true");
}

function setupDm(){
  closeDm?.addEventListener("click", closeDmModal);
  dmModal?.addEventListener("click", (e)=>{ if(e.target === dmModal) closeDmModal(); });
  dmSend?.addEventListener("click", ()=>{
    if(!ensureLogged("Đăng nhập để chat riêng.")) return;
    const msg = (dmInput?.value || "").trim();
    if(!msg) return;
    appendChat(dmChat, "Bạn", msg);
    if(dmInput) dmInput.value = "";
    // mock reply
    setTimeout(()=>appendChat(dmChat, dmWith, "Okieee 😄"), 350);
  });
}

/* Friends list */
function setupFriends(){
  const el = $("#friends");
  if(!el) return;
  const friends = [
    {name:"Lan", status:"Online"},
    {name:"Minh", status:"Online"},
    {name:"Trang", status:"Vừa rời"},
    {name:"Huy", status:"Online"},
  ];
  el.innerHTML = friends.map(f=>`
    <div class="friend" data-f="${f.name}">
      <div><b>${f.name}</b> <small>• ${f.status}</small></div>
      <span class="pill">DM</span>
    </div>
  `).join("");
  el.querySelectorAll("[data-f]").forEach(item=>{
    item.addEventListener("click", ()=>openDm(item.dataset.f));
  });
}

/* Photobooth mock */
function setupPhotobooth(){
  const colorsWrap = $("#pbColors");
  const frameSel = $("#pbFrame");
  const frameBox = $("#pbFrameBox");
  const photo = $("#pbPhoto");
  const preview = $("#pbPreview");

  const createBtn = $("#pbCreate");
  const joinBtn = $("#pbJoin");
  const roomInput = $("#pbRoom");
  const shotBtn = $("#pbShot");

  function applyPBStyle(){
    const active = colorsWrap?.querySelector(".chip-btn.active")?.dataset.color || "red";
    const frame = frameSel?.value || "Frame 1";

    const border = {
      red: "rgba(255,90,90,.8)",
      gold: "rgba(243,196,78,.85)",
      pink: "rgba(255,123,200,.75)",
      green: "rgba(34,197,94,.75)",
      rainbow: "rgba(168,85,247,.75)"
    }[active] || "rgba(255,255,255,.3)";

    if(frameBox){
      frameBox.style.borderColor = border;
      frameBox.style.background =
        active === "rainbow"
          ? "linear-gradient(135deg, rgba(239,68,68,.12), rgba(245,158,11,.12), rgba(34,197,94,.12), rgba(59,130,246,.12), rgba(168,85,247,.12))"
          : "rgba(255,255,255,.03)";
      frameBox.querySelector(".pb-note").textContent = `${frame} • màu: ${active}`;
    }
  }

  colorsWrap?.querySelectorAll(".chip-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      colorsWrap.querySelectorAll(".chip-btn").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      applyPBStyle();
    });
  });

  frameSel?.addEventListener("change", applyPBStyle);

  createBtn?.addEventListener("click", ()=>{
    if(!ensureLogged("Đăng nhập để tạo phòng photobooth.")) return;
    const rid = "R" + Math.random().toString(36).slice(2,7).toUpperCase();
    if(roomInput) roomInput.value = rid;
    applyPBStyle();
  });

  joinBtn?.addEventListener("click", ()=>{
    if(!ensureLogged("Đăng nhập để join phòng photobooth.")) return;
    const rid = (roomInput?.value || "").trim();
    if(!rid) {
      alert("Nhập Room ID trước nhé!");
      return;
    }
    applyPBStyle();
  });

  shotBtn?.addEventListener("click", ()=>{
    if(!ensureLogged("Đăng nhập để chụp photobooth.")) return;
    if(photo) photo.hidden = false;
    // subtle flash effect
    if(preview){
      preview.animate([{opacity:1},{opacity:.35},{opacity:1}], {duration:260, easing:"ease-out"});
    }
  });

  applyPBStyle();
}

/* =========================
   Auth gating in feed actions is handled in ensureLogged()
========================= */

/* =========================
   Bind Lightbox + DM + Modal Esc
========================= */
function setupGlobalEsc(){
  document.addEventListener("keydown", (e)=>{
    if(e.key !== "Escape") return;
    closeAuthModal();
    closeDmModal();
    closeLightbox();
    closeMobileDrawer();
  });
}

/* =========================
   Fix: clicking nav auth buttons
========================= */
function setupAuthButtons(){
  // mobile auth button uses different id
  // already bound in setupAuth
}

/* =========================
   Init
========================= */
function init(){
  setupTheme();
  setupMobileMenu();
  setupSmoothScroll();
  setupScrollSpy();
  setupReveal();

  setupAuth();
  setupLightbox();
  setupComposer();
  setupOnlineList();
  renderPosts();

  setupTabs();
  setupWishGenerator();

  setupCountdown();
  setupCommunityChat();
  setupFriends();
  setupDm();
  setupPhotobooth();

  setupGlobalEsc();
}

init();
// ================================
// TET FX: petals + glitter (canvas)
// ================================
(function initTetFX(){
  const c = document.getElementById("tetFX");
  if(!c) return;
  const ctx = c.getContext("2d");

  let W=0, H=0, DPR=1;
  const resize = () => {
    DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    W = c.clientWidth = window.innerWidth;
    H = c.clientHeight = window.innerHeight;
    c.width  = Math.floor(W * DPR);
    c.height = Math.floor(H * DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  };
  window.addEventListener("resize", resize, {passive:true});
  resize();

  const rand = (a,b)=> a + Math.random()*(b-a);
  const pick = (arr)=> arr[(Math.random()*arr.length)|0];

  // Petals
  const petals = [];
  const PETAL_COLORS = ["rgba(255,120,160,.92)","rgba(255,210,122,.92)","rgba(255,245,223,.85)"];
  const PETAL_COUNT = Math.min(90, Math.max(40, Math.floor((W*H)/22000)));

  function spawnPetal(initial=false){
    const s = rand(6, 14);
    petals.push({
      x: rand(0, W),
      y: initial ? rand(0, H) : rand(-40, -10),
      r: s,
      vx: rand(-0.4, 0.8),
      vy: rand(0.7, 1.7),
      rot: rand(0, Math.PI*2),
      vr: rand(-0.03, 0.03),
      sway: rand(0.6, 1.8),
      phase: rand(0, Math.PI*2),
      col: pick(PETAL_COLORS),
      a: rand(0.55, 0.95)
    });
  }

  // Glitter
  const glitters = [];
  const GLITTER_COUNT = Math.min(120, Math.max(60, Math.floor((W*H)/18000)));

  function spawnGlitter(initial=false){
    glitters.push({
      x: rand(0, W),
      y: initial ? rand(0, H) : rand(-60, -10),
      s: rand(1, 2.2),
      vy: rand(0.8, 2.0),
      vx: rand(-0.25, 0.25),
      tw: rand(0.02, 0.08),
      t: rand(0, Math.PI*2),
      a: rand(0.25, 0.65)
    });
  }

  for(let i=0;i<PETAL_COUNT;i++) spawnPetal(true);
  for(let i=0;i<GLITTER_COUNT;i++) spawnGlitter(true);

  let last = performance.now();
  function drawPetal(p){
    ctx.save();
    ctx.globalAlpha = p.a;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);

    // shape cánh hoa: ellipse + notch
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r*0.85, p.r*0.55, 0, 0, Math.PI*2);
    ctx.fillStyle = p.col;
    ctx.fill();

    // highlight nhỏ
    ctx.globalAlpha *= 0.35;
    ctx.beginPath();
    ctx.ellipse(-p.r*0.15, -p.r*0.10, p.r*0.35, p.r*0.22, 0, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.fill();

    ctx.restore();
  }

  function drawGlitter(g){
    g.t += g.tw;
    const blink = 0.35 + 0.65 * Math.abs(Math.sin(g.t));
    ctx.globalAlpha = g.a * blink;
    ctx.fillStyle = "rgba(255,218,106,.95)";
    ctx.fillRect(g.x, g.y, g.s, g.s);
  }

  function tick(now){
    const dt = Math.min(34, now-last); // ms
    last = now;

    ctx.clearRect(0,0,W,H);

    // petals
    for(let i=petals.length-1;i>=0;i--){
      const p = petals[i];
      p.phase += 0.01 * dt;
      p.x += (p.vx + Math.sin(p.phase)*0.35*p.sway) * (dt/16);
      p.y += p.vy * (dt/16);
      p.rot += p.vr * (dt/16);

      drawPetal(p);

      if(p.y > H + 60 || p.x < -80 || p.x > W + 80){
        petals.splice(i,1);
        spawnPetal(false);
      }
    }

    // glitter
    for(let i=glitters.length-1;i>=0;i--){
      const g = glitters[i];
      g.x += g.vx * (dt/16);
      g.y += g.vy * (dt/16);
      drawGlitter(g);

      if(g.y > H + 80){
        glitters.splice(i,1);
        spawnGlitter(false);
      }
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();






