
/* Home hub: routines, chores, grocery, meal plan, notes, timer. Device-local. */

const KEY = {
  routine: "lifehub.home.routines.v1",
  routineDone: "lifehub.home.routines.done.v1",
  chores: "lifehub.home.chores.v1",
  groceries: "lifehub.home.groceries.v1",
  meals: "lifehub.home.meals.v1",
  notes: "lifehub.home.notes.v1",
};

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function todayKey(){
  const d = new Date();
  // YYYY-MM-DD local
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}

function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }
function esc(s){ return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }

/* Routines */
const routineDefaults = {
  morning: ["Water","Coffee/tea","Meds","Pack bag","Quick tidy (2 min)"],
  evening: ["Dishes","Lay out clothes","Set alarms","Plan tomorrow (1 thing)"]
};
let routines = store.get(KEY.routine, routineDefaults);
if (!routines.morning) routines.morning = routineDefaults.morning;
if (!routines.evening) routines.evening = routineDefaults.evening;
store.set(KEY.routine, routines);

let routineMode = "morning";
const routineLabel = qs("#routineLabel");
const routineList = qs("#routineList");
const routineAdd = qs("#routineAdd");

function getRoutineDone(){
  const all = store.get(KEY.routineDone, {});
  const k = todayKey();
  if (!all[k]) all[k] = { morning:{}, evening:{} };
  return { all, k, done: all[k] };
}
function renderRoutine(){
  routineLabel.textContent = routineMode;
  routineList.innerHTML = "";
  const { all, k, done } = getRoutineDone();
  const list = routines[routineMode] || [];
  list.forEach((txt, idx)=>{
    const id = `${routineMode}.${idx}`;
    const checked = !!done[routineMode][id];
    const row = document.createElement("div");
    row.className = "item" + (checked ? " done" : "");
    row.innerHTML = `
      <input type="checkbox" ${checked?"checked":""} style="margin-top:3px" />
      <div class="grow">
        <div style="font-weight:700">${esc(txt)}</div>
      </div>
      <button class="ghost" title="Remove">🗑</button>
    `;
    row.querySelector("input").addEventListener("change",(e)=>{
      done[routineMode][id] = e.target.checked;
      all[k] = done;
      store.set(KEY.routineDone, all);
      renderRoutine();
    });
    row.querySelector("button").addEventListener("click",()=>{
      routines[routineMode].splice(idx,1);
      store.set(KEY.routine, routines);
      // also clear done state
      delete done[routineMode][id];
      all[k] = done;
      store.set(KEY.routineDone, all);
      renderRoutine();
    });
    routineList.appendChild(row);
  });
}
qsa("button[data-routine]").forEach(b=> b.addEventListener("click", ()=>{
  routineMode = b.dataset.routine;
  renderRoutine();
}));
qs("#routineAddBtn").addEventListener("click", ()=>{
  const v = routineAdd.value.trim();
  if (!v) return;
  routines[routineMode].push(v);
  store.set(KEY.routine, routines);
  routineAdd.value = "";
  renderRoutine();
});
qs("#routineReset").addEventListener("click", ()=>{
  const { all, k, done } = getRoutineDone();
  done.morning = {}; done.evening = {};
  all[k] = done;
  store.set(KEY.routineDone, all);
  renderRoutine();
});

/* Chores */
let chores = store.get(KEY.chores, []);
if (!Array.isArray(chores)) chores = [];
const choreList = qs("#choreList");
function renderChores(){
  choreList.innerHTML = "";
  chores.forEach((c, idx)=>{
    const row = document.createElement("div");
    row.className = "item" + (c.done ? " done" : "");
    row.innerHTML = `
      <input type="checkbox" ${c.done?"checked":""} style="margin-top:3px" />
      <div class="grow">
        <div style="font-weight:700">${esc(c.text)}</div>
        ${c.due ? `<div class="sub" style="margin:4px 0 0"><span class="badge">${esc(c.due)}</span></div>` : ""}
      </div>
      <button class="ghost" title="Remove">🗑</button>
    `;
    row.querySelector("input").addEventListener("change",(e)=>{
      c.done = e.target.checked;
      store.set(KEY.chores, chores);
      renderChores();
    });
    row.querySelector("button").addEventListener("click", ()=>{
      chores.splice(idx,1);
      store.set(KEY.chores, chores);
      renderChores();
    });
    choreList.appendChild(row);
  });
}
qs("#choreAddBtn").addEventListener("click", ()=>{
  const text = qs("#choreText").value.trim();
  const due = qs("#choreDue").value;
  if (!text) return;
  chores.unshift({ id: uid(), text, due, done:false });
  qs("#choreText").value = "";
  qs("#choreDue").value = "";
  store.set(KEY.chores, chores);
  renderChores();
});
qs("#choreClearDone").addEventListener("click", ()=>{
  chores = chores.filter(c=>!c.done);
  store.set(KEY.chores, chores);
  renderChores();
});

