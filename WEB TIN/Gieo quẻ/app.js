// RÚT QUẺ TRE TẾT — chủ đề + auto câu hỏi (trừ "Khác") + 70/20/10
const $ = (s) => document.querySelector(s);

const nameInput = $("#nameInput");
const topicSelect = $("#topicSelect");
const qInput = $("#qInput");

const btnShake = $("#btnShake");
const btnDraw  = $("#btnDraw");
const btnCopy  = $("#btnCopy");
const btnAgain = $("#btnAgain");
const btnClear = $("#btnClear");

const toggleSound = $("#toggleSound");
const toggleRain  = $("#toggleRain");

const pickedStick = $("#pickedStick");
const stickMark = $("#stickMark");

const sealText = $("#sealText");
const fTitle = $("#fTitle");
const fDesc  = $("#fDesc");
const fType  = $("#fType");
const fLuck  = $("#fLuck");

const historyEl = $("#history");
const toast = $("#toast");

const canvas = $("#fx");
const ctx = canvas.getContext("2d");

let soundOn = true;
let rainOn = true;

let canDraw = false;
let drawing = false;
let last = null;

const STORAGE_KEY = "tet_bamboo_fortune_history_v3";
let history = [];

/* ===== Questions by topic (random) ===== */
const topicMeta = {
  family:  { label: "Gia đình" },
  friends: { label: "Bạn bè" },
  study:   { label: "Học tập" },
  career:  { label: "Sự nghiệp" },
  love:    { label: "Tình duyên" },
  money:   { label: "Tài lộc" },
  health:  { label: "Sức khỏe" },
  luck:    { label: "Vận may" },
  other:   { label: "Khác" }
};

const topicQuestions = {
  family: [
    "Trong gia đình, mình nên chủ động hàn gắn/quan tâm điều gì để êm ấm hơn?",
    "Tết này mình có nên mở lời với người thân về chuyện mình đang nghĩ không?",
    "Gia đình mình năm nay có dấu hiệu tốt về sự hòa thuận không?",
    "Mình nên làm gì để gia đình vui hơn trong những ngày Tết?"
  ],
  friends: [
    "Mình có nên làm hòa với một người bạn cũ không?",
    "Bạn bè quanh mình có ai thật lòng đang giúp mình không?",
    "Tết này có cuộc gặp nào đáng giá với bạn bè không?",
    "Mình cần giữ khoảng cách với ai để tránh rắc rối?"
  ],
  study: [
    "Mục tiêu học tập của mình năm nay có khả thi không?",
    "Mình nên tập trung môn/kỹ năng nào để bứt tốc?",
    "Giai đoạn sắp tới mình có vượt qua áp lực học hành không?",
    "Mình có nên đổi cách học để hiệu quả hơn không?"
  ],
  career: [
    "Sự nghiệp của mình trong vài tháng tới có cơ hội thăng tiến không?",
    "Mình có nên đổi việc/đổi hướng để hợp hơn không?",
    "Dự án/công việc mình đang theo có ‘đáng’ để tiếp tục không?",
    "Sắp tới mình có gặp quý nhân trong công việc không?"
  ],
  love: [
    "Mình có nên chủ động nhắn người đó không?",
    "Tình cảm của mình với người ấy có tiến triển không?",
    "Mình có nên buông một mối quan hệ mập mờ không?",
    "Tết này mình có cơ hội gặp người phù hợp không?"
  ],
  money: [
    "Tài chính của mình sắp tới có khởi sắc không?",
    "Mình có nên mua món đồ này hay nên tiết kiệm?",
    "Có khoản tiền bất ngờ nào sẽ đến với mình không?",
    "Mình có nên bắt đầu một kế hoạch kiếm thêm thu nhập không?"
  ],
  health: [
    "Sức khỏe của mình thời gian tới có ổn không?",
    "Mình nên thay đổi thói quen nào để khỏe hơn?",
    "Tết này mình cần chú ý điều gì để tránh mệt?",
    "Tinh thần của mình có đang cần nghỉ ngơi không?"
  ],
  luck: [
    "Vận may của mình Tết này có ‘nở’ không?",
    "Mình có nên thử một điều mới để đón lộc không?",
    "Có dấu hiệu hên nào đang tới gần mình không?",
    "Mình nên chọn ngày/giờ nào để làm việc quan trọng?"
  ]
};

