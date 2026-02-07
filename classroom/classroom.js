
/* Classroom hub: schedule + timer + sounds + notes (device-local) */

const KEY = {
  schedule: "lifehub.classroom.schedule.v1",
  notes: "lifehub.classroom.notes.v1",
  cast: "lifehub.classroom.cast.v1"
};

function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }

const DEFAULT_SCHEDULE = [
  { id: uid(), time:"08:00", label:"Morning Meeting" },
  { id: uid(), time:"08:30", label:"Reading" },
  { id: uid(), time:"09:15", label:"Centers" },
  { id: uid(), time:"10:00", label:"Recess" },
  { id: uid(), time:"10:25", label:"Math" },
  { id: uid(), time:"11:15", label:"Lunch" },
  { id: uid(), time:"11:55", label:"Writing" },
  { id: uid(), time:"12:35", label:"Specials" },
  { id: uid(), time:"13:20", label:"Science" },
  { id: uid(), time:"14:00", label:"Pack up" },
  { id: uid(), time:"14:20", label:"Dismissal" },
];

let castMode = !!store.get(KEY.cast, false);

let schedule = null;
// schedule is synced across devices
(async ()=>{
  schedule = await syncStore.get(KEY.schedule, null);
  if (!Array.isArray(schedule) || schedule.length === 0) schedule = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
  syncStore.set(KEY.schedule, schedule, { debounceMs: 50 });
  renderSchedule();
})();

const scheduleList = qs("#scheduleList");
const liveClock = qs("#liveClock");
const nowNextText = qs("#nowNextText");

function parseTimeToMin(hhmm){
  if (!hhmm || !hhmm.includes(":")) return null;
  const [h,m] = hhmm.split(":").map(n=>Number(n));
  if (Number.isNaN(h)||Number.isNaN(m)) return null;
  return h*60+m;
}
function nowMinutes(){
  const d = new Date();
  return d.getHours()*60+d.getMinutes();
}
function sortSchedule(){
  schedule.sort((a,b)=> (parseTimeToMin(a.time) ?? 99999) - (parseTimeToMin(b.time) ?? 99999));
}
function saveSchedule(){ syncStore.set(KEY.schedule, schedule, { debounceMs: 200 }); }

function renderSchedule(){
  sortSchedule();
  scheduleList.innerHTML = "";
  const nowMin = nowMinutes();

  // compute active
  let activeIndex = -1;
  for (let i=0;i<schedule.length;i++){
    const start = parseTimeToMin(schedule[i].time);
    const end = (i<schedule.length-1) ? parseTimeToMin(schedule[i+1].time) : 24*60+1;
    if (start !== null && nowMin >= start && nowMin < end){ activeIndex=i; break; }
  }

  schedule.forEach((it, idx)=>{
    const row = document.createElement("div");
    row.className = "item" + (idx===activeIndex ? " active" : "");
    row.style.borderColor = idx===activeIndex ? "#c7d2ff" : "var(--border)";
    row.style.background = idx===activeIndex ? "#eef2ff" : "#f9fafb";

    if (castMode){
      row.innerHTML = `
        <div class="grow">
          <div style="font-weight:800;font-size:1.05rem">${it.time} · ${escapeHtml(it.label)}</div>
        </div>
      `;
    } else {
      row.innerHTML = `
        <div style="min-width:92px"><input type="time" value="${it.time}"></div>
        <div class="grow"><input type="text" value="${escapeHtml(it.label)}"></div>
        <div><button class="ghost" title="Delete">🗑</button></div>
      `;
      row.querySelector("input[type='time']").addEventListener("change",(e)=>{
        it.time = e.target.value; saveSchedule(); renderSchedule();
      });
      row.querySelector("input[type='text']").addEventListener("input",(e)=>{
        it.label = e.target.value; saveSchedule(); updateNowNext();
      });
      row.querySelector("button").addEventListener("click",()=>{
        schedule = schedule.filter(s=>s.id!==it.id); saveSchedule(); renderSchedule();
      });
    }

    scheduleList.appendChild(row);
  });

  updateNowNext();
}