/* Groceries */
let groceries = store.get(KEY.groceries, []);
if (!Array.isArray(groceries)) groceries = [];
const grocList = qs("#grocList");
function renderGroceries(){
  grocList.innerHTML = "";
  groceries.forEach((g, idx)=>{
    const row = document.createElement("div");
    row.className = "item" + (g.checked ? " done" : "");
    row.innerHTML = `
      <input type="checkbox" ${g.checked?"checked":""} style="margin-top:3px" />
      <div class="grow"><div style="font-weight:700">${esc(g.text)}</div></div>
      <button class="ghost" title="Remove">🗑</button>
    `;
    row.querySelector("input").addEventListener("change",(e)=>{
      g.checked = e.target.checked;
      store.set(KEY.groceries, groceries);
      renderGroceries();
    });
    row.querySelector("button").addEventListener("click", ()=>{
      groceries.splice(idx,1);
      store.set(KEY.groceries, groceries);
      renderGroceries();
    });
    grocList.appendChild(row);
  });
}
qs("#grocAddBtn").addEventListener("click", ()=>{
  const text = qs("#grocText").value.trim();
  if (!text) return;
  groceries.unshift({ id: uid(), text, checked:false });
  qs("#grocText").value = "";
  store.set(KEY.groceries, groceries);
  renderGroceries();
});
qs("#grocClearChecked").addEventListener("click", ()=>{
  groceries = groceries.filter(g=>!g.checked);
  store.set(KEY.groceries, groceries);
  renderGroceries();
});
qs("#grocClearAll").addEventListener("click", ()=>{
  groceries = [];
  store.set(KEY.groceries, groceries);
  renderGroceries();
});

/* Meals */
let meals = store.get(KEY.meals, {});
if (typeof meals !== "object" || meals === null) meals = {};
const mealList = qs("#mealList");
function renderMeals(){
  mealList.innerHTML = "";
  DAYS.forEach(day=>{
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div style="min-width:54px;font-weight:800">${day}</div>
      <div class="grow"><input type="text" value="${esc(meals[day] || "")}" placeholder="Meal idea..." /></div>
    `;
    row.querySelector("input").addEventListener("input",(e)=>{
      meals[day] = e.target.value;
      store.set(KEY.meals, meals);
    });
    mealList.appendChild(row);
  });
}
qs("#mealClear").addEventListener("click", ()=>{
  meals = {};
  store.set(KEY.meals, meals);
  renderMeals();
});

/* Notes */
let notes = store.get(KEY.notes, []);
if (!Array.isArray(notes)) notes = [];
const noteList = qs("#noteList");
function renderNotes(){
  noteList.innerHTML = "";
  notes.forEach((n, idx)=>{
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div class="grow">
        ${n.title ? `<div style="font-weight:800">${esc(n.title)}</div>` : `<div style="font-weight:800">Note</div>`}
        <div class="sub" style="white-space:pre-wrap;margin-top:6px">${esc(n.body)}</div>
        <div class="sub" style="margin-top:6px">Saved: ${esc(n.when)}</div>
      </div>
      <button class="ghost" title="Delete">🗑</button>
    `;
    row.querySelector("button").addEventListener("click", ()=>{
      notes.splice(idx,1);
      store.set(KEY.notes, notes);
      renderNotes();
    });
    noteList.appendChild(row);
  });
}
qs("#noteAddBtn").addEventListener("click", ()=>{
  const title = qs("#noteTitle").value.trim();
  const body = qs("#noteBody").value.trim();
  if (!body) return;
  const when = new Date().toLocaleString([], {month:"short", day:"numeric", hour:"numeric", minute:"2-digit"});
  notes.unshift({ id: uid(), title, body, when });
  store.set(KEY.notes, notes);
  qs("#noteTitle").value = "";
  qs("#noteBody").value = "";
  renderNotes();
});
qs("#noteClearDraft").addEventListener("click", ()=>{
  qs("#noteTitle").value = "";
  qs("#noteBody").value = "";
});

/* Timer (no audio yet; we can add later) */
let t = { interval:null, remaining:0 };
function tInit(){
  const m = Number(qs("#tMin").value||0);
  const s = Number(qs("#tSec").value||0);
  qs("#tDisp").textContent = fmtTimer(m*60+s);
}
tInit();
qs("#tMin").addEventListener("input", tInit);
qs("#tSec").addEventListener("input", tInit);

qs("#tStart").addEventListener("click", ()=>{
  const m = Number(qs("#tMin").value||0);
  const s = Number(qs("#tSec").value||0);
  const total = m*60+s;
  if (!total) return;
  clearInterval(t.interval);
  t.remaining = total;
  qs("#tDisp").textContent = fmtTimer(t.remaining);
  t.interval = setInterval(()=>{
    t.remaining--;
    if (t.remaining <= 0){
      clearInterval(t.interval);
      qs("#tDisp").textContent = "Time!";
      // lightweight beep
      try{
        const AC = window.AudioContext || window.webkitAudioContext;
        const ctx = new AC();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine"; o.frequency.value = 880;
        g.gain.value = 0.2;
        o.connect(g); g.connect(ctx.destination);
        o.start();
        setTimeout(()=>{ o.stop(); ctx.close(); }, 220);
      }catch(e){}
      return;
    }
    qs("#tDisp").textContent = fmtTimer(t.remaining);
  }, 1000);
});
qs("#tPause").addEventListener("click", ()=> clearInterval(t.interval));
qs("#tReset").addEventListener("click", ()=>{
  clearInterval(t.interval);
  tInit();
});

/* boot */
renderRoutine();
renderChores();
renderGroceries();
renderMeals();
renderNotes();