function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function setQuestionMode(){
  const topic = topicSelect.value;
  const isOther = topic === "other";
  qInput.readOnly = !isOther;

  if(isOther){
    qInput.value = qInput.value || "";
    qInput.placeholder = "Nhập câu hỏi của bạn (ví dụ: Có nên... / Có khả năng... / Khi nào...)";
  }else{
    // auto fill 1 câu hỏi theo chủ đề (nếu chưa có hoặc đang ở câu tự tạo)
    const q = rand(topicQuestions[topic] || ["Mình nên làm gì để mọi chuyện tốt hơn?"]);
    qInput.value = q;
    qInput.placeholder = "Câu hỏi được tạo tự động theo chủ đề…";
  }
}

topicSelect.addEventListener("change", () => {
  setQuestionMode();
  showToast(`Đã chọn chủ đề: ${topicMeta[topicSelect.value]?.label || "Khác"}`);
});

// init
setQuestionMode();

/* ===== Canvas resize ===== */
function resizeCanvas(){
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* ===== Audio tiny ===== */
let audioCtx = null;
function beep(type="ting"){
  if(!soundOn) return;
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const t = audioCtx.currentTime;

  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(audioCtx.destination);

  if(type==="shake"){
    o.type="triangle";
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(110, t+0.10);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t+0.14);
    o.start(t); o.stop(t+0.16);
  }else{
    o.type="sine";
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(1320, t+0.08);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t+0.16);
    o.start(t); o.stop(t+0.18);
  }
}

/* ===== Toast ===== */
let toastTimer = null;
function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
}

/* ===== Weighted pick: 70/20/10 ===== */
function pickType(){
  const r = Math.random();
  if(r < 0.70) return "good";
  if(r < 0.90) return "neutral";
  return "danger";
}
function typeLabel(type){
  if(type==="good") return { tag:"#quẻ_tốt", luck: 80 + Math.floor(Math.random()*21) };
  if(type==="neutral") return { tag:"#quẻ_trung_tính", luck: 55 + Math.floor(Math.random()*20) };
  return { tag:"#quẻ_nguy_hiểm", luck: 25 + Math.floor(Math.random()*25) };
}

/* ===== Template engine ===== */
function cleanName(){
  const n = (nameInput.value || "").trim();
  return n.length ? n : "Bạn";
}
function cleanQuestion(){
  const q = (qInput.value || "").trim();
  return q.length ? q : "";
}
function currentTopicLabel(){
  return topicMeta[topicSelect.value]?.label || "Khác";
}

const openers = [
  "Ống quẻ rung lên, tre khẽ kêu 'cạch'…",
  "Lì xì bay ngang, que tre tự chọn đúng số…",
  "Đèn lồng chao nhẹ, quẻ hiện ra như có duyên…",
  "Pháo nổ xa xa, vận khí của bạn được ‘kích hoạt’…",
  "Gió Tết thổi qua, ống quẻ thì thầm điều bí mật…"
];
const closersGood = [
  "Chốt lại: cứ làm, lộc sẽ tới đúng lúc.",
  "Tin tui: nay mà tiến là thắng.",
  "Đầu năm thuận, cuối năm càng thuận.",
  "Vũ trụ bật đèn xanh rồi đó!"
];
const closersNeutral = [
  "Chậm mà chắc nha, đừng nóng vội.",
  "Giữ nhịp đều là đẹp, đừng all-in cảm xúc.",
  "Đợi thêm một dấu hiệu nữa rồi hẵng quyết.",
  "Bình tĩnh, mọi thứ đang vào form."
];
const closersDanger = [
  "Cẩn thận lời nói – dễ ‘xui’ vì hiểu lầm.",
  "Né drama, né quyết định vội trong 24–72h.",
  "Giữ an toàn trước, thắng sau cũng được.",
  "Nếu thấy bất ổn, dừng lại là bản lĩnh."
];

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