function escapeHtml(s){
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}

function updateNowNext(){
  const d = new Date();
  liveClock.textContent = d.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
  const nowMin = nowMinutes();
  sortSchedule();

  let activeIndex = -1;
  for (let i=0;i<schedule.length;i++){
    const start = parseTimeToMin(schedule[i].time);
    const end = (i<schedule.length-1) ? parseTimeToMin(schedule[i+1].time) : 24*60+1;
    if (start !== null && nowMin >= start && nowMin < end){ activeIndex=i; break; }
  }
  const nowItem = activeIndex>=0 ? schedule[activeIndex] : null;
  const nextItem = activeIndex>=0 ? schedule[activeIndex+1] : schedule[0];

  nowNextText.textContent = `Now: ${nowItem ? nowItem.label : "—"} · Next: ${nextItem ? nextItem.label : "—"}`;
}

qs("#resetDay").addEventListener("click", ()=>{
  schedule = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
  saveSchedule();
  renderSchedule();
});

qs("#addItem").addEventListener("click", ()=>{
  const t = qs("#addTime").value;
  const label = qs("#addLabel").value.trim();
  if (!t || !label) return;
  schedule.push({ id: uid(), time:t, label });
  qs("#addLabel").value = "";
  saveSchedule();
  renderSchedule();
});

function applyCastMode(){
  qs("#castLabel").textContent = castMode ? "ON" : "OFF";
  qs("#schedModePill").textContent = castMode ? "cast" : "teacher";
  qs("#schedAddWrap").style.display = castMode ? "none" : "block";
  document.body.style.background = castMode ? "#f3f4f6" : "var(--bg)";
  renderSchedule();
}
qs("#castBtn").addEventListener("click", ()=>{
  castMode = !castMode;
  store.set(KEY.cast, castMode);
  applyCastMode();
});

/* Timer */
let timer = { interval:null, remaining:0 };

function setTimerDisplay(sec){ qs("#timerDisplay").textContent = fmtTimer(Math.max(0,sec)); }
function initTimerFromInputs(){
  const m = Number(qs("#min").value||0);
  const s = Number(qs("#sec").value||0);
  setTimerDisplay(m*60+s);
}
initTimerFromInputs();
qs("#min").addEventListener("input", initTimerFromInputs);
qs("#sec").addEventListener("input", initTimerFromInputs);

qs("#startBtn").addEventListener("click", ()=>{
  const m = Number(qs("#min").value||0);
  const s = Number(qs("#sec").value||0);
  const total = m*60+s;
  if (!total) return;
  clearInterval(timer.interval);
  timer.remaining = total;
  setTimerDisplay(timer.remaining);
  timer.interval = setInterval(()=>{
    timer.remaining--;
    if (timer.remaining <= 0){
      clearInterval(timer.interval);
      qs("#timerDisplay").textContent = "Time!";
      audio.play("ding");
      return;
    }
    setTimerDisplay(timer.remaining);
  }, 1000);
});
qs("#pauseBtn").addEventListener("click", ()=> clearInterval(timer.interval));
qs("#resetBtn").addEventListener("click", ()=>{
  clearInterval(timer.interval);
  initTimerFromInputs();
});

/* Notes */
const notesEl = qs("#notes");
notesEl.value = "";
(async ()=>{
  const v = await syncStore.get(KEY.notes, "");
  notesEl.value = v || "";
})();
let savedT = null;
notesEl.addEventListener("input", ()=>{
  clearTimeout(savedT);
  qs("#savedLabel").textContent = "saving...";
  savedT = setTimeout(()=>{
    syncStore.set(KEY.notes, notesEl.value);
    qs("#savedLabel").textContent = "saved";
  }, 250);
});
qs("#clearNotes").addEventListener("click", ()=>{
  notesEl.value = "";
  syncStore.set(KEY.notes, "");
  qs("#savedLabel").textContent = "saved";
});

