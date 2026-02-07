
function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }

const store = {
  get(key, fallback){
    try{
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    }catch(e){ return fallback; }
  },
  set(key, val){
    try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
  }
};

function fmtTimer(sec){
  const m = String(Math.floor(sec/60)).padStart(2,"0");
  const s = String(sec%60).padStart(2,"0");
  return `${m}:${s}`;
}


async function cloudGet(key, fallback){
  try{
    const res = await fetch(`/.netlify/functions/sync?key=${encodeURIComponent(key)}`, { method:"GET" });
    if (!res.ok) throw new Error("bad");
    const data = await res.json();
    if (data && data.ok) return (data.value ?? fallback);
  }catch(e){}
  return fallback;
}

async function cloudSet(key, value){
  try{
    await fetch(`/.netlify/functions/sync?key=${encodeURIComponent(key)}`, {
      method:"PUT",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ value })
    });
  }catch(e){}
}

const syncStore = {
  async get(key, fallback){
    const local = store.get(key, fallback);
    const remote = await cloudGet(key, local);
    try{ store.set(key, remote); }catch(e){}
    return remote;
  },
  _timers: new Map(),
  set(key, value, { debounceMs=350 } = {}){
    store.set(key, value);
    const t = this._timers.get(key);
    if (t) clearTimeout(t);
    this._timers.set(key, setTimeout(()=>{ cloudSet(key, value); }, debounceMs));
  }
};