const fortunePool = {
  good: [
    {
      title: "Quẻ Lộc Gõ Cửa",
      templates: [
        "{name} hỏi về: “{q}” ({topic}). Quẻ nói: cửa lộc đang mở — chỉ cần {name} chủ động một bước, phần còn lại tự khớp.",
        "Về “{q}” ({topic}), {name} có một ‘đường tắt’: làm đúng việc quan trọng nhất trước, kết quả sẽ vượt mong đợi."
      ],
      advice: ["Chọn 1 hành động nhỏ làm ngay trong 30 phút.","Đừng ôm hết — nhờ người hỗ trợ sẽ nhanh hơn."]
    },
    {
      title: "Quẻ Quý Nhân Xuất Hiện",
      templates: [
        "{name} đừng lo “{q}” ({topic}) nữa. Có người sẽ đưa cho {name} thông tin/giúp đỡ đúng lúc.",
        "Với “{q}” ({topic}), {name} gặp đúng người đúng thời điểm. Nhưng nhớ: mở lời trước thì duyên mới chạy."
      ],
      advice: ["Nhắn 1 tin rõ ràng, lịch sự, đúng trọng tâm.","Giữ lời hứa nhỏ để giữ vận lớn."]
    },
    {
      title: "Quẻ Bước Tới Là Trúng",
      templates: [
        "Câu hỏi “{q}” ({topic}) của {name}: quẻ trả lời ‘YES’ nhưng phải làm tới nơi tới chốn.",
        "Với “{q}” ({topic}), cơ hội đã có sẵn. {name} chỉ thiếu một cú chốt."
      ],
      advice: ["Đặt deadline cụ thể (hôm nay/mai).","Bỏ 1 thứ gây phân tâm trong 2 giờ."]
    }
  ],
  neutral: [
    {
      title: "Quẻ Chờ Gió Đổi Chiều",
      templates: [
        "{name} hỏi “{q}” ({topic}). Quẻ nói: chưa phải lúc bung hết bài. Chờ thêm một tín hiệu rồi hãy quyết.",
        "Về “{q}” ({topic}), {name} đang ở khúc giữa: tiến cũng được, lui cũng ổn — quan trọng là đừng vội."
      ],
      advice: ["Thu thập thêm 1–2 thông tin trước khi chốt.","Tách việc thành 2 phương án dự phòng."]
    },
    {
      title: "Quẻ Ổn Nhưng Đừng Chủ Quan",
      templates: [
        "“{q}” ({topic}) của {name}: kết quả ổn, nhưng phải giữ nhịp đều. Đừng ‘hưng’ 1 ngày rồi nghỉ 3 ngày.",
        "{name} đang đi đúng hướng với “{q}” ({topic}), chỉ cần giảm bốc đồng là đẹp."
      ],
      advice: ["Làm đều mỗi ngày 20–30 phút.","Kiểm tra lại 1 chi tiết hay quên."]
    }
  ],
  danger: [
    {
      title: "Quẻ Va Nhầm Sóng",
      templates: [
        "{name} hỏi “{q}” ({topic}). Quẻ cảnh báo: dễ gặp hiểu lầm hoặc người ‘nói một đằng làm một nẻo’.",
        "Về “{q}” ({topic}), {name} đang đứng gần vùng ‘drama’. Né một bước là tránh được nhiều chuyện."
      ],
      advice: ["Kiểm tra lại nguồn tin/giấy tờ/điều kiện.","Không tranh cãi lúc nóng — để 1 đêm."]
    },
    {
      title: "Quẻ Hao Tâm",
      templates: [
        "“{q}” ({topic}) của {name}: nếu cố quá sẽ hao năng lượng. Dừng đúng lúc là thắng.",
        "{name} hỏi “{q}” ({topic}) — quẻ nhắc: đừng đánh đổi sức khỏe/lòng tự trọng để lấy kết quả."
      ],
      advice: ["Đặt ranh giới rõ ràng (ai/việc gì cũng vậy).","Nếu áp lực, xin thêm thời gian."]
    }
  ]
};

