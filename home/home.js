/* Home hub: routines, chores, grocery, meal plan, notes, timer. Synced across devices via Netlify Blobs + local fallback. */

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
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}

function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }
function esc(s){ return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }

/* State (loaded async) */
let routines, routineDoneAll, chores, groceries, meals, notes;
let routineMode = "morning";

const routineDefaults = {
  morning: ["Water","Coffee/tea","Meds","Pack bag","Quick tidy (2 min)"],
  evening: ["Dishes","Lay out clothes","Set alarms","Plan tomorrow (1 thing)"]
};

const routineLabel = qs("#routineLabel");
const routineList = qs("#routineList");
const routineAdd = qs("#routineAdd");
const choreList = qs("#choreList");
const grocList = qs("#grocList");
const mealList = qs("#mealList");
const noteList = qs("#noteList");

function ensureRoutineShape(){
  if (typeof routines !== "object" || routines === null) routines = JSON.parse(JSON.stringify(routineDefaults));
  if (!Array.isArray(routines.morning)) routines.morning = [...routineDefaults.morning];
  if (!Array.isArray(routines.evening)) routines.evening = [...routineDefaults.evening];

  if (typeof routineDoneAll !== "object" || routineDoneAll === null) routineDoneAll = {};
  const k = todayKey();
  if (!routineDoneAll[k]) routineDoneAll[k] = { morning:{}, evening:{} };
}

function getRoutineDoneForToday(){
  ensureRoutineShape();
  const k = todayKey();
  return { k, done: routineDoneAll[k] };
}

/* Routines */
function renderRoutine(){
  routineLabel.textContent = routineMode;
  routineList.innerHTML = "";
  const { k, done } = getRoutineDoneForToday();
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
      routineDoneAll[k] = done;
      syncStore.set(KEY.routineDone, routineDoneAll);
      renderRoutine();
    });
    row.querySelector("button").addEventListener("click",()=>{
      routines[routineMode].splice(idx,1);
      syncStore.set(KEY.routine, routines);
      delete done[routineMode][id];
      routineDoneAll[k] = done;
      syncStore.set(KEY.routineDone, routineDoneAll);
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
  syncStore.set(KEY.routine, routines);
  routineAdd.value = "";
  renderRoutine();
});

qs("#routineReset").addEventListener("click", ()=>{
  const { k, done } = getRoutineDoneForToday();
  done.morning = {}; done.evening = {};
  routineDoneAll[k] = done;
  syncStore.set(KEY.routineDone, routineDoneAll);
  renderRoutine();
});

/* Chores */
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
      syncStore.set(KEY.chores, chores);
      renderChores();
    });
    row.querySelector("button").addEventListener("click", ()=>{
      chores.splice(idx,1);
      syncStore.set(KEY.chores, chores);
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
  syncStore.set(KEY.chores, chores);
  renderChores();
});

qs("#choreClearDone").addEventListener("click", ()=>{
  chores = chores.filter(c=>!c.done);
  syncStore.set(KEY.chores, chores);
  renderChores();
});

/* Groceries */
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
      syncStore.set(KEY.groceries, groceries);
      renderGroceries();
    });
    row.querySelector("button").addEventListener("click", ()=>{
      groceries.splice(idx,1);
      syncStore.set(KEY.groceries, groceries);
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
  syncStore.set(KEY.groceries, groceries);
  renderGroceries();
});

qs("#grocClearChecked").addEventListener("click", ()=>{
  groceries = groceries.filter(g=>!g.checked);
  syncStore.set(KEY.groceries, groceries);
  renderGroceries();
});

qs("#grocClearAll").addEventListener("click", ()=>{
  groceries = [];
  syncStore.set(KEY.groceries, groceries);
  renderGroceries();
});

/* Meals */
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
      syncStore.set(KEY.meals, meals);
    });
    mealList.appendChild(row);
  });
}

qs("#mealClear").addEventListener("click", ()=>{
  meals = {};
  syncStore.set(KEY.meals, meals);
  renderMeals();
});

/* Notes */
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
      syncStore.set(KEY.notes, notes);
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
  syncStore.set(KEY.notes, notes);
  qs("#noteTitle").value = "";
  qs("#noteBody").value = "";
  renderNotes();
});

qs("#noteClearDraft").addEventListener("click", ()=>{
  qs("#noteTitle").value = "";
  qs("#noteBody").value = "";
});

/* Timer (local) */
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

/* Boot */
(async function init(){
  routines = await syncStore.get(KEY.routine, routineDefaults);
  routineDoneAll = await syncStore.get(KEY.routineDone, {});
  chores = await syncStore.get(KEY.chores, []);
  groceries = await syncStore.get(KEY.groceries, []);
  meals = await syncStore.get(KEY.meals, {});
  notes = await syncStore.get(KEY.notes, []);

  if (!Array.isArray(chores)) chores = [];
  if (!Array.isArray(groceries)) groceries = [];
  if (typeof meals !== "object" || meals === null) meals = {};
  if (!Array.isArray(notes)) notes = [];

  ensureRoutineShape();

  // seed cloud with something valid if empty
  syncStore.set(KEY.routine, routines, { debounceMs: 50 });
  syncStore.set(KEY.routineDone, routineDoneAll, { debounceMs: 50 });
  syncStore.set(KEY.chores, chores, { debounceMs: 50 });
  syncStore.set(KEY.groceries, groceries, { debounceMs: 50 });
  syncStore.set(KEY.meals, meals, { debounceMs: 50 });
  syncStore.set(KEY.notes, notes, { debounceMs: 50 });

  renderRoutine();
  renderChores();
  renderGroceries();
  renderMeals();
  renderNotes();
})();