/* Audio (small subset of your original file’s approach) */
class AudioController{
  constructor(){ this.ctx=null; this.master=null; this.ambient=null; this.ambientLfo=null; }
  ensure(){
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(this.ctx.destination);
  }
  setVol01(v){ this.ensure(); this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.015); }
  tone({type="sine", freq=440, dur=0.25, gain=0.35, attack=0.01, release=0.08}){
    this.ensure();
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type=type; osc.frequency.setValueAtTime(freq,t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0+attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur+release);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0+dur+release+0.02);
  }
  noiseBuffer(seconds=1.5){
    this.ensure();
    const sr=this.ctx.sampleRate;
    const len=Math.floor(seconds*sr);
    const buf=this.ctx.createBuffer(1,len,sr);
    const data=buf.getChannelData(0);
    for(let i=0;i<len;i++) data[i]=(Math.random()*2-1)*0.6;
    return buf;
  }
  startAmbient(kind){
    this.ensure();
    this.stopAmbient();
    const t0=this.ctx.currentTime;
    const src=this.ctx.createBufferSource();
    src.buffer=this.noiseBuffer(2.0); src.loop=true;
    const filter=this.ctx.createBiquadFilter();
    const g=this.ctx.createGain();
    if(kind==="white"){ filter.type="highpass"; filter.frequency.setValueAtTime(30,t0); g.gain.setValueAtTime(0.28,t0); }
    if(kind==="rain"){ filter.type="bandpass"; filter.frequency.setValueAtTime(1800,t0); filter.Q.setValueAtTime(0.9,t0); g.gain.setValueAtTime(0.23,t0); }
    if(kind==="waves"){
      filter.type="lowpass"; filter.frequency.setValueAtTime(520,t0); filter.Q.setValueAtTime(0.7,t0); g.gain.setValueAtTime(0.22,t0);
      const lfo=this.ctx.createOscillator(); const lfoGain=this.ctx.createGain();
      lfo.type="sine"; lfo.frequency.setValueAtTime(0.08,t0);
      lfoGain.gain.setValueAtTime(0.12,t0);
      lfo.connect(lfoGain); lfoGain.connect(g.gain);
      lfo.start(); this.ambientLfo=lfo;
    }
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start();
    this.ambient={src,gain:g,filter};
  }
  stopAmbient(){
    if(!this.ctx) return;
    if(this.ambient){ try{this.ambient.src.stop();}catch(e){} this.ambient=null; }
    if(this.ambientLfo){ try{this.ambientLfo.stop();}catch(e){} this.ambientLfo=null; }
  }
  play(kind){
    this.ensure();
    if(this.ctx.state==="suspended") this.ctx.resume();
    const v = Number(qs("#vol").value||70)/100;
    this.setVol01(v);
    if(["waves","rain","white"].includes(kind)){ this.startAmbient(kind); return; }
    if(kind==="beep"){ this.tone({type:"square", freq:880, dur:0.12, gain:0.55, attack:0.005, release:0.06}); return; }
    if(kind==="ding"){ this.tone({type:"sine", freq:1046.5, dur:0.10, gain:0.45, attack:0.005, release:0.12}); this.tone({type:"sine", freq:1568, dur:0.08, gain:0.22, attack:0.005, release:0.10}); return; }
    if(kind==="chime"){
      const base=523.25;
      [0,4,7,12].forEach((st,i)=> setTimeout(()=> this.tone({type:"sine", freq:base*Math.pow(2, st/12), dur:0.16, gain:0.22, attack:0.01, release:0.14}), i*90));
      return;
    }
  }
}
const audio = new AudioController();

qs("#vol").addEventListener("input", ()=> audio.setVol01(Number(qs("#vol").value)/100));
qsa("button[data-snd]").forEach(b=> b.addEventListener("click", ()=> audio.play(b.dataset.snd)));
qs("#stopAmbient").addEventListener("click", ()=> audio.stopAmbient());

window.addEventListener("pointerdown", ()=>{ audio.ensure(); if(audio.ctx?.state==="suspended") audio.ctx.resume(); }, { once:true });

/* Tick */
applyCastMode();
if (schedule) renderSchedule();
setInterval(updateNowNext, 1000);
setInterval(()=>{ if (schedule) renderSchedule(); }, 15000);