function generateFortune(type){
  const name = cleanName();
  const q = cleanQuestion();
  const topic = currentTopicLabel();

  const pool = fortunePool[type];
  const item = pool[Math.floor(Math.random()*pool.length)];
  const opener = pick(openers);

  const closer =
    type==="good" ? pick(closersGood) :
    type==="neutral" ? pick(closersNeutral) :
    pick(closersDanger);

  const template = pick(item.templates);
  const main = template
    .replaceAll("{name}", name)
    .replaceAll("{q}", q)
    .replaceAll("{topic}", topic);

  const punch =
    type==="good"
      ? `✨ Dấu hiệu hên: ${name} sẽ gặp một “cơ hội nhỏ” liên quan đến ${topic.toLowerCase()} trong 3–7 ngày tới.`
      : type==="neutral"
      ? `🧩 Dấu hiệu: thiếu đúng 1 mảnh thông tin để rõ ràng hơn (đặc biệt ở ${topic.toLowerCase()}).`
      : `⚠️ Dấu hiệu: nếu thấy bất an/không chắc (về ${topic.toLowerCase()}), ưu tiên an toàn & kiểm tra lại.`;

  const adv = item.advice.slice(0, 2).map(x=>`• ${x}`).join("\n");

  return {
    title: item.title,
    desc:
`${opener}

${main}

${punch}

📌 Gợi ý nhanh:
${adv}

🧨 Kết: ${closer}`,
  };
}

/* ===== FX ===== */
let particles = [];
function burst(strength=1, mood="good"){
  const n = Math.floor(90 * strength);
  const cx = window.innerWidth/2;
  const cy = 160;
  for(let i=0;i<n;i++){
    particles.push({
      x: cx + (Math.random()*120-60),
      y: cy + (Math.random()*60-30),
      vx: (Math.random()*6-3) * (0.9+strength),
      vy: (Math.random()*-7-2) * (0.9+strength),
      g: 0.18 + Math.random()*0.08,
      r: 2 + Math.random()*3,
      life: 1,
      rot: Math.random()*Math.PI,
      spin: Math.random()*0.2-0.1,
      mood
    });
  }
}
function stepFx(){
  ctx.clearRect(0,0,window.innerWidth, window.innerHeight);
  const w = window.innerWidth, h = window.innerHeight;
  particles = particles.filter(p => p.life > 0.02);

  for(const p of particles){
    p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.spin; p.life *= 0.985;

    const colorsGood = ["rgba(65,224,160,0.95)","rgba(255,211,106,0.95)","rgba(255,255,255,0.9)"];
    const colorsNeutral = ["rgba(255,211,106,0.95)","rgba(255,255,255,0.9)","rgba(65,224,160,0.75)"];
    const colorsDanger = ["rgba(255,42,85,0.95)","rgba(255,211,106,0.85)","rgba(255,255,255,0.85)"];
    const palette = p.mood==="good" ? colorsGood : p.mood==="neutral" ? colorsNeutral : colorsDanger;
    const c = palette[(Math.random()*palette.length)|0];

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = c;
    ctx.fillRect(-p.r, -p.r/2, p.r*2, p.r);
    ctx.restore();

    if(p.y > h+60 || p.x < -60 || p.x > w+60) p.life *= 0.9;
  }
  requestAnimationFrame(stepFx);
}
stepFx();

/* ===== Lì xì rơi ===== */
let rainTimer = null;
function startRain(){
  stopRain();
  if(!rainOn) return;

  rainTimer = setInterval(() => {
    const el = document.createElement("div");
    el.className = "redPacket";
    const x = Math.random() * (window.innerWidth - 36);
    const drift = (Math.random()*2-1) * 40;
    const dur = 4 + Math.random()*3.5;
    const rot = (Math.random()*2-1) * 18;

    el.style.left = `${x}px`;
    el.style.transform = `rotate(${rot}deg)`;
    document.body.appendChild(el);

    const start = performance.now();
    const y0 = -80, y1 = window.innerHeight + 80;

    function anim(now){
      const t = Math.min(1, (now - start) / (dur*1000));
      const ease = t<0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2;
      const y = y0 + (y1 - y0) * ease;
      const dx = drift * Math.sin(t*Math.PI);
      el.style.top = `${y}px`;
      el.style.left = `${x + dx}px`;
      el.style.opacity = `${1 - t*0.55}`;
      if(t < 1) requestAnimationFrame(anim);
      else el.remove();
    }
    requestAnimationFrame(anim);
  }, 420);
}
function stopRain(){
  if(rainTimer){ clearInterval(rainTimer); rainTimer = null; }
}
startRain();

/* ===== History ===== */
function loadHistory(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    history = raw ? JSON.parse(raw) : [];
  }catch{ history = []; }
  renderHistory();
}
function saveHistory(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 30)));
}
function esc(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[m]));
}
function renderHistory(){
  historyEl.innerHTML = "";
  if(history.length===0){
    const li=document.createElement("li");
    li.innerHTML = `<div class="d">Chưa có quẻ nào. Lắc ống quẻ phát lấy hên 🎋</div>`;
    historyEl.appendChild(li);
    return;
  }
  for(const it of history){
    const li=document.createElement("li");
    const cls =
      it.type==="good" ? "tagGood" :
      it.type==="neutral" ? "tagNeutral" : "tagDanger";
    li.innerHTML = `
      <div class="t">${esc(it.title)}</div>
      <div class="d">${esc(it.short)}</div>
      <div class="m">
        <span class="badge ${cls}">${esc(it.tag)}</span>
        <span class="badge luck">🍀 Lộc: ${it.luck}</span>
        <span style="opacity:.75">• ${esc(it.time)}</span>
      </div>
    `;
    historyEl.appendChild(li);
  }
}
loadHistory();

/* ===== Validate rules =====
- Bắt buộc nhập tên
- Nếu topic != other: câu hỏi tự tạo => không bắt user nhập
- Nếu topic == other: bắt user nhập câu hỏi
*/
function ensureInputsForShake(){
  const name = (nameInput.value||"").trim();
  if(!name){
    showToast("Bạn chưa nhập tên nè 😄");
    nameInput.focus();
    return false;
  }
  // với chủ đề có sẵn -> tự set câu hỏi khi shake
  if(topicSelect.value !== "other"){
    setQuestionMode(); // refresh 1 câu mới mỗi lần lắc
  }else{
    const q = (qInput.value||"").trim();
    if(!q){
      showToast("Mục 'Khác' cần bạn nhập câu hỏi nha 🧧");
      qInput.focus();
      return false;
    }
  }
  return true;
}

function ensureInputsForDraw(){
  const name = (nameInput.value||"").trim();
  const q = (qInput.value||"").trim();
  if(!name){
    showToast("Bạn chưa nhập tên nè 😄");
    nameInput.focus();
    return false;
  }
  if(!q){
    showToast("Chưa có câu hỏi để quẻ trả lời. Hãy Lắc Ống Quẻ trước nhé!");
    return false;
  }
  return true;
}

/* ===== FIX: shake only body ===== */
function shakeBamboo(){
  const body = document.querySelector("#bambooBody");
  if(!body) return;
  body.classList.remove("shakingBody");
  void body.offsetWidth;
  body.classList.add("shakingBody");
  body.addEventListener("animationend", () => body.classList.remove("shakingBody"), { once:true });
}

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
function summarize(text, max=120){
  const s = String(text).replace(/\s+/g," ").trim();
  return s.length > max ? s.slice(0, max-1) + "…" : s;
}

/* ===== Actions ===== */
async function doShake(){
  if(drawing) return;
  if(!ensureInputsForShake()) return;

  drawing = true;
  canDraw = false;
  btnDraw.disabled = true;
  btnShake.disabled = true;

  pickedStick.style.opacity = 0;
  pickedStick.setAttribute("aria-hidden","true");

  const topicLabel = currentTopicLabel();
  $("#stageNote").innerHTML = `Ống quẻ đang rung… Chủ đề <b>${topicLabel}</b> đang được “hỏi”...`;

  shakeBamboo(); beep("shake");
  await sleep(380);
  shakeBamboo(); beep("shake");
  await sleep(380);
  shakeBamboo(); beep("shake");

  canDraw = true;
  btnDraw.disabled = false;
  btnShake.disabled = false;
  drawing = false;

  $("#stageNote").innerHTML = "Ok! Giờ nhấn <b>Rút Que</b> để nhận quẻ ✨";
  showToast("🎋 Đã lắc ống quẻ! Rút 1 que thôi~");
}

async function doDraw(){
  if(drawing) return;
  if(!ensureInputsForDraw()) return;
  if(!canDraw){
    showToast("Bạn cần Lắc Ống Quẻ trước nha 😄");
    return;
  }

  drawing = true;
  btnDraw.disabled = true;
  btnShake.disabled = true;
  btnAgain.disabled = true;
  btnCopy.disabled = true;

  const type = pickType();
  const label = typeLabel(type);

  const code = String(Math.floor(1 + Math.random()*99)).padStart(2,"0");
  stickMark.textContent = `Q-${code}`;

  pickedStick.style.opacity = 1;
  pickedStick.setAttribute("aria-hidden","false");
  pickedStick.animate(
    [
      { transform:"translateX(-50%) translateY(60px) rotate(0deg)", opacity:0 },
      { transform:"translateX(-50%) translateY(30px) rotate(-2deg)", opacity:1 },
      { transform:"translateX(-50%) translateY(-10px) rotate(2deg)", opacity:1 },
      { transform:"translateX(-50%) translateY(10px) rotate(0deg)", opacity:1 }
    ],
    { duration: 720, easing:"cubic-bezier(.2,.9,.2,1)" }
  );

  beep("ting");
  $("#stageNote").innerHTML = "Que tre đã được rút… quẻ đang hiện chữ… 🧧";

  sealText.textContent = "Đang giải…";
  fTitle.textContent = "Đợi xíu…";
  fDesc.textContent = "Vũ trụ đang ‘đọc câu hỏi’ và chấm điểm độ hên…";
  fType.textContent = "#dang_giai";
  fLuck.textContent = "🍀 Lộc: …";

  await sleep(520);
  beep("ting");

  const fortune = generateFortune(type);

  last = {
    type,
    code,
    tag: label.tag,
    luck: label.luck,
    title: `${fortune.title} (Q-${code})`,
    desc: fortune.desc
  };

  sealText.textContent =
    type==="good" ? "Quẻ TỐT" :
    type==="neutral" ? "Quẻ TRUNG TÍNH" : "Quẻ NGUY HIỂM";

  fTitle.textContent = last.title;
  fDesc.textContent = last.desc;
  fType.textContent = last.tag;
  fLuck.textContent = `🍀 Lộc: ${last.luck}`;

  burst(1.1, type);
  showToast(type==="good" ? "🧧 Quẻ tốt! Hên tới~" : type==="neutral" ? "🏮 Quẻ trung tính! Giữ nhịp nha~" : "⚠️ Quẻ nguy hiểm! Cẩn thận chút~");

  btnAgain.disabled = false;
  btnCopy.disabled = false;
  btnShake.disabled = false;
  drawing = false;

  const short = summarize(last.desc, 120);
  const time = new Date().toLocaleString("vi-VN", { hour:"2-digit", minute:"2-digit", day:"2-digit", month:"2-digit" });
  history.unshift({ ...last, short, time });
  history = history.slice(0, 20);
  saveHistory();
  renderHistory();

  canDraw = false;
}

/* ===== Copy ===== */
async function copyResult(){
  if(!last) return;
  const text =
`🎋 Rút Quẻ Tre Tết (Q-${last.code})
Người gieo: ${cleanName()}
Chủ đề: ${currentTopicLabel()}
Câu hỏi: ${cleanQuestion()}

${last.title}
${last.desc}

${last.tag} • 🍀 Lộc: ${last.luck}`;
  try{
    await navigator.clipboard.writeText(text);
    showToast("📋 Đã copy quẻ!");
    beep("ting");
  }catch{
    showToast("Không copy được — hãy bật quyền clipboard nhé.");
  }
}

/* ===== Buttons ===== */
btnShake.addEventListener("click", doShake);
btnDraw.addEventListener("click", doDraw);
btnCopy.addEventListener("click", copyResult);

btnAgain.addEventListener("click", () => {
  pickedStick.style.opacity = 0;
  pickedStick.setAttribute("aria-hidden","true");

  $("#stageNote").innerHTML = "Gieo lại thì… lắc ống quẻ trước nha 🎋";
  canDraw = false;
  btnDraw.disabled = true;
  btnAgain.disabled = true;
  btnCopy.disabled = true;

  sealText.textContent = "Chưa rút";
  fTitle.textContent = "Chưa có quẻ…";
  fDesc.textContent = "Nhấn Lắc Ống Quẻ để bắt đầu lại ✨";
  fType.textContent = "#tet";
  fLuck.textContent = "🍀 Lộc: —";

  // refresh câu hỏi theo chủ đề (nếu không phải other)
  if(topicSelect.value !== "other") setQuestionMode();

  burst(0.55, "neutral");
  showToast("🔁 Reset xong! Lắc lại thôi~");
});

btnClear.addEventListener("click", () => {
  history = [];
  saveHistory();
  renderHistory();
  showToast("🧹 Đã xoá lịch sử!");
});

/* ===== Toggles ===== */
toggleSound.addEventListener("click", () => {
  soundOn = !soundOn;
  toggleSound.setAttribute("aria-pressed", String(soundOn));
  toggleSound.textContent = soundOn ? "🔊 Âm thanh: ON" : "🔇 Âm thanh: OFF";
  showToast(soundOn ? "Bật âm thanh!" : "Tắt âm thanh!");
  if(soundOn) beep("ting");
});

toggleRain.addEventListener("click", () => {
  rainOn = !rainOn;
  toggleRain.setAttribute("aria-pressed", String(rainOn));
  toggleRain.textContent = rainOn ? "🧧 Lì xì rơi: ON" : "🧧 Lì xì rơi: OFF";
  showToast(rainOn ? "Bật lì xì rơi!" : "Tắt lì xì rơi!");
  if(rainOn) startRain(); else stopRain();
});

/* ===== Desktop mouse shake to auto SHAKE ===== */
let lastX = null;
let shakeScore = 0;
let shakeCooldown = 0;

window.addEventListener("mousemove", (e) => {
  if(shakeCooldown > 0) return;
  if(lastX === null){ lastX = e.clientX; return; }
  const dx = Math.abs(e.clientX - lastX);
  lastX = e.clientX;

  if(dx > 40){
    shakeScore += dx;
    if(shakeScore > 360){
      shakeScore = 0;
      shakeCooldown = 50;
      doShake();
    }
  }else{
    shakeScore *= 0.96;
  }
});
setInterval(() => { if(shakeCooldown>0) shakeCooldown--; }, 50);

/* ===== Mobile devicemotion to auto SHAKE ===== */
window.addEventListener("devicemotion", (e) => {
  const a = e.accelerationIncludingGravity;
  if(!a) return;
  if(shakeCooldown>0) return;
  const mag = Math.abs(a.x||0)+Math.abs(a.y||0)+Math.abs(a.z||0);
  if(mag > 35){
    shakeCooldown = 60;
    doShake();
  }
});

document.addEventListener("visibilitychange", () => {
  if(document.hidden) stopRain();
  else if(rainOn) startRain();
});
